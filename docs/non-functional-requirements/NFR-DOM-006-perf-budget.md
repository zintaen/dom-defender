---
id: NFR-DOM-006
title: "Bundle and route performance budget enforced in CI"
category: Performance
status: proposed
verify: T
owner: Stephen Cheng
created: 2026-06-24
closes: [L1-T12]
related: [NFR-DOM-005]
source:
  - no production-build baseline today (build UNMEASURED in the sandbox)
  - app/play (the most latency-sensitive route - the game itself)
---

## Target

- The production build MUST set a per-route initial-JS budget and fail CI when a route exceeds
  it (start from the measured baseline plus a small headroom; the game route gets the tightest
  budget).
- Key routes (home, /play, /leaderboard) MUST meet field-relevant thresholds: a Largest
  Contentful Paint and Total Blocking Time floor checked by Lighthouse CI, set as internal
  targets (no external product benchmark applies, per CAF R2).

## Why

There is no build baseline or budget today, so bundle size can creep silently. A game has to
start fast or the player leaves before the first bug spawns, and marketing traffic lands on the
slowest connections. A budget in CI turns "it feels slow" into a failing check.

## Acceptance and verification

1. CI runs `next build` and asserts each tracked route is under its JS budget; a regression
   over budget fails the build.
2. Lighthouse CI runs on home, /play, /leaderboard and enforces the LCP and TBT targets.
3. The budgets and the first real baseline are recorded in `docs/BACKLOG.md` (replacing the
   current UNMEASURED build row).

```
# verify
npm run build           # produces the route sizes
# CI: size-limit (or the Next build output parsed) asserts budgets; lhci autorun on key routes
```

## Notes

Set the first budget from the real local build (the sandbox could not finish `next build`).
Depends on NFR-DOM-005 being in place, since this is one more required check in the same gate.
