# Phase C - integrity v2 and revenue rails

Exit condition: the ranked economy is defensible against fabricated-but-consistent replays, ops has ceilings and retention rules, and at least one revenue rail (B2B or MoR checkout) can take money. Start only after the public launch has run (Phase B exit + marketing week).

## DD-C01 - re-simulation validator (R11)

Why: v1 validation is bounds-only; `lib/game/scoreValidator.ts` states it cannot catch a self-consistent fabricated replay. Daily/tournament runs are deterministic from seed + inputs, so exact re-simulation is possible.
Files: extract sim core to `lib/game/engine/` (pure, isomorphic - no DOM/React imports), server validator `lib/game/resimulate.ts`, wire into `app/api/scores/route.ts` for daily/tournament behind `RESIM_MODES=daily,tournament`, fixtures in `tests/fixtures/replays/`.
Steps: refactor Game.tsx to consume the extracted engine (protected area note: the daily seed PRNG moves verbatim - byte-identical outputs proven by test against recorded fixtures); server re-runs seed + events and accepts only exact score/wave/bugsFixed match; tolerance zero for deterministic modes; flag-gated rollout (log-only first, then enforce).
Acceptance: recorded legit replays re-simulate to identical scores; a tampered event log (one inflated fix score) is rejected; PRNG regression fixtures byte-identical; log-only mode emits mismatch metrics.
Verify: `npm test -- resimulate` + fixture suite.

## DD-C02 - run tokens (R12)

Depends: DD-C01.
Files: new `app/api/runs/start/route.ts`, `lib/game/runToken.ts` (HMAC over runId/mode/seed/userId/iat with an `AUTH_SECRET`-derived key), scores route requires the token for ranked modes, client wiring in PlayShell.
Steps: token issued at run start; submit checks signature, mode/seed binding, single-use (runId unique column on scores), and a duration floor (now - iat >= claimed duration - slack).
Acceptance: missing/reused/foreign tokens rejected; a 30-second run claiming 300 seconds rejected; honest path unaffected in e2e smoke.
Verify: `npm test -- run-token`.

## DD-C03 - anomaly heuristics (R13)

Depends: DD-C02.
Files: `lib/game/anomaly.ts`, scores route (flag, never block), `db/schema.ts` (`flagged`, `flagReasons` on scores + migration).
Steps: score/sec percentile vs verified population; events/sec cap; input-cadence variance (bots are metronomes); duplicate-replay hash (sha256 of normalized events); flags recorded with reasons.
Acceptance: seeded bot-like fixtures get flagged, human fixtures do not; flags never change the HTTP response.
Verify: `npm test -- anomaly`.

## DD-C04 - shadow review (R14)

Depends: DD-C03, DD-B08.
Files: admin flagged queue (extends `app/admin`), board queries exclude flagged-pending rows except for their owner, replay playback embed in the queue, actions clear/ban.
Steps: flagged scores rank owner-only until reviewed (shadow pattern); reviewer sees replay + reasons; clearing restores rank retroactively.
Acceptance: flagged row invisible to others on boards but visible to owner; clear/ban round-trips; tests cover the visibility matrix.
Verify: `npm test -- shadow-review`.

## DD-C05 - replay retention (R30)

Depends: DD-A05.
Files: `db/migrations/0002_replay_retention.sql` (pg_cron job), privacy page update.
Steps: keep daily top-50 per dailyKey, tournament top-50 per weekKey, each user's personal-best replay per mode; prune the rest older than 90 days; disclose in privacy policy.
Acceptance: dry-run SELECT counts match policy before enabling DELETE; cron job listed; policy updated.
Verify: SQL dry-run output in ledger.

## DD-C06 - load test (R31)

Depends: DD-A04. Gate: a staging deployment + throwaway DB.
Files: `load/k6-scores.js`, `load/k6-boards.js`, `docs/deploy/CAPACITY.md`.
Steps: k6 against staging: score POST with realistic replay payloads (p95 latency, error rate vs RPS), board GET with and without DD-B12 caching; record the knee points and the Supabase connection behavior in CAPACITY.md.
Acceptance: documented ceilings + at least one bottleneck finding with a follow-up card if needed.
Verify: k6 summary output in ledger.

## DD-C07 - status page (R32)

Depends: DD-A09. Owner mixed; gate: provider account.
Steps: BetterStack (or provider) status page fed by the existing monitors; footer link.
Acceptance: page public; reflects a forced test incident.
Verify: link + screenshot in ledger.

## DD-C08 - room membership table (C9)

Why: `app/api/teams/route.ts:54-81` read-modify-writes a jsonb members array; concurrent joins/submits drop updates - unacceptable once teams is paid (DD-C10).
Files: `db/schema.ts` (`room_members`: roomId, userId unique pair, username, score, joinedAt + migration), teams route rewritten to inserts/updates, reads join the table; drop the jsonb column after backfill.
Acceptance: concurrent join test (10 parallel) loses nothing; score submit updates only the caller's row; API response shape unchanged (protected-shape check).
Verify: integration test in DD-B15 harness.

