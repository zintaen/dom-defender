---
id: FR-DD-SOC-002
title: "Share cards v2: per-run Open Graph images for link unfurls"
lane: SOC
priority: MUST
status: proposed
verify: T
phase: P1
milestone: P1 - growth slice 1
owner: Stephen Cheng
created: 2026-06-24
related_frs: [FR-DD-SOC-001, FR-DD-COMM-001]
depends_on: [FR-DD-SOC-001]
blocks: []

# Source contracts
source_decisions:
  - README.md (a post-run share card with copyable text + an auto PNG already exists)
  - components/ShareCard.tsx (current client-side card)
  - app/replay/[id], app/challenge/[token] (the URLs that need to unfurl with an image)

# Build envelope
language: typescript
new_files:
  - app/api/og/route.tsx                # server-rendered 1200x630 OG image (next/og)
  - lib/og/runCard.tsx                  # the image layout (score, wave, skin, "beat my seed")
  - tests/og.test.ts
modified_files:
  - app/replay/[id]/page.tsx            # OG + Twitter meta tags
  - app/challenge/[token]/page.tsx      # OG meta (challenge unfurl)
  - app/u/[username]/page.tsx           # OG meta (profile unfurl)
  - components/ShareCard.tsx            # use the server image; keep the copyable text
allowed_tools:
  - file_read: app/**, components/**, lib/**
  - file_write: app/api/og/**, lib/og/**, app/**/page.tsx, components/ShareCard.tsx, tests/**
  - bash: npm test, npx tsc --noEmit, npm run lint
disallowed_tools:
  - put any PII (email, internal id) in the image or its query
  - trust unvalidated numbers from the query for anything but rendering the picture

effort_hours: 7
risk_if_skipped: "A challenge link (FR-DD-SOC-001) that unfurls as a bare URL gets ignored in a chat or a tweet; the same link with a score card gets clicked. The image is what makes the social loop actually spread, so it ships in the same slice as the challenge links."
---

## Section 1 - behavior

Add a server-rendered Open Graph image at `/api/og` (using next/og) that draws a run card:
score, wave reached, skin/theme, username, and a "Beat my seed" call to action on the run's
accent gradient. Wire OG and Twitter card meta tags on the replay, challenge, and profile
pages so links unfurl with that image in chats, Slack, Discord, and on social. Keep the
existing copyable text summary. The image takes only display values from the query and never
embeds PII.

## Section 4 - acceptance criteria

1. `/api/og?...` returns a valid 1200x630 image showing score, wave, skin, and the CTA.
2. A challenge URL, a replay URL, and a profile URL each unfurl with the image (validated with
   a card validator / a fetch of the meta tags).
3. The image and its query contain no email or internal id (test asserts).
4. `npx tsc --noEmit`, `npm run lint`, `npm test` clean.

## Section 5 - test plan

- Unit/route: the OG endpoint returns an image response with the expected fields rendered.
- Meta: each page emits correct `og:image` / `twitter:image` tags pointing at the endpoint.

## Section 7 - dependencies and notes

Depends on FR-DD-SOC-001 (the challenge links this decorates). This is the highest
return-per-hour growth item in P1 because it makes every shared link visible.
