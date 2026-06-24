---
id: FR-DD-REACH-003
title: "Accessibility pass: keyboard play, reduced motion, contrast"
lane: REACH
priority: SHOULD
status: proposed
verify: T
phase: P1
milestone: P1 - reach slice 2
owner: Stephen Cheng
created: 2026-06-24
related_frs: [FR-DD-REACH-001]
depends_on: [NFR-DOM-008]
blocks: []

# Source contracts
source_decisions:
  - components/game/styles.css (heavy bug animations; cursors; overlays)
  - components/game/Game.tsx (keyboard already drives tools/power-ups)
  - lib/game/skins.ts (bug palettes per skin - contrast varies)

# Build envelope
language: typescript
new_files:
  - lib/game/motion.ts                  # reduced-motion mode (calmer timings, no flashing)
  - tests/a11y.test.ts
modified_files:
  - components/game/styles.css          # focus-visible states, contrast fixes, reduced-motion media query
  - components/game/Game.tsx, components/Nav.tsx  # ARIA roles/labels on interactive controls
allowed_tools:
  - file_read: components/**, lib/game/**, app/**
  - file_write: components/**, lib/game/motion.ts, tests/**
  - bash: npm test, npx tsc --noEmit, npm run lint
disallowed_tools:
  - change spawn rates or balance (reduced-motion changes presentation, not difficulty)

effort_hours: 8
risk_if_skipped: "A fast, flashing game excludes players who need keyboard-only input, reduced motion, or higher contrast, and it reflects poorly on a product attached to a software consultancy. Accessibility is also the right default and is cheap while the UI is small."
---

## Section 1 - behavior

Bring the game to a WCAG-aligned baseline (the measurable target is NFR-DOM-008). Full play is
operable from the keyboard (mostly true today - close the gaps and add visible focus states).
Honor `prefers-reduced-motion` with a calmer mode that removes flashing and softens the bug
animations without changing difficulty. Fix color contrast on the UI and the bug palettes to AA.
Add ARIA roles and labels to menus, the tool switcher, and dialogs so a screen reader can
navigate the non-gameplay surfaces.

Reduced motion changes presentation only; spawn rates and balance are untouched, so leaderboard
fairness holds.

## Section 4 - acceptance criteria

1. A full run is completable using only the keyboard, with a visible focus indicator at all times.
2. With `prefers-reduced-motion: reduce`, the calmer mode is active: no flashing, gentler motion.
3. UI text and interactive controls meet AA contrast; bug colors are distinguishable on each skin.
4. axe reports no critical issues on the home, play, and leaderboard routes (NFR-DOM-008 gate).
5. `npx tsc --noEmit`, `npm run lint`, `npm test` clean.

## Section 5 - test plan

- Automated: axe checks on key routes in CI (the NFR-DOM-008 gate).
- Manual: keyboard-only run; reduced-motion run; a contrast check on each skin.

## Section 7 - dependencies and notes

Depends on NFR-DOM-008, which defines the measurable a11y gate this FR satisfies. Pairs with
FR-DD-REACH-001: large, clearly-focused touch targets serve both touch and keyboard users.
