# Improvement backlog - master table

Source of truth for status. Cards with full detail live in `phases/phase-*.md`; the audit behind every task is `docs/strategy/production-and-monetization-audit-2026-07-06.md`. Statuses: OPEN, IN-PROGRESS, DONE, BLOCKED. Owner: agent, stephen, mixed. Gate names what only Stephen can supply; an agent reaching a gate marks BLOCKED(gate) and moves on.

Totals: 52 tasks, ~420 h (A ~50 h, B ~151 h, C ~129 h, D ~90 h).

## Phase A - ship blockers and public-safety minimum (launch gate)

| ID | Pri | h | Owner | Gate | Depends | Source | Title | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DD-A01 | P0 | 4 | agent | - | - | C1, R1 | Enforce verified scores end to end: flag on, ranked reads filter `verified = true`, regression test | OPEN |
| DD-A02 | P0 | 1 | stephen | push | - | C3, R2 | Merge `auto/next-16-migration` to main, push, make main the only deployable branch | OPEN |
| DD-A03 | P0 | 3 | agent | - | - | C2, R5 | Doc sync: README/AGENTS/ROADMAP to Next 16 + Drizzle/Supabase reality; drop mongoose external | OPEN |
| DD-A04 | P0 | 4 | mixed | deploy + prod secrets | A02 | R3 | Production deploy: Vercel, pooled DATABASE_URL, fresh AUTH_SECRET, verify the five headers live | OPEN |
| DD-A05 | P0 | 4 | mixed | Supabase plan choice | - | R4 | Backups/PITR confirmation + pg_cron pruning for auth_attempts, byo_attempts, closed rooms | OPEN |
| DD-A06 | P0 | 12 | mixed | copy review | - | R6 | Legal minimum: /privacy, /terms, contact, delete-account endpoint + confirmation UI | OPEN |
| DD-A07 | P0 | 4 | mixed | Turnstile keys | - | R7 | Cloudflare Turnstile on register, env-gated, layered on the DB throttle | OPEN |
| DD-A08 | P0 | 4 | agent | - | - | C7, R8 | Reserved-username list + profanity screen on username and displayName writes | OPEN |
| DD-A09 | P0 | 5 | mixed | Sentry DSN or webhook + monitor account | - | R9 | Real error sink behind env flag + uptime monitoring on / and /api/leaderboard | OPEN |
| DD-A10 | P0 | 3 | agent | - | - | R10 | robots.ts, sitemap.ts, metadataBase, canonicals, per-route titles | OPEN |
| DD-A11 | P0 | 2 | mixed | Ko-fi / GH Sponsors account | - | M8 | Tip-jar links in footer and post-run screen, env-gated URL | OPEN |
| DD-A12 | P0 | 3 | agent | - | - | C6 | CSP report collector at /api/csp-report + reporting directives on the CSP header | OPEN |
| DD-A13 | P0 | 1 | agent | - | - | C8 | next-auth beta watch: pin task, GA check note in ledger each loop, upgrade card when GA lands | OPEN |

## Phase B - launch runway

