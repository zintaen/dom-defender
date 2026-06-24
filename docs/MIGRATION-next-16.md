# Migration runbook: Next.js 14 -> 16 (BACKLOG L1-T15)

Operator-run, file-by-file. This is the one P0 item the agent sandbox cannot build, typecheck
against the new deps, or QA, so it is written as an exact execution guide rather than applied
blind. It clears the residual Next-family advisories from L1-T2 (0 high/critical target) and
unblocks a nonce-based CSP (NFR-DOM-004).

Grounded in the official docs (fetched 2026-06-24): Next.js 16 upgrade guide and the Auth.js v5
migration guide (links at the bottom). Run every step on a branch and keep the QA checklist.

## What this touches in THIS repo

- Three coupled majors: Next 14.2 -> 16, React 18 -> 19.2, next-auth v4 -> Auth.js v5
  (next-auth v4 will not install on Next 16; v5 is the supported path).
- 11 files reference `getServerSession` / `authOptions` and move to the v5 `auth()` helper:
  `app/api/auth/[...nextauth]/route.ts`, `app/api/byo-attempt/route.ts`,
  `app/api/pro-waitlist/route.ts`, `app/api/profile/route.ts`, `app/api/replays/route.ts`,
  `app/api/scores/route.ts`, `app/api/shop/route.ts`, `app/api/shop/equip/route.ts`,
  `app/api/shop/purchase/route.ts`, `lib/pro.ts`, and `lib/auth.ts` (becomes root `auth.ts`).
- Client components (`useSession`, `signIn`, `signOut`, `SessionProvider` in Nav, PlayShell,
  Providers, and the account/achievements/pro/shop/login/register pages) keep working as-is in
  v5 - no change needed there.
- Three dynamic routes get async `params`: `app/api/auth/[...nextauth]`,
  `app/api/replays/[id]`, `app/replay/[id]`.
- The hardening added earlier is framework-agnostic and carries over unchanged: the score
  validator, `lib/rateLimit.ts`, the AuthAttempt throttles, daily-seed derivation, the atomic
  coin update, `lib/observability.ts`, and the security headers. The login throttle moves into
  the v5 config with one change (the request is now a Web `Request` - see step 4).

## Prerequisites

1. Commit the current `auto/p0-harden` work first (wave 2 is staged), then branch:
   ```
   git commit -m "p0(cleanup): lint, error reporting, dep bumps, perf budget"   # staged
   git checkout -b auto/next-16-migration
   ```
2. Node 20.9+ (Next 16 minimum; Node 18 is dropped). TypeScript 5.1+ (you are on 5.9).

## Step 1 - run the official codemod

```
npx @next/codemod@canary upgrade latest
```
It auto-handles: `next.config` turbopack move, `next lint` -> ESLint CLI, `middleware` -> `proxy`
(you have no middleware, so a no-op), `unstable_` prefix removals, and `experimental_ppr` removal.
Review every change it makes.

## Step 2 - dependencies

The codemod bumps most of these; verify the result is:
```
npm install next@latest react@latest react-dom@latest
npm install -D @types/react@latest @types/react-dom@latest eslint-config-next@latest
npm install next-auth@beta            # Auth.js v5
```
Keep the `overrides: { uuid: ^11.1.1 }` entry. Remove the `vitest`-unrelated nothing else.

## Step 3 - next.config.mjs

- Rename the mongoose external-packages key (it left `experimental` and became stable in 15):
  ```
  // before
  experimental: { serverComponentsExternalPackages: ["mongoose"] }
  // after
  serverExternalPackages: ["mongoose"]
  ```
- Keep the `headers()` block. After QA, switch the CSP key from
  `Content-Security-Policy-Report-Only` to `Content-Security-Policy` and replace `'unsafe-inline'`
  in `script-src` with a nonce - that is what clears the CSP-nonce advisory.
- Turbopack is the default builder in 16. This repo has no custom webpack config, so `next build`
  should work as-is. If a plugin injects webpack config and the build refuses, add `--webpack`
  to the build script as a fallback.

## Step 4 - Auth.js v5 (the manual core)

### 4a. Create a root `auth.ts` (port of `lib/auth.ts`)

