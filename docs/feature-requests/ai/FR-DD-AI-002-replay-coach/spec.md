---
id: FR-DD-AI-002
title: "AI replay coach: three concrete tips grounded in the run"
lane: AI
priority: SHOULD
status: draft
verify: T
phase: P1
milestone: P1 - retention slice 2
owner: Stephen Cheng
created: 2026-06-24
related_frs: [FR-DD-AI-001, FR-DD-EDU-001]
depends_on: [FR-DD-AI-001]
blocks: []

# Source contracts
source_decisions:
  - lib/game/replay.ts, models/Replay.ts (the event log + snapshots to analyze)
  - lib/game/director.types.ts (reuse the AI seam from FR-DD-AI-001)
  - app/replay/[id] (where the coaching surfaces)

# Build envelope
language: typescript
new_files:
  - lib/game/coach.ts                   # pure analyzer: replay -> up to 3 grounded tips
  - lib/game/coach.types.ts             # CoachTip { title, detail, evidence }
  - tests/coach.test.ts
modified_files:
  - app/replay/[id]/page.tsx            # show the coach panel under the run
allowed_tools:
  - file_read: lib/game/**, app/**, models/**
  - file_write: lib/game/coach.ts, lib/game/coach.types.ts, app/replay/[id]/page.tsx, tests/**
  - bash: npm test, npx tsc --noEmit, npm run lint
disallowed_tools:
  - call a network/LLM API in v1 (heuristic over the replay; LLM is a later, flagged, cost-guarded option)
  - emit a tip that is not backed by an event in the actual replay (no generic advice)

effort_hours: 8
risk_if_skipped: "The game shows a score but never tells the player why they lost or how to improve. A coach that points at the real mistake in their run is the difference between a one-time curiosity and a skill they want to grow, and it is the teaching layer the teams mode (FR-DD-EDU-001) builds on."
---

## Section 1 - behavior

After a run, analyze its recorded replay and produce up to three concrete tips, each tied to an
actual event in that run (for example: "memory leaks in wave 4 caused 40% of your crash meter -
the garbage collector was idle for 12s"). v1 is a pure heuristic over replay stats, deterministic
for a given replay, with no network call. The function reuses the AI seam from FR-DD-AI-001, so a
later LLM-backed coach (behind a flag and the cost guard) can return the same `CoachTip` shape.
Every tip must cite evidence from the run; no generic advice.

## Section 4 - acceptance criteria

1. The coach returns up to three tips, each with evidence drawn from the replay's events.
2. The same replay always yields the same tips (deterministic, testable).
3. A flawless run yields praise + at most one stretch tip, not invented faults.
4. No network call in v1. `npx tsc --noEmit`, `npm run lint`, `npm test` clean.

## Section 5 - test plan

- Unit: scripted replays (ignored-leak run, no-power-up run, clean run) produce the expected,
  evidence-cited tips; identical input gives identical output.

## Section 7 - dependencies and notes

Depends on FR-DD-AI-001 for the shared decision/seam types. This is the second concrete "AI"
the player feels, and it is the bridge to FR-DD-EDU-001: in teams mode the same coach output
becomes the after-action teaching summary.
