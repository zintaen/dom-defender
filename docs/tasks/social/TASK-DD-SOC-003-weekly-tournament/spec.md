---
id: TASK-DD-SOC-003
title: "Weekly tournament with its own seed and ranked board"
lane: SOC
priority: SHOULD
status: implementing
verify: T
phase: P1
milestone: P1 - growth slice 2
owner: Stephen Cheng
created: 2026-06-24
related_frs: [TASK-DD-SOC-001, TASK-DD-OPS-001]
depends_on: [NFR-DOM-001]
blocks: []

# Source contracts
source_decisions:
  - lib/game/dailySeed.ts (deterministic seed machinery to reuse for a weekly key)
  - app/api/leaderboard/route.ts, app/daily (existing seeded-board pattern)
  - models/Score.ts (scores already carry mode + seed + dailyKey)

# Build envelope
language: typescript
new_files:
  - lib/game/tournament.ts              # weekKey() + server-derived weekly seed
  - app/tournament/page.tsx             # entry + ranked board + countdown
  - app/api/tournament/route.ts         # current week key + seed + standings
  - tests/tournament.test.ts
modified_files:
  - app/api/scores/route.ts             # accept mode "tournament"; validate against the week seed
  - components/Nav.tsx                   # tournament entry point
allowed_tools:
  - file_read: app/**, lib/game/**, models/**
  - file_write: lib/game/tournament.ts, app/tournament/**, app/api/tournament/**, app/api/scores/route.ts, tests/**
  - bash: npm test, npx tsc --noEmit, npm run lint
disallowed_tools:
  - derive the weekly seed from client input (must come from the server week key)
  - accept a tournament score that fails NFR-DOM-001 validation

effort_hours: 9
risk_if_skipped: "The daily challenge resets interest each day but offers no escalating stakes. A weekly tournament gives a recurring event to post about, a reason to return across the week, and a natural content cadence for the marketing plan."
---

## Section 1 - behavior

A weekly tournament: a server-derived `weekKey` seeds one shared bug pattern for the whole
week (reusing the daily-seed machinery). Players enter during the week, runs submit as mode
"tournament" and are validated server-side (NFR-DOM-001), and a ranked board shows standings
with a countdown to rollover. At week end the board freezes and the winners are surfaced; a new
seed begins. The seed is always server-derived so no one can pre-practice a forged seed.

## Section 4 - acceptance criteria

1. Every player in a given week plays the identical tournament seed (determinism test).
2. Tournament scores go through the same server validation as the daily board; forged scores
   are rejected.
3. Week rollover is deterministic and the prior week's board freezes correctly.
4. `npx tsc --noEmit`, `npm run lint`, `npm test` clean.

## Section 5 - test plan

- Unit: `weekKey()` and the derived seed are stable within a week and change at rollover.
- Integration: a tournament submission validates; a forged one is rejected; standings rank
  correctly.

## Section 7 - dependencies and notes

Depends on NFR-DOM-001 (a competitive event on a fakeable board is worse than no event). Sets
up TASK-DD-OPS-001 (seasons + rotating modifiers), which generalizes this into recurring live ops.

## Section 8 - implementation status (2026-06-24, scaffolded)

Built and unit-tested (8 tests green):
- lib/game/tournament.ts: weekKey (ISO-8601 week, UTC, resolved via the week's Thursday so the
  year is correct at boundaries), tournamentSeed (reuses seedFromDateKey, unsigned 32-bit),
  weekStart / weekEnd / msUntilRollover. tests/tournament.test.ts proves the seed is stable
  within a week and changes at the Monday rollover.

Server + UI (build-verified on the next-16 branch, not in the sandbox):
- models/Score.ts: mode enum and IScore union widened to include "tournament"; dailyKey holds
  the ISO week key for tournament rows (the existing { mode, dailyKey, score } index serves the
  weekly board).
- app/api/scores/route.ts: accepts mode "tournament"; the week key and seed are derived
  server-side (never from the client); a supplied replay must carry the week seed or it is
  rejected; the run still goes through the NFR-DOM-001 replay validation, same as daily.
- app/api/tournament/route.ts: GET returns weekKey, server seed, startsAt/endsAt, countdown,
  and the best-per-user ranked board for the week.
- app/tournament/page.tsx: live board, countdown to rollover, "Play this week" entry.
- components/PlayShell.tsx: accepts mode "tournament" and maps it to the seeded "daily" core
  path so the protected Game.tsx is untouched (seed set => director off => determinism holds);
  the real "tournament" mode is what is submitted and shared.
- components/Nav.tsx: Tournament entry point.

Known gaps / follow-ups:
- The Game HUD shows the "DAILY" badge during a tournament run because tournament maps onto the
  daily core path. A later clean pass widens Game.tsx's mode union to add a real TOURNAMENT
  badge. Cosmetic only; the score is recorded and ranked as a tournament.
- Week rollover freeze is implicit: a closed week's rows stay queryable by their week key, but
  there is no surfaced "winners" archive view yet. Add a read-only past-weeks board when OPS-001
  (seasons) lands.
- Verification is sandbox-limited to the pure core. tsc/lint/build on the next-16 branch is the
  real gate for the route, page, model change, and PlayShell edit.
