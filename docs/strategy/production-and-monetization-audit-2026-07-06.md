# DOM Defender - production readiness and monetization audit (2026-07-06)

Scope: full read of the repo on branch `auto/next-16-migration` (HEAD 9290331), all specs in `docs/` (BACKLOG, ROADMAP, the FR catalog of 21 tracked items with 14 spec files, 8 NFRs, marketing plan), plus outside research on 2026 web-game monetization and payment rails. This report has four parts: where the project stands, corrections where the plan and the code disagree, recommendations (numbered, tagged), and a monetization strategy with sequencing.

Tags: P0 = before public launch, P1 = launch quarter, P2 = after revenue starts. Effort: S = under a day, M = days, L = a week or more.

## 1. Where the project stands

The hard part is done. The game is feature-rich (daily/endless/tournament modes, replays, cosmetics economy, teams, follow/feed, challenge links, OG cards, AI director and coach), the P0 hardening wave landed (DB-backed throttles, security headers, atomic coin spend, server-derived competitive seeds, 16 test suites, CI gate with size budget), and the stack is current (Next 16, React 19, Auth.js v5, Drizzle on Supabase Postgres). Roughly 8,800 lines of TS across app/lib/components/db.

Three things stand between this and money:

1. The integrity story is weaker than the docs claim (section 2, C1).
2. Account lifecycle, moderation, legal pages, and mobile input do not exist yet, and each one blocks either launch, growth, or payments.
3. The payment plan assumes Stripe, which does not onboard Vietnam-based merchants; the rail needs to change before FR-DD-MON-001 is built (section 4, M1).

What is already good and should not be re-litigated: fail-closed feature flags, the SSRF-free BYO design, the evidence-gated AUTO_WORK loop, the FR/NFR spec discipline, DB indexes on the hot leaderboard paths, and the marketing plan's channel choices. The docs themselves are an asset; they just need syncing (C2).

## 2. Corrections - where the plan and the repo disagree

C1. The forged-score hole is still open by default. `validateRunAgainstReplay` only runs when the client volunteers a replay; without one the score is stored as `verified: false` and `REQUIRE_VERIFIED_SCORES` is commented out in `.env.local.example` (line 36), so the flag is off unless someone remembers it. Worse, `app/api/leaderboard/route.ts`, `app/api/daily/route.ts`, and `app/api/tournament/route.ts` never filter or even read the `verified` column, so an unverified curl POST still ranks on every public board. NFR-DOM-001 is marked DONE in the backlog but the acceptance criterion ("a submission with no replay ... returns 400") only holds with the env flag on. Fix: set `REQUIRE_VERIFIED_SCORES=true` in production, filter ranked boards to `verified = true`, and add a regression test that a replay-less POST cannot rank. This is the single most important item in this report.