| ID | Pri | h | Owner | Gate | Depends | Source | Title | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DD-B01 | P1 | 24 | agent | device QA assist | - | R21 | Mobile/touch: pointer events, thumb-docked toolbar, 44px targets, audio unlock, responsive HUD | OPEN |
| DD-B02 | P1 | 12 | agent | - | - | R22 | rAF game loop with delta time, visibilitychange pause, HUD state batching | OPEN |
| DD-B03 | P1 | 16 | mixed | Resend key + sending domain | - | R16 | Email infra: lib/email.ts, verify-email + password-reset flows, token tables, rate limits | OPEN |
| DD-B04 | P1 | 6 | mixed | GitHub OAuth app creds | B03 | R17 | GitHub OAuth provider, account linking by verified email, credentials kept as fallback | OPEN |
| DD-B05 | P1 | 2 | agent | - | - | R18 | Unique index on lower(username) + migration + collision audit query | OPEN |
| DD-B06 | P1 | 4 | agent | - | - | R19 | Session-version claim: bump on ban/password change so old JWTs die | OPEN |
| DD-B07 | P1 | 4 | agent | - | A06 | R20 | Data export endpoint (profile, scores, replays as JSON) completing the GDPR pair | OPEN |
| DD-B08 | P1 | 16 | agent | - | B06 | C7, R27 | Moderation minimum: role column, reports table + endpoint, admin queue, ban enforcement | OPEN |
| DD-B09 | P1 | 3 | agent | - | B03 | R28 | Disposable-email blocklist + per-IP daily signup cap | OPEN |
| DD-B10 | P1 | 8 | mixed | PostHog project key | - | R33 | Event sink: ship() to PostHog HTTP API, funnel events, server-side capture for signup/score | OPEN |
| DD-B11 | P1 | 3 | agent | - | B10 | R34, R35 | Working KPI targets doc + rejected-score rate metric surfaced on admin page | OPEN |
| DD-B12 | P1 | 3 | agent | - | - | R25 | Cache public GETs: s-maxage + stale-while-revalidate on leaderboard/daily/tournament | OPEN |
| DD-B13 | P1 | 4 | agent | - | - | R23 | PWA: manifest, icons, install prompt after a finished run (no offline SW beyond shell) | OPEN |
| DD-B14 | P1 | 3 | agent | - | A04 | R24 | Calibrate size-limit and Lighthouse budgets from the real build; track INP on /play | OPEN |
| DD-B15 | P1 | 12 | agent | - | - | R36 | API integration tests against disposable Postgres: scores, register, purchase, follow, delete | OPEN |
| DD-B16 | P1 | 10 | agent | - | B15 | R37 | Playwright e2e smoke: register, play scripted run, submit, board, replay; CI on preview | OPEN |
| DD-B17 | P1 | 4 | agent | - | A01 | R15 | "How the leaderboard verifies your run" page (anti-cheat as launch content) | OPEN |
| DD-B18 | P1 | 10 | agent | - | B01 | R26 | Accessibility pass: focus states, reduced motion, colorblind palettes, SFX captions, flash safety | OPEN |
| DD-B19 | P1 | 3 | agent | - | - | R29 | Renovate/Dependabot weekly, npm audit report job, SECURITY.md, security.txt | OPEN |
| DD-B20 | P1 | 4 | mixed | sender live + copy approval | B03 | M12 | Waitlist activation: double opt-in for pro_waitlist, launch email draft (send is Stephen's) | OPEN |

## Phase C - integrity v2 and revenue rails

| ID | Pri | h | Owner | Gate | Depends | Source | Title | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DD-C01 | P2 | 24 | agent | - | - | R11 | Isomorphic sim core + server re-simulation for daily/tournament (exact-match accept) | OPEN |
| DD-C02 | P2 | 8 | agent | - | C01 | R12 | Signed run tokens: issue on start, require on submit, duration floor, single-use | OPEN |
| DD-C03 | P2 | 10 | agent | - | C02 | R13 | Anomaly heuristics: score/sec percentile, event cadence variance, duplicate-replay hashing | OPEN |
| DD-C04 | P2 | 10 | agent | - | C03, B08 | R14 | Shadow review: flagged scores rank owner-only until reviewed; admin flagged queue + replay playback | OPEN |
| DD-C05 | P2 | 4 | agent | - | A05 | R30 | Replay retention: keep daily top-N + personal bests, prune rest at 90 days, privacy disclosure | OPEN |
| DD-C06 | P2 | 8 | agent | staging env | A04 | R31 | k6 load test on score POST and leaderboard GET; record ceilings in ledger | OPEN |
| DD-C07 | P2 | 2 | mixed | status provider account | A09 | R32 | Status page linked from footer | OPEN |
| DD-C08 | P2 | 6 | agent | - | - | C9 | room_members table with unique (room, user); retire the jsonb members array | OPEN |
| DD-C09 | P2 | 20 | mixed | MoR account (Paddle/LS) + VN eligibility confirmed | A06 | C4, M1 | Billing provider abstraction lib/billing.ts + first MoR adapter + webhook-only grant; rewrite TASK-DD-MON-001 | OPEN |
| DD-C10 | P2 | 8 | mixed | pricing sign-off + sales motion | C08 | M5 | Teams/workshop productization: /teams pitch + lead form, room polish, facilitator one-pager | OPEN |
| DD-C11 | P2 | 6 | mixed | sponsor pitches | B10 | M6 | Sponsor slot component (tournament page + OG card) + media-kit page fed by real metrics | OPEN |
| DD-C12 | P2 | 12 | mixed | retention gate (D7 data) | C09 | M2 | Pro tier: entitlements, Pro cosmetics, private rooms, extended replay history; $24/yr class pricing | OPEN |
| DD-C13 | P2 | 8 | agent | - | C09 | M3 | One-time supporter packs ($5/$10/$25): coins + founder badge per tier | OPEN |
| DD-C14 | P2 | 3 | agent | - | C09 | M13 | Regional/PPP pricing config in the MoR + vi locale price display | OPEN |

## Phase D - scale bets

| ID | Pri | h | Owner | Gate | Depends | Source | Title | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DD-D01 | P2 | 16 | agent | two organic seasons run first | C12 | M4 | Season pass: free + paid cosmetic track on the seasons system (TASK-DD-OPS-001 first) | OPEN |
| DD-D02 | P2 | 24 | agent | portal account + SDK terms | C01 | C5, M7 | Portal arcade build: endless-only, no accounts, portal SDK + rewarded-ad hooks, separate deploy without frame-blocking headers | OPEN |
| DD-D03 | P2 | 16 | mixed | curriculum review + pricing | C10 | M9 | Education kit: concept-map curriculum, facilitator guide, classroom license terms | OPEN |
| DD-D04 | P2 | 24 | mixed | Steam account + $100 fee | - | M10 | Tauri desktop wrapper on Steam at $4.99: achievements, offline endless | OPEN |
| DD-D05 | P2 | 10 | agent | - | C01 | R38 | Determinism corpus in CI + contract tests freezing public API shapes | OPEN |
