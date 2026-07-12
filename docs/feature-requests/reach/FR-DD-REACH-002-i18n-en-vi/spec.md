---
id: FR-DD-REACH-002
title: "Internationalization: English and Vietnamese"
lane: REACH
priority: SHOULD
status: draft
verify: T
phase: P1
milestone: P1 - reach slice 1
owner: Stephen Cheng
created: 2026-06-24
related_frs: [FR-DD-REACH-001, FR-DD-EDU-001]
depends_on: []
blocks: []

# Source contracts
source_decisions:
  - lib/game/skins.ts (brand name + tagline already swap per skin - copy is already data-driven in places)
  - app/**/*.tsx (UI strings currently inline)
  - components/game/Game.tsx, components/ShareCard.tsx (in-game + share copy)

# Build envelope
language: typescript
new_files:
  - lib/i18n/index.ts                   # locale resolution + t() helper
  - locales/en.json                     # English catalog (source of truth)
  - locales/vi.json                     # Vietnamese catalog (full)
  - tests/i18n.test.ts
modified_files:
  - app/layout.tsx                      # locale provider + lang attribute + a switcher
  - app/**/page.tsx, components/**      # replace inline strings with t() keys (incremental)
allowed_tools:
  - file_read: app/**, components/**, lib/**
  - file_write: lib/i18n/**, locales/**, app/**, components/**, tests/**
  - bash: npm test, npx tsc --noEmit, npm run lint
disallowed_tools:
  - translate any deterministic identifier, seed input, or API field name (UI copy only)
  - hardcode a new user-facing string without a catalog key

effort_hours: 10
risk_if_skipped: "Vietnamese is your home market and your own locale; shipping English-only leaves the nearest, warmest audience on the table. Retrofitting i18n after copy has sprawled across the app costs far more than doing it while the surface is still small."
---

## Section 1 - behavior

Add a string catalog and a `t()` helper. English is the source-of-truth catalog; Vietnamese is
a full translation. A locale switch (and the `lang` attribute) is set from the user's choice,
falling back to the browser preference, then English. All visible UI, in-game, and share copy
read from the catalog. Only natural-language copy is translated - seeds, identifiers, and API
field names stay as is. Vietnamese typography and number format follow the locale.

The migration is incremental: land the helper and the two catalogs, then convert screens key by
key, so the work is shippable in small commits rather than one large rewrite.

## Section 4 - acceptance criteria

1. Switching to Vietnamese translates every visible string on the home, play, daily,
   leaderboard, account, and share surfaces; switching back restores English.
2. No missing-key fallbacks render a raw key to the user (test asserts EN and VI have the same
   key set).
3. Longer Vietnamese strings do not break the HUD or buttons (spot-checked on mobile widths).
4. `npx tsc --noEmit`, `npm run lint`, `npm test` clean.

## Section 5 - test plan

- Unit: `en.json` and `vi.json` have identical key sets; `t()` returns the right locale value
  and never leaks a raw key.
- Manual: VI pass on the core screens at a phone width.

## Section 7 - dependencies and notes

Pairs with FR-DD-REACH-001 (mobile) and FR-DD-EDU-001 (a Vietnamese teams mode is a strong
local-market wedge for CyberSkill). next-intl is a reasonable library choice; a tiny in-repo
dictionary is also fine given the small surface. Keep `en.json` the source of truth so new
copy lands there first.
