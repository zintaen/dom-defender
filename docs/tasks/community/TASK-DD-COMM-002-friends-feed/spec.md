---
id: TASK-DD-COMM-002
title: "Friends / follow and a following feed"
lane: COMM
priority: SHOULD
status: implementing
verify: T
phase: P1
milestone: P1 - retention slice 2
owner: Stephen Cheng
created: 2026-06-24
related_frs: [TASK-DD-COMM-001, TASK-DD-COMM-003, TASK-DD-SOC-004]
depends_on: [TASK-DD-COMM-001]
blocks: [TASK-DD-COMM-003]

# Source contracts
source_decisions:
  - TASK-DD-COMM-001 (public profiles are the anchor a follow attaches to)
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
risk_if_skipped: "Profiles give players an identity but no graph. Without follows there is nothing to come back for between your own runs. The feed is what turns single sessions into a habit and sets up referrals (TASK-DD-SOC-004) and guilds (TASK-DD-COMM-003)."
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

Depends on TASK-DD-COMM-001. Keep the edge model simple (a `Follow` collection) so guilds
(TASK-DD-COMM-003) and referrals (TASK-DD-SOC-004) can build on the same graph.

## Section 8 - implementation status (2026-06-24, scaffolded)

Built and unit-tested (7 tests green):
- lib/social/follow.ts: canFollow (rejects self-follow and empty ids), sortFeedNewestFirst
  (newest-first, bounded, ISO timestamps), dedupeIds. tests/follow.test.ts covers all three.

Server + UI (build-verified on the next-16 branch, not in the sandbox):
- models/Follow.ts: follower -> following edge with a unique compound index, so a duplicate
  follow is a no-op at the database level.
- app/api/follow/route.ts: POST follow/unfollow (idempotent via upsert / deleteOne; self-follow
  rejected by canFollow) and GET ?username= returning follower/following counts, the viewer's
  follow state, isSelf, and canFollow.
- app/api/feed/route.ts: GET returns recent runs from followed players, filtered to public
  profiles only (a private followed player contributes nothing), newest first via
  sortFeedNewestFirst.
- app/feed/page.tsx: the following feed (sign-in gated).
- components/FollowButton.tsx: counts + follow toggle, loaded client-side so the profile page
  stays a server component.
- app/u/[username]/page.tsx: renders the FollowButton in the header.
- components/Nav.tsx: Feed entry (signed-in only).
- Discoverability win folded in: usernames on the leaderboard (app/leaderboard/page.tsx) and the
  tournament board (app/tournament/page.tsx) now link to /u/[username].

Acceptance mapping: idempotent follow/unfollow (upsert + unique index), feed shows only public
followed activity newest-first (feed route + sortFeedNewestFirst), private profile excluded
(profilePublic filter in the feed query), self-follow and duplicate rejected (canFollow + unique
index). The follow/unfollow idempotence and the private-exclusion are integration behaviors;
unit coverage is on the pure invariants. tsc/lint/build on the next-16 branch is the real gate
for the model, the two routes, the pages, and the board edits.

Follow-up: the feed is a flat "recent runs" list; richer activity types (achievements unlocked,
new personal bests called out) can layer on later without changing the edge model.
