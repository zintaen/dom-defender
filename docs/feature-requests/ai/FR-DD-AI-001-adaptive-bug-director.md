---
id: FR-DD-AI-001
title: "Adaptive bug director - real-time difficulty matching (endless only)"
lane: AI
priority: MUST
status: proposed
verify: T
phase: P1
milestone: P1 - retention slice 1
owner: Stephen Cheng
created: 2026-06-24
related_frs: [FR-DD-AI-002, FR-DD-OPS-001]
depends_on: []
blocks: [FR-DD-AI-002]

# Source contracts
source_decisions:
  - docs/AUDIT-CONFIG.md (PROTECTED_AREAS: daily seed determinism must be preserved)
  - components/game/Game.tsx (current spawn logic + wave model)
  - lib/game/dailySeed.ts (PRNG; director must not touch deterministic modes)

# Build envelope
language: typescript
new_files:
  - lib/game/director.ts            # the difficulty director (pure, testable)
  - lib/game/director.types.ts      # PlayerSkillSnapshot, DirectorDecision
  - tests/director.test.ts
modified_files:
  - components/game/Game.tsx        # call the director on each wave tick in endless mode only
allowed_tools:
  - file_read: lib/game/**, components/game/**
  - file_write: lib/game/**, tests/**, components/game/Game.tsx
  - bash: npm test, npx tsc --noEmit, npm run lint
disallowed_tools:
  - touch dailySeed.ts or any deterministic path (daily/seeded runs must stay reproducible)
  - call any network/LLM API in v1 (the director is a local heuristic with an AI-ready seam)

effort_hours: 8
risk_if_skipped: "Difficulty is fixed by wave number, so strong players get bored before the curve bites and new players bounce on wave 3. Retention and session length both suffer, which undercuts every growth and monetization feature downstream."
---

## Section 1 - behavior

Add a difficulty director that adjusts the bug spawn rate and the bug-type mix to the
player's measured skill, in real time, in endless mode only. Daily, tournament, and any
seeded run keep their deterministic spawn sequence untouched, so leaderboard fairness is
preserved (this is the protected-area constraint from AUDIT-CONFIG).

The director is a pure function: it takes a `PlayerSkillSnapshot` (recent fix latency,
current combo, crash-meter trend, misses) and returns a `DirectorDecision` (spawn interval
multiplier, bug-type weights, whether to allow a boss this wave). v1 uses a transparent
heuristic. The function signature is the AI seam: FR-DD-AI-002 and a later server model can
return the same `DirectorDecision` shape from a learned policy without touching the caller.

The director only widens within tuned bounds (it cannot make the game unwinnable or trivial),
and it is disabled when `mode !== "endless"`.

## Section 4 - acceptance criteria

1. In endless mode, sustained high performance (fast fixes, high combo) raises the spawn
   rate within bounds; sustained struggling lowers it. Verified by `director.test.ts`.
2. In daily, tournament, or any seeded run, the director is bypassed and the spawn sequence
   is byte-for-byte identical to today's behavior. Verified by a determinism test that runs
   the same seed twice and diffs the spawn log.
3. The director never returns a spawn interval outside `[MIN_MS, MAX_MS]` or weights that
   sum to zero (property test).
4. `npx tsc --noEmit`, `npm run lint`, and `npm test` are clean.

## Section 5 - test plan

- Unit: feed scripted skill snapshots, assert decisions move in the right direction.
- Determinism: same seed in twice => identical spawn log (guards the protected area).
- Property: random snapshots never produce out-of-bounds or degenerate decisions.

## Section 7 - dependencies and notes

Depends on nothing; it is safe to build before or after the hardening tasks because it does
not touch auth, scoring, or the API. Keep the decision struct stable - FR-DD-AI-002 (replay
coach) and any future learned director reuse it. This FR is the concrete "AI" hook in the
CyberSkill story: a heuristic today, a model tomorrow, same seam.
