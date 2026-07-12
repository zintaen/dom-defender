# Phase A - ship blockers and public-safety minimum

Exit condition: everything below DONE or BLOCKED(gate), the game deployed on a real domain, a forged score provably unable to rank, legal minimum live. Statuses live in `../BACKLOG.md` only.

## DD-A01 - enforce verified scores end to end (C1, R1)

Why: replay validation only runs when the client volunteers a replay; `REQUIRE_VERIFIED_SCORES` is commented out in `.env.local.example:36`; leaderboard/daily/tournament reads never filter `verified`. A curl POST still ranks.
Files: `app/api/scores/route.ts`, `app/api/leaderboard/route.ts`, `app/api/daily/route.ts`, `app/api/tournament/route.ts`, `.env.local.example`, `README.md` env table, new `tests/verified-gate.test.ts`.
Steps: uncomment and document `REQUIRE_VERIFIED_SCORES=true` as the production default; add `verified = true` to every ranked read (endless, daily, tournament boards); keep storing unverified legacy rows; add tests that (a) a replay-less POST returns 400 when the flag is on, (b) an unverified row present in the DB never appears in any board payload.
Acceptance: both tests green; board responses contain only verified rows; flag documented as required-in-prod.
Verify: `npm test -- verified-gate`.

## DD-A02 - merge to main and push (C3, R2)

Why: `origin/main` ends at the PR #1 merge; the Drizzle/Supabase migration (31c18e1) and later fixes exist only on `auto/next-16-migration`.
Owner stephen; gate: push. Steps: open PR `auto/next-16-migration` -> `main`, let CI gate it, merge, push, delete stale branches (`__wtest`, merged autos). After this lands, improvement branches fork from `main` (README rule).
Acceptance: `git log origin/main -1` contains 31c18e1's tree; CI green on main.
Verify: CI run link in ledger.

## DD-A03 - doc sync to reality (C2, R5)

Why: README/AGENTS/ROADMAP describe Next 14 + MongoDB + Mongoose + NextAuth; FR-DD-MON-001 cites deleted `models/*` paths; `next.config.mjs:35` still externalizes mongoose.
Files: `README.md`, `AGENTS.md`, `docs/ROADMAP.md`, `docs/feature-requests/monetization/FR-DD-MON-001-stripe-pro-checkout/spec.md` (source paths note only; the rewrite itself is DD-C09), `next.config.mjs`.
Steps: rewrite stack tables and setup steps (Supabase `DATABASE_URL`, `AUTH_SECRET`), fix project-structure tree, remove the mongoose external and its comment, update AGENTS.md "what this project is" and line counts.
Acceptance: `grep -ri mongoose README.md AGENTS.md next.config.mjs docs/ROADMAP.md` returns nothing; setup instructions work on a clean clone.
Verify: grep above + `npm run build`.

## DD-A04 - production deploy (R3)

Why: nothing is deployed; every later task assumes a live URL.
Owner mixed; gate: Vercel project, prod secrets, domain. Depends: DD-A02.
Steps (agent): document the deploy runbook in `docs/deploy/RUNBOOK.md` - Vercel project settings, `DATABASE_URL` must be the Supabase pooled string (pgbouncer, port 6543; postgres.js exhausts direct connections on serverless), fresh `AUTH_SECRET` (never the dev one), `AUTH_TRUST_HOST`, `REQUIRE_VERIFIED_SCORES=true`, all paid flags off. Steps (stephen): create project, set secrets, deploy, point domain.
Acceptance: `curl -sI https://<domain>` shows the five security headers; login + a full run + score submit work on the live URL.
Verify: header curl output + smoke notes in ledger.

## DD-A05 - backups and pruning (R4)

Why: opening signups without backups is unrecoverable risk; `auth_attempts`, `byo_attempts`, and closed `rooms` accrete forever (schema comments already anticipate pg_cron).
Owner mixed; gate: Supabase plan/PITR choice is Stephen's.
Files: new `db/migrations/0001_pruning.sql`, `docs/deploy/RUNBOOK.md` section.
Steps: SQL enabling pg_cron and scheduling: auth_attempts older than 30 days, byo_attempts older than 90 days, rooms closed more than 7 days; document that the migration is applied via the Supabase SQL editor (drizzle push does not run cron.schedule); Stephen confirms backup tier/PITR.
Acceptance: `select jobname from cron.job` lists the three jobs on the target DB; backup setting screenshot or note in ledger.
Verify: SQL output pasted in ledger.

## DD-A06 - legal minimum (R6)

Why: no privacy policy, no terms, no deletion path; pro_waitlist already collects emails, which is non-compliant without a policy; GDPR/UK-GDPR and VN PDPD both apply, and every MoR/portal contract later requires these pages.
Owner mixed; gate: Stephen reviews copy before it ships.
Files: new `app/privacy/page.tsx`, `app/terms/page.tsx`, `app/api/account/delete/route.ts`, delete UI in `app/account/page.tsx`, footer links (`components/Nav.tsx` or layout footer), `docs/legal/NOTES.md`.
Steps: draft plain-language policy (data collected: account, scores, replays, waitlist emails, analytics events; retention; contact = info@cyberskill.world; operator = CyberSkill JSC, VN) and terms (fair play, ban rights, no warranty, governing law VN); delete endpoint requires auth + typed confirmation, deletes the user row (FKs cascade scores/follows; replays keep null userId per schema), signs out; note in policy that anonymized replays may persist.
Acceptance: pages linked from footer; delete flow removes the row and invalidates the session; policy mentions waitlist and analytics.
Verify: new `tests/account-delete.test.ts` (route logic) + manual flow note.

