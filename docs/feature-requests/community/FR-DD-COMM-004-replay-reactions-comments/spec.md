---
id: FR-DD-COMM-004
title: "Reactions and comments on shared replays"
lane: COMM
priority: SHOULD
status: draft
verify: T
phase: P1
milestone: P1 - retention slice 2
owner: Stephen Cheng
created: 2026-06-24
related_frs: [FR-DD-COMM-001, FR-DD-COMM-002]
depends_on: [FR-DD-COMM-001, NFR-DOM-007]
blocks: []

# Source contracts
source_decisions:
  - app/replay/[id] (the shareable artifact people will react to)
  - NFR-DOM-007 (moderation - any user text must pass the gate)
  - models/Replay.ts

# Build envelope
language: typescript
new_files:
  - models/ReplayComment.ts             # comment + reaction documents, keyed to a replay
  - app/api/replays/[id]/comments/route.ts
  - app/api/replays/[id]/reactions/route.ts
  - tests/replay-social.test.ts
modified_files:
  - app/replay/[id]/page.tsx            # render reactions + comments; post box for signed-in users
allowed_tools:
  - file_read: app/**, models/**, lib/**
  - file_write: models/ReplayComment.ts, app/api/replays/[id]/**, app/replay/[id]/page.tsx, tests/**
  - bash: npm test, npx tsc --noEmit, npm run lint
disallowed_tools:
  - render user text without sanitization (XSS) or without the NFR-DOM-007 moderation gate
  - allow unauthenticated posting

effort_hours: 7
risk_if_skipped: "Replays are the most shareable artifact in the game but they are silent. Reactions and comments add the social proof and back-and-forth that keep people on a run page and bring the author back to see responses."
---

## Section 1 - behavior

On a replay page, signed-in players can add an emoji reaction (toggle) and a short comment.
Comments and the display text run through the NFR-DOM-007 moderation gate (denylist + length +
rate limit) and are sanitized before render. Authors can delete their own comments; abusive
content can be reported. Reaction and comment counts show on the replay and feed cards.

## Section 4 - acceptance criteria

1. A signed-in user can react (toggle) and post a comment; an unauthenticated user cannot.
2. Comment text is sanitized (no XSS) and passes the moderation gate; a denylisted or
   over-rate-limit comment is rejected.
3. A user can delete their own comment; reporting flags content for review.
4. `npx tsc --noEmit`, `npm run lint`, `npm test` clean.

## Section 5 - test plan

- Unit: sanitizer strips markup; moderation gate rejects denylisted text and enforces the rate
  limit; reaction toggle is idempotent per user.
- Integration: post -> render -> delete; report path flags the item.

## Section 7 - dependencies and notes

Depends on FR-DD-COMM-001 (identity) and NFR-DOM-007 (moderation). Reuse the rate-limit
primitive built in NFR-DOM-003 here rather than writing a third one.
