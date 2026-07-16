---
id: NFR-DOM-001
title: "Server-authoritative scores via replay validation"
category: Integrity
status: proposed
verify: T
owner: Stephen Cheng
created: 2026-06-24
closes: [L1-T1]
related: [NFR-DOM-003, TASK-DD-SOC-001, TASK-DD-SOC-003, TASK-DD-MON-001]
source:
  - app/api/scores/route.ts (today: only a coarse sanity check)
  - lib/game/replay.ts (a replay - event log + snapshots - is already recorded per run)
  - models/Replay.ts, models/Score.ts
---

## Target

No score reaches the leaderboard without server-side validation against the run's recorded
replay. A fabricated or inconsistent submission is rejected with 400. Concretely:

- A score POST MUST carry (or reference) the run's replay.
- The server MUST reject a submission whose claimed `score`, `bugsFixed`, `maxCombo`, or
  `wave` is inconsistent with the replay's events (bounds check in v1).
- For daily and tournament runs, the server SHOULD re-simulate the deterministic run from
  `seed` + events and recompute the score, accepting only an exact match (v2).

## Why

The game presents a competitive daily leaderboard, but `/api/scores` currently accepts any
client-claimed score under a single check (`score <= max(500, durationSec*200)`). One curl
command posts a top score. Every social and monetization feature that surfaces or rewards
rank (challenges, tournaments, Pro status) is meaningless until this closes. This is the
single highest-leverage hardening item and a launch blocker.

## Acceptance and verification

1. A submission with no replay, or a replay that does not reconstruct the claimed score
   within tolerance, returns 400 and writes nothing to the leaderboard.
2. A legitimate run validates and is stored.
3. Daily/tournament: re-simulation from seed reproduces the score; mismatches are rejected.
4. Existing honest clients still succeed (no false rejections in the test corpus).

```
# verify
npm test -- score-integrity      # bounds + reconstruction cases
# manual: forged curl POST to /api/scores with an inflated score => 400
```

## Notes

v1 (bounds check + replay required) is enough to unblock launch and the social tasks. v2 (full
re-simulation) is the strong form for daily and tournaments and can land in a later loop.
The replay system already exists, so most of the cost is the validator and wiring, not new
capture. Pair with a per-user submission rate limit (L1-T7).