C2. The operating docs describe a repo that no longer exists. README, AGENTS.md, and ROADMAP.md say Next.js 14 + MongoDB + Mongoose + NextAuth; the code is Next 16 + Drizzle/Supabase + Auth.js v5. FR specs reference deleted paths (`models/User.ts` in FR-DD-MON-001's build envelope). `next.config.mjs:35` still marks `mongoose` as a server-external package though mongoose is gone from package.json. Because AGENTS.md is the contract every future agent loop reads, stale contracts produce wrong work. One S-sized doc-sync commit fixes all of it.

C3. The newest work is not on main. `origin/main` ends at the PR #1 merge (702f6f6); the Drizzle/Supabase migration (31c18e1) and the end-run fix (9290331) exist only on `auto/next-16-migration`. Until merged and pushed, main still builds against Mongo code that has no database behind it.

C4. FR-DD-MON-001 is built on Stripe, but Stripe does not list Vietnam as a supported country for merchant accounts. As written, the FR cannot ship for a CyberSkill (VN) entity without a foreign company. Section 4 M1 gives the alternatives; the FR should be rewritten gateway-agnostic (a `lib/billing.ts` provider interface, webhook-grant invariants unchanged).

C5. `X-Frame-Options: DENY` plus `frame-ancestors 'self'` (next.config.mjs) block every portal that embeds games in an iframe (Poki, CrazyGames, and similar). Correct for the main site; it just forecloses the portal distribution channel unless the arcade build (M7) ships as a separate deployment without those headers.

C6. The CSP is report-only with no `report-to`/`report-uri` endpoint, so in production violations go nowhere and the "review the reports, then enforce" plan in next.config.mjs cannot happen. Add a `/api/csp-report` collector (or a hosted collector), then move to an enforced nonce-based CSP, which also closes the CSP advisory noted in L1-T15.

C7. Social surfaces shipped ahead of their safety net. Public profiles, feed, teams, and tournament pages are live in code while NFR-DOM-007 (moderation) is unimplemented: no profanity or reserved-name filter on usernames/display names (register accepts any `[a-z0-9_]{2,24}`, so `admin`, `staff`, `cyberskill` are registerable), no report endpoint, no ban or shadow-ban machinery, no admin view. Launch order risk: the marketing plan drives strangers to these surfaces on day one.

C8. `next-auth` is pinned to `5.0.0-beta.31`. Shipping auth on a beta needs an explicit tracked task: watch for the GA release, then pin the upgrade and re-run the auth suite.

C9. Room membership is a read-modify-write on a jsonb array (`app/api/teams/route.ts:54-81`). Two concurrent joins or submits can drop an update. Fine for friendly workshops; not fine once teams mode is a paid product (M5). Move members to a `room_members` table with a unique (room, user) constraint.

## 3. Production-readiness recommendations

### 3.1 Ship blockers (P0)

R1. [P0, S] Close C1: enforce `REQUIRE_VERIFIED_SCORES=true`, filter every ranked read to verified rows, add the regression test. Keep unverified rows stored (they are useful cheat telemetry).
R2. [P0, S] Merge `auto/next-16-migration` to main, push, and make main the only deployable branch. CI already gates it.
R3. [P0, M] Deploy: Vercel + the existing Supabase DB, production `AUTH_SECRET` generated fresh, `DATABASE_URL` via pooled connection string (Supabase pgbouncer, port 6543) since postgres.js on serverless will otherwise exhaust direct connections. Verify the five headers on the live URL (the NFR-DOM-004 check).
R4. [P0, S] Supabase: confirm PITR/backup tier before opening signups, and enable pg_cron pruning for `auth_attempts`, `byo_attempts`, and closed `rooms` (the schema comment already anticipates this).
R5. [P0, S] Doc sync (C2) + delete the mongoose external from next.config.mjs.
R6. [P0, M] Minimum legal set: `/privacy` and `/terms` pages, a contact email, and a data-deletion path (an authenticated delete-account endpoint that cascades - the FKs already cascade - plus a confirmation UI). Required by GDPR/UK-GDPR for EU/UK players, by Vietnam PDPD given the operator, and by every MoR and portal you will later sign with. Without a privacy policy the pro-waitlist email collection is already non-compliant.
R7. [P0, S] Add Cloudflare Turnstile (or hCaptcha) to register, layered on the existing DB throttle. Bot signups poison a public leaderboard and the follow graph.
R8. [P0, S] Reserved-username list (admin, mod, staff, root, support, cyberskill, domdefender, api, system) plus a basic profanity screen on username and displayName at write time (C7 first slice).
R9. [P0, M] Error tracking that pages you: either point `ERROR_WEBHOOK_URL` at a real sink or add Sentry behind the same env gate, plus one uptime monitor (UptimeRobot/BetterStack) on `/` and `/api/leaderboard`. You cannot run a launch day blind.
R10. [P0, S] `app/robots.ts` + `app/sitemap.ts` + canonical URLs + `metadataBase`. Costs an hour, compounds forever.

### 3.2 Integrity v2 (P1) - make the leaderboard defensible

R11. [P1, L] Re-simulation (NFR-DOM-001 v2): the daily/tournament runs are deterministic from seed + inputs, so re-run the sim server-side and accept only an exact score match. This kills self-consistent fabricated replays, which v1 explicitly does not (`lib/game/scoreValidator.ts` header says so). Extract the sim core into a shared isomorphic module so client and server import the same code; that refactor also unlocks R21.
R12. [P1, M] Run tokens: on run start, server issues a signed token (run id, mode, seed, issued-at); score POST must include it. Blocks replayed submissions, binds a run to a session and a seed, and gives you a server-side run-duration floor to compare against the claimed duration.
R13. [P1, M] Anomaly heuristics on submission: score-per-second percentile, events-per-second cap, input cadence variance (human input jitters; bots are metronomes), duplicate-replay hashing. Flag, do not block; route flags to R14.
R14. [P1, M] Shadow review: flagged scores rank only for their owner until reviewed (shadow-ban pattern), plus a tiny admin page listing flagged runs with one-click replay playback (the replay player already exists) and ban/clear actions. An admin needs a `role` column on users.
R15. [P1, S] Publish the anti-cheat as content: a "how the leaderboard verifies your run" page. For a developer audience this is marketing (the HN plan already wants this angle), and transparency deters casual forging.

### 3.3 Accounts and lifecycle (P1)

R16. [P1, M] Password reset. Credentials-only auth with no reset path means every forgotten password is a lost account; email is even nullable in the schema so many accounts are unrecoverable by design. Ship email capture at register (optional but encouraged), verified via magic link, and a reset flow. Resend's free tier is enough; you also need this sender for the pro waitlist (M12).
R17. [P1, S] GitHub OAuth via Auth.js. The target audience lives on GitHub; one-click signup will beat username/password conversion for this crowd and reduces password-reset load. Keep credentials as fallback.
R18. [P1, S] Case-insensitive uniqueness on username: register lowercases, but the DB constraint is case-sensitive; add a unique index on `lower(username)` so nothing can bypass the route and create `Admin` next to `admin`.
R19. [P1, S] Session hardening: on ban or password change, rotate a per-user session version claim so old JWTs die (JWT sessions currently live 30 days regardless, auth.ts:15).
R20. [P1, S] Data export endpoint (JSON of profile, scores, replays) alongside the delete path from R6; cheap once the delete lands and completes the GDPR pair.

### 3.4 Game client and performance (P1)

R21. [P1, L] Mobile/touch (FR-DD-REACH-001) is the highest-value unbuilt feature. `Game.tsx` and `BYOGame.tsx` contain zero touch/pointer handlers, so the game is desktop-only while the launch plan leans on X, TikTok, and Shorts where most clicks are phones. Migrate mouse handlers to pointer events, enlarge hit targets, dock the tool/power-up bar for thumbs, and test on iOS Safari (Web Audio unlock needs a first-tap gesture).
R22. [P1, M] Replace the `setInterval` game loop (Game.tsx:446) with a `requestAnimationFrame` loop using delta time, pause on `visibilitychange`, and decouple sim ticks from React state (batch HUD updates a few times per second, move per-frame motion to transforms). DOM-based rendering is a fine aesthetic choice for this concept; the loop and re-render pattern are what will stutter on mid-range phones.
R23. [P1, S] PWA: manifest + icons + installability. A "install DOM Defender" prompt after a finished run converts well and gives you a home-screen slot; skip offline service-worker complexity beyond an offline shell.
R24. [P1, S] Calibrate `.size-limit.json` and the Lighthouse budget against the current real build so the CI budget is an actual tripwire, and track INP on the play route specifically.
R25. [P1, S] Cache public reads: leaderboard/daily/tournament GETs are `force-dynamic`; give them `s-maxage=30, stale-while-revalidate` (or `unstable_cache`) so a front-page spike does not translate 1:1 into Postgres reads.
R26. [P1, M] Accessibility pass (FR-DD-REACH-003): keyboard-only play already half-exists via hotkeys; add focus states, `prefers-reduced-motion` handling for shake/flash effects, colorblind-safe bug palettes, and captions for the procedural SFX. Also an epilepsy-safety review of flash effects before Shorts virality, and `lang` + skip-nav in layout.

### 3.5 Abuse, moderation, and ops (P1)

R27. [P1, M] Build NFR-DOM-007 minimum: report button on profiles/replays, `reports` table, admin queue (shares the R14 page), ban flag enforced at auth callback + score write. Do this before the feed/comments FR (FR-DD-COMM-004), which its spec already requires.
R28. [P1, S] Disposable-email domain blocklist at register (once email lands) and a per-IP daily signup cap in addition to the per-minute throttle.
R29. [P1, S] Dependabot/Renovate weekly + `npm audit` in CI as non-blocking report, plus GitHub secret scanning and a `SECURITY.md` + `/.well-known/security.txt`.
R30. [P1, S] Replay retention policy: replays are unbounded jsonb rows (events capped at 3,000 per run, but rows accrete forever and anonymous rows have `userId: null`). Keep daily top-N and personal bests, prune the rest after 90 days via pg_cron; disclose retention in the privacy page.
R31. [P1, M] Load-test the two hot paths (score POST with replay validation, leaderboard GET) with k6 against a staging DB; you want to know the ceiling before HN does it for you.
R32. [P1, S] Add a lightweight status page (BetterStack or a static page fed by the uptime monitor) linked from the footer.

### 3.6 Analytics and product truth (P1)

R33. [P1, M] Stand up a real event sink. The `track()` shim is good; point it at PostHog (free tier, EU or US host) or self-host later. Wire the funnel the marketing plan already names: visit -> play_start -> run_end -> signup -> D1/D7 return -> share_click -> challenge_accept. Without this, every P2 monetization decision is a guess.
R34. [P1, S] Define working targets and write them in the repo: D1 return 25%+, D7 8%+, run->signup 10%+, share-per-run 5%+. These are hypotheses to tune, and each monetization bet in section 4 has a kill criterion tied to them.
R35. [P1, S] Instrument the rejected-score rate and surface it on the admin page (R14); it is both an ops signal and launch content (R15).

### 3.7 Testing depth (P1-P2)

R36. [P1, M] Integration tests for the API routes against a disposable Postgres (drizzle push into a test container): score POST happy/forged/rate-limited paths, register throttle, shop purchase double-spend, follow idempotency. The 16 unit suites cover pure logic well; the route wiring is what regresses.
R37. [P1, M] One Playwright e2e smoke: register -> play 20 seconds with scripted inputs -> submit -> appears on board -> replay loads. Run it in CI on a preview deploy; it protects the whole revenue path.
R38. [P2, M] Determinism corpus: recorded real replays checked into fixtures, re-simulated in CI (guards R11 against engine drift), plus a contract test freezing public API response shapes per `docs/AUDIT-CONFIG.md`.

## 4. Monetization

Framing first. DOM Defender's audience (web developers) is a niche that blocks ads and rejects pay-to-win, but it is also the single best B2B-adjacent gaming audience there is: the players are the buyers of dev tools and the attendees of team workshops. So the money design is: never sell rank; sell identity (cosmetics), convenience, occasions (team events), and attention (sponsors) - and let the game be a funnel for CyberSkill services, which is where the largest checks are.

M1. [P2 gate, M] Fix the payment rail before building FR-DD-MON-001. Stripe does not onboard Vietnam-based merchants, so the options are:
   a) Merchant of record: Paddle or Lemon Squeezy (5% + $0.50 class pricing). They are the seller of record, handle global VAT/GST and refunds, and pay out via wire/PayPal/Payoneer; both onboard sellers from most countries - confirm Vietnam eligibility during onboarding before writing code. Note Stripe acquired Lemon Squeezy and is rolling its own MoR, so Paddle is the more conservative pick today. Polar is a newer MoR alternative worth a look.
   b) A foreign entity (Stripe Atlas US LLC or a Singapore entity) to get raw Stripe. More control and lower fees, but adds US/SG filings, banking, and admin - only worth it once revenue is real.
   c) For VN-local B2B (workshops), skip gateways entirely: CyberSkill JSC invoices + ACB bank transfer work today.
   Concrete change: rewrite FR-DD-MON-001 against a `lib/billing.ts` provider interface (createCheckout, webhook verify, grant/revoke reducers) with the same fail-closed and webhook-only-grant invariants; the first adapter is Paddle rather than Stripe. Keep every acceptance criterion otherwise.

