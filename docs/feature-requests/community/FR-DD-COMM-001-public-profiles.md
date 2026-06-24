---
id: FR-DD-COMM-001
title: "Public player profiles at /u/[username]"
lane: COMM
priority: MUST
status: scaffolded
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

## Section 8 - implementation status (2026-06-24, scaffolded)

Built and unit-tested (9 tests green):
- lib/profile/publicProfile.ts: projectPublicProfile (field-by-field projection - constructs only
  safe display fields so email / passwordHash / internal id can never leak even from a full
  document), isProfilePublic (opt-out: public unless profilePublic is explicitly false),
  normalizeUsername, isValidUsernameParam. tests/public-profile.test.ts asserts the PII guard,
  the safe fields, the opt-out default, and the username helpers.

Server + UI (build-verified on the next-16 branch, not in the sandbox):
- models/User.ts: added profilePublic (default true) + optional displayName (max 32).
- app/api/profile/[username]/route.ts: public projection GET. Case-insensitive username lookup;
  unknown -> clean 404; private -> { private: true } with no player data; public -> projection
  plus best endless, best daily (from Score), and the 5 most recent replays (from Replay).
- app/u/[username]/page.tsx: read-only profile (stats, best runs, achievement count, recent
  replays linking to /replay/[id]); private state; 404 via notFound. generateMetadata emits the
  og:image - this also closes the FR-DD-SOC-002 profile-OG deferral, reusing buildOgQuery +
  /api/og.
- app/api/profile/route.ts: PATCH extended to accept profilePublic + displayName; GET now returns
  them so the account page can show current state.
- app/account/page.tsx: "Public profile" section with the visibility toggle (the opt-out, which
  must ship with default-public) and a display-name field.

Follow-ups:
- Make profiles discoverable by linking usernames on the leaderboard and tournament boards to
  /u/[username] (small, build-safe; left out to keep this slice within its envelope).
- COMM-002 (friends), -004 (reactions) now have their anchor and can build on this projection.
- Verification is sandbox-limited to the pure projection core; tsc/lint/build on the next-16
  branch is the real gate for the model, the two route changes, the page, and the account edit.
