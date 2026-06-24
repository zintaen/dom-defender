---
id: FR-DD-SOC-003
title: "Weekly tournament with its own seed and ranked board"
lane: SOC
priority: SHOULD
status: proposed
verify: T
phase: P1
milestone: P1 - growth slice 2
owner: Stephen Cheng
created: 2026-06-24
related_frs: [FR-DD-SOC-001, FR-DD-OPS-001]
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
up FR-DD-OPS-001 (seasons + rotating modifiers), which generalizes this into recurring live ops.