M2. [P2, M] Pro tier, priced small and honest: about $3-4/month or $24/year, or a $29 lifetime founder tier for the first season (lifetime caps your liability while the audience is small and converts fence-sitters). Perks that never touch ranked fairness: Pro cosmetics (trails, skins, name color, badge), extended replay history, private tournaments/rooms, custom challenge packs, early access to new modes, and Pro-only stats (heatmaps from the coach). The waitlist gives you the first cohort; do not ship Pro before D7 retention proves people come back (kill criterion: if Pro converts under 0.5% of WAU after 60 days, park subscriptions and push M5/M7).

M3. [P2, S after M1] One-time supporter packs ($5/$10/$25) granting coins + an exclusive founder badge per tier. One-time purchases avoid subscription-management overhead, fit MoR checkout well, and for a solo-scale game usually outsell subscriptions early. Coins price cosmetics only - keep the existing no-power doctrine.

M4. [P2, M] Season pass, once FR-DD-OPS-001 (seasons) exists: free track + paid cosmetic track (~$5/season). This is the retention-shaped version of M3 and reuses the achievements pipeline. Build only after two organic seasons have run.

M5. [Now, M] Teams/workshops are the fastest real revenue and need zero payment code. FR-DD-EDU-001 is already scaffolded (rooms, concept map). Package it: "DOM Defender for Teams" - a 60-90 minute facilitated workshop (bug triage under pressure, mapped to real web concepts via `conceptMap.ts`), or a self-serve team event. Pricing to start: self-serve room $99 flat; facilitated remote session by CyberSkill $499; on-site/conference edition custom. Invoice via CyberSkill (ACB), no MoR needed. Prereqs: R6 legal pages, C9 room-race fix, a one-page `/teams` pitch with a lead form (reuse the landing-page lead pattern). This also feeds the consultancy funnel directly, which the ROADMAP names as the strategic point.
   Kill criterion: if 90 days of outreach lands zero paid sessions, fold it into free marketing (open team rooms) and stop selling.

