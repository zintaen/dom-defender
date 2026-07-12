# Phase B - launch runway

Exit condition: playable on phones, accounts recoverable, moderation minimum live, funnel measured, revenue path e2e-tested. Then the launch plan in `docs/marketing/` runs as written.

## DD-B01 - mobile and touch (R21)

Why: `Game.tsx` and `BYOGame.tsx` have zero touch/pointer handlers while the launch plan leans on X/TikTok/Shorts traffic, which is mostly phones.
Files: `components/game/Game.tsx`, `components/BYOGame.tsx`, `components/game/styles.css`, `components/PlayShell.tsx`.
Steps: migrate mouse handlers to pointer events; `touch-action: none` on the playfield; hit targets minimum 44px; tool/power-up bar docked bottom within thumb reach on small viewports; responsive HUD (crash meter and combo readable at 360px width); Web Audio unlock on first pointerdown (iOS Safari); prevent pull-to-refresh and text selection during play.
Acceptance: a full run is completable by touch alone on a 360x740 viewport; drag (Duct Tape), tap (Debugger), and hold-drag (Garbage Collector) all work; no scroll/zoom interference; desktop unchanged.
Verify: Playwright touch-emulation script (basis for DD-B16) + device QA notes (gate: Stephen assists with a real iPhone/Android pass).

## DD-B02 - game loop rework (R22)

Why: the loop is `setInterval` (`Game.tsx:446`) driving React state per tick; it will stutter on mid-range phones and burn battery in background tabs.
Files: `components/game/Game.tsx`.
Steps: requestAnimationFrame loop with delta time; sim tick decoupled from render; per-frame motion via transforms/refs; HUD React state batched to a few updates per second; pause on `visibilitychange` (and resume countdown); keep replay event timestamps consistent so DD-C01 re-simulation is not broken - protected-area care: do not alter the daily seed PRNG.
Acceptance: no gameplay regression on the existing test corpus; replay of a pre-change run still plays back; frame pacing visibly smooth at 6x CPU throttle; hidden tab pauses.
Verify: `npm test` (replay + director suites) + a recorded before/after perf trace note.

## DD-B03 - email infrastructure (R16)

Why: credentials-only with nullable email means forgotten password = lost account; the waitlist also has no sender.
Owner mixed; gate: Resend API key + verified sending domain.
Files: new `lib/email.ts`, `db/schema.ts` (+migration: `email_tokens` table - kind verify|reset, token hash, expires, used), routes `app/api/auth/request-reset`, `app/api/auth/reset`, `app/api/auth/verify-email`, pages for the three flows, register accepts optional email and sends verification.
Steps: env-gated sender (`RESEND_API_KEY`, `EMAIL_FROM`; unset = flows return 503 with a clear message); tokens random 32B, stored hashed, 45-minute expiry, single-use; per-IP and per-email rate limits reusing the auth_attempts pattern; neutral "if that account exists" responses.
Acceptance: full reset round-trip works locally with a mocked sender; verify-email flips a `emailVerified` timestamp; rate limits enforced; tests cover token expiry/reuse/mismatch.
Verify: `npm test -- email`.

## DD-B04 - GitHub OAuth (R17)

Why: the audience lives on GitHub; one-click signup converts better than passwords for this crowd.
Owner mixed; gate: GitHub OAuth app credentials. Depends: DD-B03 (linking by verified email).
Files: `auth.ts`, `db/schema.ts` (+`accounts` table per Auth.js), register/login pages, username-claim step for first-time OAuth users (respecting DD-A08 name rules).
Steps: add GitHub provider env-gated; on first login create user with a chosen username; link to an existing account only when emails match and are verified; credentials remain.
Acceptance: new-user OAuth flow creates a playable account; linking works; no account takeover via unverified email (test).
Verify: `npm test -- oauth` (callback logic unit-tested; manual flow on preview).

## DD-B05 - case-insensitive username uniqueness (R18)

Why: register lowercases but the DB constraint is case-sensitive (`db/schema.ts` comment admits it); anything bypassing the route could create `Admin` beside `admin`.
Files: `db/schema.ts`, new migration, one audit query in the migration comment.
Steps: unique index on `lower(username)`; run a pre-migration collision check (none expected); keep the existing plain unique.
Acceptance: inserting a case-variant duplicate fails at the DB; migration applies clean.
Verify: integration test in DD-B15 scope + `db:push` output.

