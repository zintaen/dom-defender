---
id: NFR-DOM-008
title: "Accessibility: WCAG-aligned play and UI, checked in CI"
category: Accessibility
status: proposed
verify: T
owner: Stephen Cheng
created: 2026-06-24
closes: []
related: [FR-DD-REACH-003, FR-DD-REACH-001]
source:
  - components/game/styles.css (animation-heavy; some hover-only affordances)
  - lib/game/skins.ts (bug palettes - contrast varies by skin)
---

## Target

- Full gameplay MUST be operable from the keyboard, with a visible focus indicator at all times.
- `prefers-reduced-motion: reduce` MUST switch the game to a calmer presentation (no flashing,
  softened motion) without changing difficulty or balance.
- UI text and interactive controls MUST meet WCAG AA contrast; bug colors MUST stay
  distinguishable on every skin.
- An automated a11y check (axe) MUST run in CI on the home, play, and leaderboard routes with
  no critical violations.

## Why

The game is fast and animation-heavy, which excludes keyboard-only players, people who need
reduced motion, and low-contrast-sensitive users. Accessibility is the right default, broadens
the audience the marketing brings in, and is far cheaper to bake in now than to retrofit. It is
also a credibility signal for a product attached to a software consultancy.

## Acceptance and verification

1. A full run is completable with the keyboard alone; focus is always visible.
2. With reduced-motion set, the calmer mode is active and nothing flashes.
3. AA contrast holds on the UI and on each skin's bug palette.
4. axe reports zero critical issues on the three tracked routes in CI.

```
# verify
npm test -- a11y          # axe on key routes
# manual: keyboard-only run; reduced-motion run; per-skin contrast check
```

## Notes

This is the measurable gate that FR-DD-REACH-003 implements against. Pair the reduced-motion
work with the touch work (FR-DD-REACH-001): both want large, clearly-focused targets.