M6. [P1-P2, S] Sponsorship: a game about debugging, played by developers, is premium ad inventory for dev-tool companies without being an ad network. Products: "This week's tournament sponsored by X" (logo on the tournament page + OG card), a themed boss/bug wave with tasteful disclosure, newsletter swaps. Sell manually once traffic exists (after HN/PH), starting around $250-500/week and repricing on real impressions. Zero code beyond a sponsor slot component. Kill criterion: no sponsor after 3 months of pitching at 10k+ weekly plays - drop it.

M7. [P2, L] Portal arcade build. Poki and CrazyGames bring tens of millions of monthly players and pay ad revenue share with no user-acquisition cost; Poki reports top studios earning up to EUR 1M/year (median is far lower - treat portals as discovery plus pocket money, not a business). Requirements conflict with the main site (C5), so ship a separate stripped build: endless mode only, no accounts (local scores), portal SDK events (loading, gameplay start/stop, rewarded ad hooks), no BYO, no external links (portal rules), separate deployment without X-Frame-Options DENY. The rewarded-ad hook doubles as your only sensible ad surface: opt-in "watch an ad for +1 continue/coins" inside portal builds. A cross-promo "play the full game with leaderboards at domdefender.example" link is usually allowed on Poki via their SDK rules - verify per portal. itch.io additionally: upload the same build, pay-what-you-want, good for jam-adjacent visibility.