## DD-B06 - session revocation (R19)

Why: JWTs live 30 days (`auth.ts:15`) regardless of bans or password changes.
Files: `auth.ts`, `db/schema.ts` (`sessionVersion` int on users), password-reset (DD-B03) and ban (DD-B08) paths bump it.
Steps: embed sessionVersion in the JWT; jwt/session callbacks reject stale versions (one DB read per request on authed routes - acceptable; note the cost).
Acceptance: bumping the version invalidates an existing session in tests; normal sessions unaffected.
Verify: `npm test -- session`.

## DD-B07 - data export (R20)

Why: completes the GDPR pair next to deletion (DD-A06).
Files: new `app/api/account/export/route.ts`, button in account page.
Steps: authed JSON download of profile, scores, replay summaries (ids + metadata, not full event logs), follows, waitlist membership; rate-limit to 1/hour.
Acceptance: export contains the documented sections for a seeded user; second call within the hour returns 429.
Verify: `npm test -- export`.

## DD-B08 - moderation minimum (C7, R27)

Why: profiles/feed/teams are public with no report path, no ban machinery, no admin view; FR-DD-COMM-004 (comments) stays blocked until this exists.
Depends: DD-B06.
Files: `db/schema.ts` (+`role` on users; `reports` table: reporter, targetType user|replay|room, targetId, reason, status; `banned`, `bannedReason`, `bannedUntil` on users), new `app/api/report/route.ts`, `app/admin/page.tsx` + `app/api/admin/*` (role-gated), enforcement in auth callback and score/report/follow POSTs.
Steps: report button on profile and replay pages (authed, rate-limited, dedup per reporter+target); admin queue lists open reports with context links; actions: dismiss, warn (note), ban (duration or permanent, bumps sessionVersion); banned users can load the site but cannot submit scores, follow, report, or appear on boards.
Acceptance: report round-trip lands in the queue; ban blocks submissions and kills the live session; non-admins get 404 from /admin; tests cover role gate + ban enforcement.
Verify: `npm test -- moderation`.

## DD-B09 - signup abuse hardening (R28)

Why: throttle is per-minute only; disposable emails will pollute DD-B03 flows.
Depends: DD-B03.
Files: `lib/moderation/emailDomains.ts` (curated disposable-domain list + env override), register route (per-IP daily cap using auth_attempts).
Acceptance: disposable domain rejected with a clear message; 11th signup from one IP in 24h rejected; tests green.
Verify: `npm test -- register-abuse`.

## DD-B10 - analytics sink (R33)

Why: `track()` buffers locally and posts to an optional webhook; no queryable funnel exists, so P2 pricing decisions would be guesses.
Owner mixed; gate: PostHog project key (EU or US host - note choice in privacy policy).
Files: `lib/analytics.ts` (implement `ship()` against the PostHog capture API - keeps the no-SDK doctrine the file states), server-side capture helper for signup/score/purchase events, `.env.local.example`, event-schema doc `docs/analytics/EVENTS.md`.
Steps: define and emit the funnel: visit, play_start, run_end, signup, share_click, challenge_accept, support_click, waitlist_join; respect Do Not Track; anonymous id until login, alias on signup.
Acceptance: events visible in PostHog on preview; schema doc matches emitted names; no PII beyond user id/username.
Verify: mocked-transport unit test + PostHog screenshot in ledger.

## DD-B11 - KPI targets and integrity metric (R34, R35)

