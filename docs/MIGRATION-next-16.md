# Migration runbook: Next.js 14 -> 16 (BACKLOG L1-T15)

This is an operator-run migration. It cannot be built or QA'd in the agent sandbox, so it
is written as a runbook rather than applied blind. It clears the residual high/moderate
advisories from L1-T2 (all Next-family, fixed only at next@16) and unblocks a nonce-based CSP
(NFR-DOM-004).

## Why this is its own task

After the L1-T2 patch tier, `npm audit` is 0 critical / 4 high / 1 moderate, and every residual
is Next-family. npm only resolves them at `next@16`, which is not a patch - it is three coupled
major upgrades:

1. Next.js 14 -> 16 (async request APIs, React 19, `next lint` removed, middleware renamed to
   proxy, Node 20.9+).
2. React 18 -> 19 (Next 16's App Router requires it).
3. next-auth v4 -> Auth.js v5. next-auth v4 does not install cleanly on Next 16 (peer-dep
   conflict; needs --legacy-peer-deps/--force), and v5 is the supported path. v5 changes the
   session cookie name, so existing sessions are invalidated (users get logged out once).

Because auth is involved, treat this as a security-sensitive migration: do it on a dedicated
branch with a full manual QA pass, not a drive-by bump.

## Breaking changes that touch this repo

| Change in 15/16 | Where it hits DOM Defender | Action |
| --- | --- | --- |
| `cookies()`, `headers()`, `params`, `searchParams` are async | route handlers and pages that read them | run the codemod; await them |
| `next lint` removed | `package.json` `lint` script, `.github/workflows/ci.yml`, `.githooks/pre-commit`, AGENTS.md | switch to ESLint directly (codemod provides the config) |
| `serverComponentsExternalPackages` renamed to `serverExternalPackages` | `next.config.mjs` (we set it for mongoose) | rename the key |
| middleware -> proxy (Node runtime only) | no middleware today | nothing now; note it if middleware is added |
| React 19 | `react`, `react-dom`, `@types/react`, `@types/react-dom` | bump together; check for ref/JSX type changes |
| next-auth v4 -> Auth.js v5 | `lib/auth.ts` (authOptions + the login throttle), `app/api/auth/[...nextauth]`, `getServerSession` callers (`/api/scores`, `/api/shop/*`, `/api/profile`, `/api/byo-attempt`), `components/Providers.tsx` | migrate config to the single `NextAuth()` call; replace `getServerSession(authOptions)` with the v5 `auth()` helper |
| revalidateTag needs a cacheLife arg | not used today | nothing now |

The hardening added in this session is framework-agnostic and needs no rewrite: the score
validator, the rate-limit primitive and the AuthAttempt throttles, the daily-seed derivation,
the atomic coin update, the Score `verified` flag, and the security headers all carry over.
The login throttle lives inside `authorize`, which becomes the v5 `authorize` - move the same
block into the v5 config.

## Recommended path

There is no way to keep next-auth v4 on Next 16, so the auth migration is required regardless
of whether you stop at 15 or go to 16. Go straight to 16 on a branch.

1. Branch: `git checkout -b auto/next-16-migration`.
2. Run the official codemod: `npx @next/codemod@canary upgrade latest`. Review every edit.
3. Bump React: `react`, `react-dom` to 19.x and the matching `@types/*`.
4. `next.config.mjs`: rename `serverComponentsExternalPackages` -> `serverExternalPackages`.
   Keep the `headers()` block. After QA, switch the CSP key from
   `Content-Security-Policy-Report-Only` to `Content-Security-Policy` and move `script-src` to
   a nonce instead of `'unsafe-inline'` - that is what clears the CSP-nonce advisory.
5. Tooling: replace `next lint` with ESLint in `package.json`, `.github/workflows/ci.yml`, and
   `.githooks/pre-commit`. Update the command references in `AGENTS.md`.
6. Auth.js v5: follow https://authjs.dev/getting-started/migrating-to-v5. Collapse `authOptions`
   into one `NextAuth()` config, port the credentials provider and the per-IP login throttle,
   and replace `getServerSession(authOptions)` with `auth()` in every route that uses it.
   Expect existing sessions to be invalidated (communicate the one-time re-login).
7. Reinstall and re-audit: `npm install`, then `npm audit` (target 0 high/critical).

## Verification checklist (the L1-T15 gate)

- `npm audit` shows 0 high and 0 critical.
- `npm run lint` (now ESLint), `npx tsc --noEmit`, and `npm test` are clean.
- `npm run build` succeeds.
- Manual QA: register, log in, log out, and the login throttle still locks after repeated
  failures; play a run signed-in and confirm the score still posts and validates; daily and a
  private-seed run still rank; the shop coin purchase still works; the BYO iframe still loads a
  third-party site; replays still save and play back.
- Headers: `curl -sI <deploy-url>` shows the five headers; after the CSP switch, no CSP
  violations appear in the console during normal play.

## Effort and risk

Plan for a focused day or two. The risk is concentrated in the auth migration (sessions,
cookie name, the throttle) and in any component that read a now-async request API. Keep it on
its own branch and merge only after the full QA checklist passes.

## Sources

- [Upgrading: Version 16 - Next.js](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Migrating to Auth.js v5](https://authjs.dev/getting-started/migrating-to-v5)
- [NextAuth with Next.js 16 compatibility issue (nextauthjs/next-auth #13302)](https://github.com/nextauthjs/next-auth/issues/13302)