M8. [P2, S] Zero-effort supporter rail before billing exists: GitHub Sponsors or Ko-fi link in the footer and post-run screen ("enjoying it? buy the dev a coffee"). Ships this week, tests willingness to pay, and captures the HN wave that wants to tip.

M9. [P2, M] Education licensing: package the concept-map curriculum (each bug type -> a web-fundamentals lesson) as a facilitator kit for bootcamps and university web courses - annual license per classroom, or bundled with a CyberSkill training engagement. This is M5's scalable cousin and differentiates on the one asset competitors cannot copy: the game teaches real DOM/CSS/console debugging.

M10. [P2, L, optional] Desktop premium: a Tauri wrapper (you already ship Tauri apps for gam) on Steam at $4.99 with achievements and offline endless mode. Novelty ("the website is the game" on Steam) plus wishlists as a marketing beat. Only after the web game has an audience; Steam's $100 fee and review overhead are real.

M11. [Never/last] Display ads on the main domain. Developer ad-block rates are high, banner CPMs for this niche are poor, and ads cheapen a product you want to sell B2B. If ads ever exist outside portals, they are opt-in rewarded video only.

M12. [P1, S] Activate the waitlist you already collect: once R16's email sender exists, send a double-opt-in confirmation now and a launch note later. Emails sitting in `pro_waitlist` with no sender and no privacy policy are a liability today and an asset after R6+R16.