Depends: DD-B10.
Files: `docs/analytics/TARGETS.md`, admin page tile (DD-B08's page) for rejected-score count/rate.
Steps: write the working targets (D1 25%+, D7 8%+, run-to-signup 10%+, share-per-run 5%+) as tunable hypotheses with review dates; surface rejected-score rate from a scores-table aggregate.
Acceptance: doc merged; admin tile shows live counts (seeded test).
Verify: `npm test -- admin-metrics`.

## DD-B12 - cache public reads (R25)

Why: board GETs are `force-dynamic`; a front-page spike becomes 1:1 Postgres reads.
Files: `app/api/leaderboard/route.ts`, `app/api/daily/route.ts`, `app/api/tournament/route.ts`.
Steps: `Cache-Control: public, s-maxage=30, stale-while-revalidate=120` on GET responses (personal-rank sections stay uncached or client-fetched authed); confirm auth-dependent data is not cached.
Acceptance: headers present; authed-only fields absent from cached payloads; existing tests green.
Verify: header assertion test.

## DD-B13 - PWA (R23)

Files: `app/manifest.ts`, icons in `public/`, install prompt component post-run.
Steps: manifest (name, theme, icons 192/512, display standalone), lightweight install prompt after a finished run (dismiss = do not re-ask for 30 days); no offline SW beyond a shell fallback.
Acceptance: Lighthouse flags installable; prompt behavior as specified.
Verify: `npm run build` + Lighthouse run note.

## DD-B14 - calibrate budgets (R24)

Depends: DD-A04 (a real production build/URL).
Files: `.size-limit.json`, `lighthouserc.json`, CI workflow.
Steps: measure the real build; set budgets at measured +15%; add INP tracking on /play to the Lighthouse config; make the size step blocking now that numbers are real.
Acceptance: CI fails on a deliberate 20% bundle bloat test branch; passes on main.
Verify: CI run evidence.

## DD-B15 - API integration tests (R36)

Why: 16 unit suites cover pure logic; the route wiring (auth, throttles, atomicity) is what regresses.
Files: `tests/integration/*` (vitest project), `docker-compose.test.yml` or testcontainers Postgres, CI job.
Steps: drizzle-push a disposable schema per run; cover: score POST happy/forged/replay-less/rate-limited; register throttle + name rules; purchase double-spend under concurrency; follow idempotency; account delete cascade; lower(username) collision (DD-B05).
Acceptance: suite green locally and in CI, isolated from the unit project, under 3 minutes.
Verify: `npm run test:integration`.

## DD-B16 - e2e smoke (R37)

Depends: DD-B15.
Files: `e2e/smoke.spec.ts`, Playwright config, CI job against `next start` + test DB.
Steps: register -> play a 20-second scripted run (deterministic seed via `?seed=`, scripted pointer input) -> submit -> appears on board -> replay page loads; a touch-emulation variant reusing DD-B01 script.
Acceptance: green in CI twice consecutively (flake check); protects the whole revenue path.
Verify: CI evidence.

## DD-B17 - anti-cheat explainer (R15)

Depends: DD-A01.
Files: `app/how-scores-work/page.tsx`, link from leaderboard footer.
Steps: plain-language page: what a replay is, what the server checks today (bounds v1), what is coming (re-simulation), why unverified runs do not rank; honest about limits; doubles as the HN follow-up post draft.
Acceptance: page live, accurate against the code as of DD-A01, linked.
Verify: content review against `lib/game/scoreValidator.ts`.

## DD-B18 - accessibility pass (R26)

Depends: DD-B01 (touch/HUD layout settles first).
Files: game components, `app/globals.css`, `app/layout.tsx`.
Steps: visible focus states; full keyboard play path documented; `prefers-reduced-motion` disables shake/flash/parallax; colorblind-safe bug palette option in settings; text alternatives for SFX cues (visual ping); flash-frequency audit (no >3 flashes/sec) before Shorts-driven traffic; `lang` attr + skip-nav.
Acceptance: axe scan clean on home/play/board; reduced-motion verified; keyboard-only run completable.
Verify: axe CI step + manual checklist in ledger.

## DD-B19 - dependency and disclosure hygiene (R29)

Files: `.github/dependabot.yml` (or Renovate config), CI `npm audit` report step (non-blocking), `SECURITY.md`, `public/.well-known/security.txt`.
Acceptance: first bot PR observed or config validated; security.txt served; audit step visible in CI output.
Verify: CI evidence.

## DD-B20 - waitlist activation (M12)

Depends: DD-B03. Owner mixed; gate: sender live + Stephen approves copy and pushes send.
Files: `app/api/pro-waitlist/route.ts` (double opt-in: send confirm link, `confirmed` flag + migration), `docs/marketing/waitlist-launch-email.md` draft.
Steps: new signups get a confirmation email; existing rows greyed until confirmed on next touch; draft the launch announcement (agent drafts, Stephen sends - never auto-send).
Acceptance: opt-in round-trip works with mocked sender; draft exists; no email sent by CI/agent.
Verify: `npm test -- waitlist`.

<!-- end phase B -->
