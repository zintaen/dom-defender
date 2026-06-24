---
id: FR-DD-EDU-001
title: "DOM Defender for teams: workshop / onboarding mode (CyberSkill funnel)"
lane: EDU
priority: SHOULD
status: proposed
verify: T
phase: P1
milestone: P1 - strategic slice
owner: Stephen Cheng
created: 2026-06-24
related_frs: [FR-DD-AI-002, FR-DD-SOC-003, FR-DD-MON-002]
depends_on: [NFR-DOM-001, FR-DD-COMM-001]
blocks: []

# Source contracts
source_decisions:
  - lib/game/dailySeed.ts (shared-seed machinery for a room)
  - app/api/leaderboard (board pattern to specialize into a team board)
  - lib/game/coach.ts (FR-DD-AI-002 output becomes the after-action teaching summary)
  - README.md (each bug type maps to a real web concept - the teaching hook)

# Build envelope
language: typescript
new_files:
  - models/Room.ts                      # host, seed, time box, members, status
  - lib/game/room.ts                    # create/join/score-rollup logic
  - app/teams/page.tsx                  # create a room
  - app/teams/[room]/page.tsx           # lobby, play, live team board, summary
  - app/api/teams/route.ts              # create/join/standings/close
  - lib/game/conceptMap.ts             # bug type -> one-line real-web-concept explainer
  - tests/teams.test.ts
modified_files:
  - app/api/scores/route.ts             # accept a roomId; validate against the room seed (NFR-DOM-001)
allowed_tools:
  - file_read: app/**, lib/game/**, models/**
  - file_write: models/Room.ts, lib/game/room.ts, lib/game/conceptMap.ts, app/teams/**, app/api/teams/**, app/api/scores/route.ts, tests/**
  - bash: npm test, npx tsc --noEmit, npm run lint
disallowed_tools:
  - derive a room seed from client input (server-derived, same as daily/tournament)
  - accept a team score that fails NFR-DOM-001 validation

effort_hours: 14
risk_if_skipped: "This is the feature that turns the game from a standalone toy into a top-of-funnel asset for CyberSkill. Without it the game entertains; with it, every dev team that plays a session is a warm introduction to the consultancy. It is the most direct link between this project and your goal of scaling CyberSkill globally."
---

## Section 1 - behavior

A host creates a room: a shared server-derived seed, a time box, and a join link. Participants
join the link, play the identical seed, and a live team board ranks them. When the time box ends,
an after-action summary shows the team's results plus, for each player, the AI coach tips
(FR-DD-AI-002), and each bug type is annotated with a one-line real-web-concept explainer (drift
= layout/CSS, console popups = error handling, leaks = memory management). The result is a
playable team event that doubles as a teaching session: dev onboarding, a hiring-screen warmup,
a meetup or hackathon activity. Room scores are validated server-side like every other mode.

Positioning: this is the CyberSkill lead-magnet surface. Keep a light "run this for your team"
path that points to CyberSkill, and leave room for a Pro/B2B gate later (FR-DD-MON-002) without
blocking the free single-room flow.

## Section 4 - acceptance criteria

1. A host creates a room and gets a join link; multiple participants join the same seed.
2. The team board ranks participants live; the seed is server-derived and identical for all.
3. At time-box end, the summary shows team results, per-player coach tips, and the concept map.
4. Team scores pass NFR-DOM-001 validation; forged scores are rejected.
5. `npx tsc --noEmit`, `npm run lint`, `npm test` clean.

## Section 5 - test plan

- Unit: room create/join/close transitions; seed is stable per room and server-derived; board
  rollup ranks correctly.
- Integration: two members join, both play the same seed, board ranks them, summary renders the
  concept map and coach tips.

## Section 7 - dependencies and notes

Depends on NFR-DOM-001 (a team event needs a trustworthy board) and FR-DD-COMM-001 (identity).
Reuses the seed machinery (daily/tournament), the leaderboard pattern, and the AI coach. This is
the strategic bet in the roadmap: build it after the core P1 loops exist, then use it in
CyberSkill outreach. A Vietnamese room (FR-DD-REACH-002) is a strong local-market wedge.