M13. [P1, S] Localized pricing: enable PPP/regional pricing in the MoR (both Paddle and Lemon Squeezy support it) and price VN/SEA lower; pairs with FR-DD-REACH-002 (vi locale) and widens M5's local market where CyberSkill can invoice domestically.

Revenue expectation, honestly: consumer web-game money at this audience size will be small for a long time (portals + supporters + Pro likely low hundreds per month in year one). The asymmetric upside is M5/M9 (one workshop equals a month of Pro subscriptions) and the CyberSkill funnel. Sequence spend accordingly.

## 5. Suggested order of execution

Phase A - this week (all S/M): R1, R2, R3, R4, R5, R9, R10 (deploy hardened), then R6, R7, R8 (public-safety minimum), M8 (tip jar), M12 prep.
Phase B - launch runway (2-3 weeks): R21 (mobile), R16-R18 (accounts), R27 (moderation minimum), R33-R35 (analytics), R22, R25, R23, R36-R37, R15. Then run the launch plan in `docs/marketing/` as written.
Phase C - post-launch quarter: R11-R14 (integrity v2) as cheating actually appears, R26, R30-R32, M5 sales motion, M6 pitches, M1 rail decision + rewritten FR-DD-MON-001, then M2/M3.
Phase D - after first revenue: M4, M7, M9, R38, M10 if the audience asks for it.

## 6. Sources

Repo evidence: file references inline above; key files are `app/api/scores/route.ts`, `app/api/leaderboard/route.ts`, `lib/game/scoreValidator.ts`, `lib/rateLimit.ts`, `next.config.mjs`, `db/schema.ts`, `app/api/teams/route.ts`, `app/api/auth/register/route.ts`, `auth.ts`, `components/game/Game.tsx`, `.env.local.example`, `docs/ROADMAP.md`, `docs/BACKLOG.md`, `docs/feature-requests/BACKLOG.md`, `docs/marketing/LAUNCH-PLAN.md`.

Outside reading (2026):
- Playgama, "10 ways to monetize HTML5 games that actually work in 2026" - hybrid rewarded-video + IAP as the dominant browser model. https://playgama.com/blog/main/10-ways-to-monetize-html5-games-that-actually-work-in-2026/
- Poki developer monetization guide and EU-Startups profile - ad revenue share model, 100% share on direct/organic traffic, top studios up to EUR 1M/year. https://developers.poki.com/guide/monetization and https://www.eu-startups.com/2026/04/how-amsterdam-based-poki-is-becoming-one-of-the-best-launchpads-for-indie-game-developers-in-europe-sponsored/
- CrazyGames developer docs/FAQ - portal requirements and revenue-share opacity. https://docs.crazygames.com/faq/
- Game Developer, "The huge, hidden web game market no one talks about". https://www.gamedeveloper.com/business/the-huge-hidden-web-game-market-no-one-talks-about-and-how-to-get-in-
- GlobalSolo, "Stripe vs Paddle vs Lemon Squeezy vs Gumroad: fees compared (2026)" - MoR pricing class 5% + $0.50, Stripe MoR beta, Lemon Squeezy acquisition context. https://www.globalsolo.global/blog/stripe-vs-paddle-vs-lemon-squeezy-2026
- MDN, "Game monetization" - baseline reference. https://developer.mozilla.org/en-US/docs/Games/Publishing_games/Game_monetization
- Stripe supported-countries list should be re-verified at decision time: https://stripe.com/global
