---
id: FR-DD-COMM-001
title: "Public player profiles at /u/[username]"
lane: COMM
priority: MUST
status: proposed
verify: T
phase: P1
milestone: P1 - retention slice 1
owner: Stephen Cheng
created: 2026-06-24
related_frs: [FR-DD-COMM-002, FR-DD-COMM-004, FR-DD-SOC-004]
depends_on: []
blocks: [FR-DD-COMM-002, FR-DD-COMM-003]

# Source contracts
source_decisions:
  - models/User.ts (stats, cosmetics, achievements already stored per user)
  - app/account/page.tsx (private profile today; public view is a read-only projection)
  - models/Score.ts, models/Replay.ts (best runs + replays to surface)

# Build envelope
language: typescript
new_files:
  - app/u/[username]/page.tsx          # public read-only profile
  - app/api/profile/[username]/route.ts# public projection (no email, no internal ids)
  - tests/public-profile.test.ts
modified_files:
  - models/User.ts                     # add profilePublic flag (default true) + optional displayName
  - app/account/page.tsx               # privacy toggle
allowed_tools:
  - file_read: app/**, models/**, lib/**
  - file_write: app/u/**, app/api/profile/**, models/User.ts, app/account/page.tsx, tests/**
  - bash: npm test, npx tsc --noEmit, npm run lint
disallowed_tools:
  - expose email, passwordHash, or any internal id in the public projection
  - make profiles public retroactively without the opt-out being available first

effort_hours: 7
risk_if_skipped: "There is no public identity in the game, so there is nothing to follow, link to, or compete around by name. Profiles are the anchor that friends, guilds, reactions, and referrals all attach to."
---

## Section 1 - behavior

A public, read-only profile at `/u/<username>` showing the player's display name, best
endless and daily scores, total runs, achievements, equipped cosmetics, and a short list of
recent public replays (each links to the existing `/replay/[id]` viewer). The page is served
from a public projection endpoint that returns only safe fields.

Privacy is opt-out: a `profilePublic` flag (default true) on the user, toggled from the
account page. When false, `/u/<username>` returns a "this profile is private" state and the
projection omits the player.

## Section 4 - acceptance criteria

1. `/u/<existing-username>` renders stats, achievements, cosmetics, and recent replays.
2. The public projection never includes email, passwordHash, or internal ids. Verified by
   `public-profile.test.ts` asserting the response shape.
3. Setting the profile private hides the page and removes the user from the projection.
4. An unknown username returns a clean not-found state, not a 500.
5. `npx tsc --noEmit`, `npm run lint`, `npm test` clean.

## Section 5 - test plan

- Unit: projection function strips sensitive fields; private flag is honored.
- Integration: public profile renders for a seeded user; private user is hidden; unknown
  user is a clean 404.

## Section 7 - dependencies and notes

No hard dependency, but it is the prerequisite for FR-DD-COMM-002 (friends), -003 (guilds),
-004 (replay reactions), and FR-DD-SOC-004 (referrals). Build it early in P1. Reuses the
data already on `User`, `Score`, and `Replay`; the main new surface is the safe projection.