```ts
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import AuthAttempt from "@/models/AuthAttempt";
import { clientIpFromHeaders } from "@/lib/rateLimit";

export const authConfig = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: { username: {}, password: {} },
      // v5: the second arg is a standard Web Request (was a plain object in v4).
      async authorize(credentials, request) {
        const username = String(credentials?.username ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");
        if (!username || !password) return null;
        await connectDB();

        // Per-IP login throttle (NFR-DOM-003 / L1-T3).
        const ip = clientIpFromHeaders((n) => request.headers.get(n), {
          trustForwardedFor: process.env.TRUST_FORWARDED_FOR === "true",
        });
        const ipHash = createHash("sha256").update(`login:${ip}`).digest("hex").slice(0, 16);
        const WINDOW_MS = 15 * 60 * 1000;
        const MAX_ATTEMPTS = 10;
        const recent = await AuthAttempt.countDocuments({
          ipHash, kind: "login", createdAt: { $gte: new Date(Date.now() - WINDOW_MS) },
        });
        if (recent >= MAX_ATTEMPTS) return null;
        await AuthAttempt.create({ ipHash, kind: "login", username });

        const u = await User.findOne({ username }).lean();
        if (!u) return null;
        const ok = await bcrypt.compare(password, (u as any).passwordHash);
        if (!ok) return null;
        return { id: String((u as any)._id), name: (u as any).username, email: (u as any).email ?? null };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { (token as any).id = (user as any).id; (token as any).username = (user as any).name; }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).id;
        (session.user as any).username = (token as any).username;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);
```
Then delete `lib/auth.ts` (or leave it re-exporting from `@/auth` during transition). The
`NextAuthOptions` type is now `NextAuthConfig`.

### 4b. Shrink the route handler

`app/api/auth/[...nextauth]/route.ts`:
```ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

### 4c. Swap every consumer to `auth()`

In each of the 9 files (`app/api/byo-attempt`, `pro-waitlist`, `profile`, `replays`, `scores`,
`shop`, `shop/equip`, `shop/purchase`, and `lib/pro.ts`):
```diff
- import { getServerSession } from "next-auth";
- import { authOptions } from "@/lib/auth";
+ import { auth } from "@/auth";
...
- const session = await getServerSession(authOptions);
+ const session = await auth();
```
The `session.user.id` / `session.user.username` reads stay the same (the callbacks above
preserve them).

### 4d. Environment + cookies

- Set `AUTH_SECRET` to your current `NEXTAUTH_SECRET` value (v5 reads `AUTH_SECRET`; it is the
  only required var). Set `AUTH_TRUST_HOST=true` on Vercel (behind the proxy). `NEXTAUTH_URL`
  is no longer required. Keep `TRUST_FORWARDED_FOR` as you had it.
- v5 renames the session cookie (`next-auth.*` -> `authjs.*`), so existing users are logged out
  once after deploy. Communicate this (or accept it - it is a one-time re-login).

## Step 5 - tooling (next lint is removed)

- `package.json`: the codemod replaces the `lint` script with an ESLint CLI invocation and adds
  a flat `eslint.config.mjs`. If it did not, run:
  ```
  npx @next/codemod@canary next-lint-to-eslint-cli .
  ```
- Update the references to `next lint` in `.github/workflows/ci.yml`, `.githooks/pre-commit`,
  and `AGENTS.md` to the new ESLint command.
- `@next/eslint-plugin-next` now defaults to flat config; migrate `.eslintrc.json` to
  `eslint.config.mjs` if the codemod did not.

## Step 6 - async params

Run the async-API codemod (part of the upgrade) and `npx next typegen`. The three dynamic
routes read `params`, which is now a Promise:
```diff
- export default function Page({ params }: { params: { id: string } }) {
-   const id = params.id;
+ export default async function Page({ params }: { params: Promise<{ id: string }> }) {
+   const { id } = await params;
```
Apply the same to `app/api/replays/[id]/route.ts`. The app does not call `cookies()`/`headers()`
directly, so there is little else here.

## Step 7 - reinstall, audit, verify

```
npm install
npm audit            # expect 0 high and 0 critical
npx eslint .         # (or the new lint script) - clean
npx tsc --noEmit     # clean
npm test             # 44 tests still green (framework-agnostic)
npm run build        # must succeed on Turbopack
npm run size         # calibrate .size-limit.json from the real output
```

## QA checklist (the L1-T15 gate)

- `npm audit`: 0 high, 0 critical.
- Build succeeds; lint, typecheck, tests green.
- Auth: register, log in, log out; the login throttle still locks after repeated failures; an
  existing user is asked to log in once (cookie rename) and then works.
- Gameplay: a signed-in run still posts and validates the score (NFR-DOM-001); daily and a
  private-seed run rank; the shop coin purchase still works; the BYO iframe still loads a
  third-party site; replays save and play back.
- Headers: `curl -sI <deploy-url>` shows the five headers; after switching CSP to enforce, no
  CSP violations in the console during normal play.

## Rollback

It is all on `auto/next-16-migration`. If QA fails and you cannot resolve it quickly, abandon
the branch (`git checkout auto/p0-harden`) - the launch-ready hardened build is intact there,
and the only cost of deferring is that the residual Next advisories stay open until a later
attempt.

## Effort and risk

Plan a focused day or two. Risk is concentrated in the auth migration (cookie rename, the
throttle move, the `auth()` swaps) and any component reading a now-async `params`. The agent
can debug specific build or QA failures you report back from this branch.

## Sources

- [Upgrading: Version 16 - Next.js](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Migrating to Auth.js v5 (NextAuth.js)](https://authjs.dev/getting-started/migrating-to-v5)
