---
id: TASK-DD-REACH-001
title: "Mobile and touch support"
lane: REACH
priority: MUST
status: draft
verify: T
phase: P1
milestone: P1 - reach slice 1
owner: Stephen Cheng
created: 2026-06-24
related_frs: [TASK-DD-SOC-001, TASK-DD-SOC-002, TASK-DD-REACH-003]
depends_on: []
blocks: []

# Source contracts
source_decisions:
  - components/game/Game.tsx (tools on hotkeys 1/2/3, power-ups Q/W/E/R, duct tape uses drag)
  - components/game/LandingPage.tsx (the bug surface; fixed desktop layout today)
  - components/game/styles.css (cursors, overlays - some are hover/pointer based)

# Build envelope
language: typescript
new_files:
  - components/game/TouchControls.tsx   # on-screen tool switcher + power-up buttons
  - lib/game/input.ts                   # input abstraction: pointer events -> game actions
  - tests/input.test.ts
modified_files:
  - components/game/Game.tsx            # route input through lib/game/input.ts
  - components/game/styles.css          # touch targets, no hover-only affordances
  - components/PlayShell.tsx            # responsive viewport, lock scroll during a run
allowed_tools:
  - file_read: components/**, lib/game/**, app/**
  - file_write: components/game/**, lib/game/input.ts, components/PlayShell.tsx, tests/**
  - bash: npm test, npx tsc --noEmit, npm run lint
disallowed_tools:
  - change game timing, spawn rates, or balance (PROTECTED_AREAS - input only)
  - rely on hover or keyboard for any action a phone cannot produce

effort_hours: 12
risk_if_skipped: "The game is mouse and keyboard only. Most casual-game and social traffic is on phones, and every challenge link (TASK-DD-SOC-001) shared into a chat opens on a phone. Without touch support the viral loop sends people to a screen they cannot play."
---

## Section 1 - behavior

Make the full game playable with touch on a phone. Add an input abstraction so the three
tools and four power-ups have pointer-driven equivalents: an on-screen tool switcher and
power-up buttons (replacing hotkeys 1/2/3 and Q/W/E/R), tap-to-act for the debugger and
garbage collector, and touch-drag for duct tape. The bug surface and HUD become responsive,
the page locks scroll/zoom during a run, and no action depends on hover or a physical key.

Game timing, spawn rates, and balance are unchanged - this is an input and layout change only,
which keeps the daily and seeded runs comparable across desktop and mobile.

## Section 4 - acceptance criteria

1. A full run can be completed on a phone with thumbs only: switch tools, fire power-ups,
   fix every bug type, beat a boss.
2. No action requires hover or a keyboard; desktop keyboard play still works unchanged.
3. The play screen fits a phone viewport with no page scroll or pinch-zoom mid-run.
4. Input mapping is covered by `input.test.ts` (pointer event -> intended game action).
5. `npx tsc --noEmit`, `npm run lint`, `npm test` clean.

## Section 5 - test plan

- Unit: `lib/game/input.ts` maps pointer/touch events to the same actions the keys produce.
- Manual: a real-device pass on one iOS and one Android phone (record in the PR).
- Regression: desktop keyboard + mouse path unchanged.

## Section 7 - dependencies and notes

No hard dependency, but it multiplies the value of every share and challenge link, so build it
in the same P1 slice as TASK-DD-SOC-001/002. Pairs with TASK-DD-REACH-003: large touch targets and
visible focus help both touch and accessibility.