## DD-A07 - Turnstile on register (R7)

Why: DB throttle alone will not stop bot signups from poisoning the board and follow graph.
Owner mixed; gate: Turnstile site/secret keys.
Files: `app/register/page.tsx`, `app/api/auth/register/route.ts`, `lib/turnstile.ts`, `.env.local.example`.
Steps: widget on the form; server verifies the token via siteverify when `TURNSTILE_SECRET_KEY` is set; unset means skip (fail-open by flag absence, consistent with the house flag contract - document this explicitly); reject with 400 on bad token.
Acceptance: with secret set and an invalid token (mocked fetch), register returns 400; without env vars behavior is unchanged; tests cover both.
Verify: `npm test -- turnstile`.

## DD-A08 - name hygiene (C7, R8)

Why: register accepts any `[a-z0-9_]{2,24}` (`app/api/auth/register/route.ts:17`); `admin`, `staff`, `cyberskill` are registerable; displayName is unscreened.
Files: new `lib/moderation/names.ts`, wire into register + the profile displayName write path, new `tests/names.test.ts`.
Steps: reserved list (admin, administrator, mod, moderator, staff, root, support, system, api, official, domdefender, cyberskill, and lookalike variants), light profanity screen (en + vi wordlist, substring-safe), applied to username at register and displayName at profile update; clear 400 messages.
Acceptance: reserved and profane names rejected in both paths; existing legit names unaffected; tests green.
Verify: `npm test -- names`.

## DD-A09 - error sink and uptime (R9)

Why: `reportError` no-ops without `ERROR_WEBHOOK_URL`; launch day would be blind.
Owner mixed; gate: Sentry DSN (or chosen webhook sink) + uptime account.
Files: `lib/observability.ts` (Sentry init behind `SENTRY_DSN`, keeping the webhook path), `.env.local.example`, runbook section.
Steps: env-gated Sentry (server + client) or confirmed webhook sink; Stephen creates an UptimeRobot/BetterStack monitor for `/` and `/api/leaderboard`; alert route to email/Telegram.
Acceptance: a thrown test error appears in the sink on a preview deploy; monitor exists and alerts on a forced 404 target test.
Verify: sink screenshot/event id in ledger.

## DD-A10 - crawlability (R10)

Why: no robots, no sitemap, no metadataBase; costs an hour, compounds forever.
Files: new `app/robots.ts`, `app/sitemap.ts`, edits to `app/layout.tsx` (metadataBase, canonical), per-route `metadata` exports for play/daily/leaderboard/pro/byo/teams.
Steps: sitemap lists static routes (exclude replay/challenge dynamics for now); robots allows all but `/api/`; canonical to the production domain via env.
Acceptance: `/robots.txt` and `/sitemap.xml` render in the build; every listed route has a distinct title/description.
Verify: `npm run build` + route render test.

## DD-A11 - tip jar (M8)

Why: zero-effort willingness-to-pay signal before any billing exists; captures the HN wave that wants to tip.
Owner mixed; gate: Ko-fi or GitHub Sponsors account + URL.
Files: footer component, post-run summary in `components/PlayShell.tsx` (or Game over screen), `NEXT_PUBLIC_SUPPORT_URL` in `.env.local.example`.
Steps: env-gated link ("enjoying it? buy the dev a coffee"); hidden when unset; track a `support_click` event.
Acceptance: link renders only with the env var; click tracked.
Verify: component test + manual.

## DD-A12 - CSP reporting (C6)

Why: CSP is report-only with no report-uri/report-to, so violations vanish; the enforce plan in `next.config.mjs` cannot proceed without data.
Files: new `app/api/csp-report/route.ts`, `next.config.mjs`.
Steps: collector accepts `application/csp-report` and Reporting API payloads, samples (cap per minute), forwards summaries through `reportError`; add `report-uri /api/csp-report` and a `Reporting-Endpoints` header; leave report-only for now (enforcement + nonces is future work tied to L1-T15).
Acceptance: a synthetic violation posted to the endpoint is logged and rate-capped; headers present.
Verify: `npm test -- csp` + header check in build.

## DD-A13 - next-auth beta watch (C8)

Why: auth ships on `next-auth 5.0.0-beta.31`; GA needs a deliberate, tested upgrade.
Files: this card + a ledger habit; optional `docs/deploy/RUNBOOK.md` note.
Steps: each implementation loop checks the latest next-auth version; when GA (or a newer beta fixing security issues) exists, write an upgrade task card into the current phase file with the changelog delta and run it as its own slice re-running the full auth test suite.
Acceptance: ledger entries show the check happened per loop; upgrade card created when GA lands.
Verify: ledger inspection.

<!-- end phase A -->
