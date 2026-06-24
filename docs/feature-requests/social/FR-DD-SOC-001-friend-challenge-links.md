---
id: FR-DD-SOC-001
title: "Friend challenge links - beat-my-seed with an embedded target score"
lane: SOC
priority: MUST
status: proposed
verify: T
phase: P1
milestone: P1 - growth slice 1
owner: Stephen Cheng
created: 2026-06-24
related_frs: [FR-DD-SOC-002, FR-DD-COMM-001]
depends_on: [NFR-DOM-001]   # the target score must be trustworthy
blocks: [FR-DD-SOC-003]

# Source contracts
source_decisions:
  - README.md (private-seed URLs and post-run share card already exist - this builds on them)
  - app/play/page.tsx (?seed= handling)
  - app/api/scores/route.ts (score submission; challenge result compares against the target)

# Build envelope
language: typescript
new_files:
  - app/challenge/[token]/page.tsx     # landing page for an incoming challenge
  - lib/game/challenge.ts              # encode/decode challenge token (seed + target + challenger)
  - tests/challenge.test.ts
modified_files:
  - components/ShareCard.tsx           # add "Challenge a friend" action on the run-end card
  - app/play/page.tsx                  # accept a challenge token, set the seed, show the target
allowed_tools:
  - file_read: app/**, components/**, lib/**
  - file_write: app/challenge/**, lib/game/challenge.ts, components/ShareCard.tsx, app/play/page.tsx, tests/**
  - bash: npm test, npx tsc --noEmit, npm run lint
disallowed_tools:
  - trust the target score from the token alone for any leaderboard effect (display only; real ranking still goes through /api/scores under NFR-DOM-001)

effort_hours: 9
risk_if_skipped: "The game has no built-in person-to-person loop. Growth depends entirely on the player choosing to post a score. A challenge link is the cheapest viral mechanic available and it reuses the seed + share-card systems that already exist."
---

## Section 1 - behavior

From any finished run, the player can create a challenge link. The link encodes the run's
seed and the player's score (the target) plus their username. When a friend opens it, they
land on a challenge page that explains "Beat <name>'s <score>", then plays the identical
seeded bug pattern. On finishing, the result screen compares their score to the target and
offers a one-tap rematch or a re-challenge back.

The embedded target is for display and motivation only. Any score that affects the real
leaderboard still goes through `/api/scores` and is subject to NFR-DOM-001 server validation,
so a forged token cannot inject a fake leaderboard entry.

## Section 4 - acceptance criteria

1. A challenge link round-trips: encode(seed, score, name) -> decode returns the same values;
   tampered tokens fail to decode cleanly. Verified by `challenge.test.ts`.
2. Opening a challenge sets the exact seed; two players on the same link get the identical
   bug sequence (reuses the daily/seed determinism).
3. The result screen shows beat / missed against the target and offers rematch + re-challenge.
4. A forged target score never appears on the global leaderboard (it is display-only).
5. `npx tsc --noEmit`, `npm run lint`, `npm test` clean.

## Section 5 - test plan

- Unit: token encode/decode round-trip and tamper rejection.
- Integration: open a challenge URL, assert the seed and target render; finishing posts a
  normal score through the validated path, not the token.

## Section 7 - dependencies and notes

Depends on NFR-DOM-001 so the target a challenge brags about is a real score, not a fabricated
one. Pairs with FR-DD-SOC-002 (per-run OG images) so the link unfurls with an image in chats
and social posts - that is what makes it spread.
