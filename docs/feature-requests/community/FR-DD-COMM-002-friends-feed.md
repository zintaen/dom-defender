---
id: FR-DD-COMM-002
title: "Friends / follow and a following feed"
lane: COMM
priority: SHOULD
status: proposed
verify: T
phase: P1
milestone: P1 - retention slice 2
owner: Stephen Cheng
created: 2026-06-24
related_frs: [FR-DD-COMM-001, FR-DD-COMM-003, FR-DD-SOC-004]
depends_on: [FR-DD-COMM-001]
blocks: [FR-DD-COMM-003]

# Source contracts
source_decisions:
  - FR-DD-COMM-001 (public profiles are the anchor a follow attaches to)
  - models/User.ts, models/Score.ts (players + their runs)

# Build envelope
language: typescript
new_files:
  - models/Follow.ts                    # follower -> following edge (unique pair)
  - app/api/follow/route.ts             # follow / unfollow (idempotent)
  - app/api/feed/route.ts               # recent public activity from followed players
  - app/feed/page.tsx
  - tests/follow.test.ts
modified_files:
  - app/u/[username]/page.tsx           # follow button + follower/following counts
allowed_tools:
  - file_read: app/**, models/**, lib/**
  - file_write: models/Follow.ts, app/api/follow/**, app/api/feed/**, app/feed/**, app/u/**, tests/**
  - bash: npm test, npx tsc --noEmit, npm run lint
disallowed_tools:
  - surface activity from a private profile in anyone's feed
  - allow self-follow or duplicate-follow rows

effort_hours: 8
risk_if_skipped: "Profiles give players an identity but no graph. Without follows there is nothing to come back for between your own runs. The feed is what turns single sessions into a habit and sets up referrals (FR-DD-SOC-004) and guilds (FR-DD-COMM-003)."
---

## Section 1 - behavior

A player can follow and unfollow another player from their public profile. A following feed
shows recent public activity (new high scores, achievements, notable runs) from the people they
follow, newest first. Profiles show follower and following counts. Private profiles never appear
in a feed. Follow and unfollow are idempotent; self-follow and duplicate edges are rejected.

## Section 4 - acceptance criteria

1. Follow then unfollow returns to the start state; repeating either is a no-op (idempotent).
2. The feed shows only public activity from followed players, newest first.
3. A private profile contributes nothing to any feed.
4. Self-follow and duplicate-follow are rejected (unique edge).
5. `npx tsc --noEmit`, `npm run lint`, `npm test` clean.

## Section 5 - test plan

- Unit: the follow edge enforces uniqueness and rejects self-follow.
- Integration: A follows B, B's public run appears in A's feed; B goes private, it disappears.

## Section 7 - dependencies and notes

Depends on FR-DD-COMM-001. Keep the edge model simple (a `Follow` collection) so guilds
(FR-DD-COMM-003) and referrals (FR-DD-SOC-004) can build on the same graph.
