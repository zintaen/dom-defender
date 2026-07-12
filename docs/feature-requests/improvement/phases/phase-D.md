# Phase D - scale bets

Optional, ordered by expected value per hour. Each card carries its own entry gate; none should start while a C revenue rail is half-built. Audit doctrine still applies: no display ads on the main domain (M11 has no task by design), and nothing sold may touch ranked fairness.

## DD-D01 - season pass (M4)

Entry gate: FR-DD-OPS-001 (seasons + weekly modifiers) built and two organic seasons completed with retention data. Depends: DD-C12.
Files: season pass track model (free + paid cosmetic track, ~$5/season class), progression hooks on the achievements pipeline, purchase via `lib/billing`, season page UI.
Steps: pass rewards are cosmetics and titles only; progression from existing run/achievement events; paid track unlock is a one-time MoR purchase per season; unclaimed rewards expire with the season (documented).
Acceptance: free and paid tracks progress from real events; purchase unlocks retroactive tier rewards; zero ranked-power items (test asserts); season rollover archives cleanly.
Verify: `npm test -- season-pass`.

## DD-D02 - portal arcade build (C5, M7)

Entry gate: Stephen creates the portal developer account (Poki or CrazyGames first) and accepts SDK terms. Depends: DD-C01 (engine extraction makes a standalone build feasible).
Files: `apps/arcade/` (or a build flag producing a stripped bundle): endless mode only, local scores, no accounts, no BYO, no external links beyond what portal rules allow; portal SDK wrapper (loading events, gameplay start/stop, rewarded-ad hooks: opt-in continue/coins); separate deployment target without `X-Frame-Options: DENY` / `frame-ancestors 'self'` (main site keeps them - the audit C5 conflict is resolved by separation, never by weakening the main site).
Steps: build the stripped target from the shared engine; integrate the chosen portal SDK; QA in the portal's dev sandbox; cross-promo link to the full game only per portal rules.
Acceptance: build passes the portal's QA checklist; rewarded-ad hook grants exactly the configured reward; main-site headers unchanged (test).
Expectation setting (from audit): discovery plus pocket money; treat revenue as secondary to the funnel.
Verify: portal sandbox review notes + header regression test.

## DD-D03 - education kit (M9)

Entry gate: at least one paid DD-C10 session delivered (real-world feedback first). Depends: DD-C10. Owner mixed; gate: curriculum review + license pricing by Stephen.
Files: curriculum doc set mapping `lib/game/conceptMap.ts` bug types to web-fundamentals lessons, facilitator guide v2, classroom mode polish (longer time box, printable results), `docs/sales/EDU-LICENSE.md` (annual per-classroom terms, bundle with CyberSkill training engagements).
Acceptance: a non-author can run a session from the kit alone; license terms reviewed; concept coverage matches the in-game bug taxonomy.
Verify: dry-run session by someone other than the author, notes in ledger.

## DD-D04 - desktop wrapper on Steam (M10)

Entry gate: the web game has an audience (post-launch traffic data) and Stephen accepts the $100 Steam fee + review overhead. Owner mixed.
Files: Tauri wrapper project (the gam release workflow is the in-house reference), offline endless mode against the extracted engine, Steam achievements mapped from the achievements catalog, store assets.
Steps: wrap, integrate Steamworks basics, price $4.99, wishlist page first as a marketing beat before the build ships.
Acceptance: wrapper runs offline endless; achievements fire; store page passes review.
Verify: local build evidence + store checklist.

## DD-D05 - determinism corpus and contract tests (R38)

Depends: DD-C01.
Files: `tests/fixtures/replays/` grown to a curated corpus (real runs across versions), CI job re-simulating the corpus, contract tests freezing the public API response shapes named in `docs/AUDIT-CONFIG.md`.
Steps: every engine change must re-simulate the corpus byte-identically or explicitly version the engine (corpus entries tagged by engine version); contract tests snapshot leaderboard/daily/score/replay response shapes.
Acceptance: CI fails on an intentional engine-drift test branch; contract snapshots stable on main.
Verify: CI evidence.

<!-- end phase D -->