## DD-C09 - billing provider (C4, M1)

Why: TASK-DD-MON-001 assumes Stripe, which does not onboard Vietnam-based merchants. The rail must be a merchant of record first.
Owner mixed; gate: Stephen creates the Paddle (or Lemon Squeezy) account and confirms VN seller eligibility + payout method before code lands. Depends: DD-A06 (MoR requires policy/terms/refund pages - add `/refunds`).
Files: new `lib/billing/` (provider interface: createCheckout, verifyWebhook, grant/revoke reducers), `lib/billing/paddle.ts`, `app/api/billing/webhook/route.ts`, `app/api/shop/purchase/route.ts` usd path, `lib/pro.ts` reads subscription state, `db/schema.ts` (billing customer id, subscription status + migration), rewrite of `docs/tasks/monetization/TASK-DD-MON-001` to gateway-agnostic form, `tests/billing.test.ts`.
Steps: keep every existing invariant - fail-closed when `BILLING_PROVIDER`/keys unset (usd path stays 503 + waitlist pointer); entitlements granted only by a signature-verified webhook, never by the client; sandbox-mode e2e before any live key.
Acceptance: flag off = unchanged 503; forged webhook = 400 grants nothing; sandbox checkout grants Pro and cancellation revokes; no secret committed; task doc rewritten.
Verify: `npm test -- billing` (mocked signatures) + sandbox evidence in ledger.

## DD-C10 - teams productization (M5)

Why: fastest real revenue; needs zero gateway code - CyberSkill invoices via ACB.
Owner mixed; gate: Stephen signs off pricing ($99 self-serve room, $499 facilitated, custom on-site) and runs the sales motion. Depends: DD-C08.
Files: `app/teams/page.tsx` rework (pitch + lead form posting to a `team_leads` table + email notify via DD-B03 sender), room polish (host controls, results export), `docs/sales/TEAMS-ONE-PAGER.md` + facilitator runbook.
Steps: pitch page (what a session looks like, concept-map learning angle, pricing, "book a session" form); lead lands in DB + notification; one-pager for outbound.
Acceptance: lead form round-trips; one-pager ready; a full mock session runs clean using the runbook.
Kill criterion (from audit): zero paid sessions after 90 days of outreach - fold to free marketing.
Verify: `npm test -- team-leads` + mock-session notes.

## DD-C11 - sponsor surface (M6)

Depends: DD-B10 (real metrics feed the kit). Owner mixed; gate: Stephen pitches sponsors.
Files: sponsor slot component (tournament page + tournament OG card variant), `app/sponsors/page.tsx` media kit (traffic pulled from PostHog manually each month), `docs/sales/SPONSOR-KIT.md` (inventory, $250-500/week starting band, disclosure rules).
Steps: env-gated sponsor config (name, logo, url, week key); tasteful disclosure ("this week's tournament is sponsored by"); never in-gameplay ads.
Acceptance: slot renders only when configured; OG variant correct; kit doc complete.
Kill criterion: no sponsor after 3 months of pitching at 10k+ weekly plays.
Verify: component test + OG snapshot.

## DD-C12 - Pro tier (M2)

Depends: DD-C09. Gate: retention proof (D7 at target per docs/analytics/TARGETS.md) + Stephen price sign-off (~$3-4/mo, $24/yr, $29 lifetime founder for season one).
Files: entitlement checks via `requirePro`, Pro cosmetics set in `lib/game/cosmetics.ts`, private rooms flag (DD-C08), extended replay retention override (DD-C05 interplay), pro page rework from waitlist to checkout.
Steps: perks exactly per audit M2 - identity and convenience, never ranked power; lifetime founder capped to season one.
Acceptance: non-Pro sees locked perks with checkout CTA; Pro unlocks all listed perks; revocation downgrades gracefully; no ranked-power path (test asserts no score multiplier anywhere).
Kill criterion: under 0.5% of WAU converting after 60 days - park subscriptions, push C10/D02.
Verify: `npm test -- pro-entitlements`.

## DD-C13 - supporter packs (M3)

Depends: DD-C09.
Files: pack catalog ($5/$10/$25: coins + founder badge tier), purchase path through `lib/billing`, badge cosmetics.
Steps: one-time checkout; coins credit atomically (reuse the conditional-update pattern from shop purchase); badges are permanent cosmetics.
Acceptance: sandbox purchase credits exactly once under a double-webhook replay test (idempotency by event id); badges render.
Verify: `npm test -- packs`.

## DD-C14 - regional pricing (M13)

Depends: DD-C09.
Files: MoR dashboard config (documented in `docs/sales/PRICING.md`), price display localization hooks (pairs with TASK-DD-REACH-002 vi locale when it lands).
Steps: enable PPP/regional pricing in the provider; document the VN/SEA price band; display localized prices on /pro.
Acceptance: sandbox shows distinct VN pricing; doc records the bands and rationale.
Verify: sandbox screenshot + doc review.

<!-- end phase C -->
