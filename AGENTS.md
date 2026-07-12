# AGENTS.md - DOM Defender working protocol

Working rules for any AI agent (or person) operating on this repo under the
CyberOS AUTO_WORK model. An explicit instruction in the active session overrides
this file; this file overrides assistant defaults.

## What this project is

DOM Defender is a fullstack browser game built with Next.js 14 (App Router,
TypeScript), MongoDB via Mongoose, NextAuth (credentials, JWT), and Tailwind.
The website is the game: players patch web bugs before a crash meter fills.
It has accounts, a competitive daily and endless leaderboard, replays, a coin
+ cosmetics economy, a Pro tier scaffold (Stripe not wired), and a BYO-website
sandbox. Source is about 6,200 lines across 14 API routes. See `README.md`.

## The three sources of truth

1. `docs/BACKLOG.md` - the CAF audit ledger and the agent's memory. Hardening
   and quality work is tracked here as severity-weighted tasks (L1-Tn).
2. `docs/feature-requests/` - FR specs for new features (community, social, AI,
   monetization, and more). Each FR is a build contract.
3. `docs/non-functional-requirements/` - NFR specs for the hardening targets
   (score integrity, BYO safety, auth throttle, headers, CI, perf).

`docs/ROADMAP.md` sequences all of it into phases P0 -> P2.

## How work flows (AUTO_WORK)

1. Dedicated branch. Never work on `main`. Branch name `auto/<short-topic>`.
2. Pick exactly one task (a BACKLOG row or one FR/NFR) and mark it IN-PROGRESS.
3. Implement only that task. Keep changes local and reversible.
4. Evidence gate. Run the task's verify command and the project gate:
   `npm run lint` (clean), `npx tsc --noEmit` (clean), `npm test` (green once
   the runner lands in L1-T5), `npm run build` (clean). Paste the raw output
   into the commit or the ledger - no "verified by reading the code" (CAF R1).
5. Commit, then move to the next task. One task per commit.
6. Circuit breaker: if a task fails its verify command 3 times, revert it
   (git), mark it BLOCKED with a one-line root cause, and move on (CAF R6).

## Stop conditions

Run continuously through the queue. Stop and ask the operator only at a genuine
fork (two defensible designs with different consequences) or before any
irreversible or external action: `git push`, a deploy, enabling a paid flag,
rotating a secret, or anything that spends money or touches real users.

## Hard rules

- Never commit secrets. `.env.local` stays local. If a credential appears in a
  diff, stop and redact it as `[REDACTED:<kind>]`.
- Do not change behavior in the protected areas listed in `docs/AUDIT-CONFIG.md`
  (the daily seed PRNG and the public API response shapes) unless a task says so.
- Feature flags fail closed: Stripe, BYO billing, and analytics stay off until
  their env vars and credentials are set.
- The server must not fetch BYO URLs. BYO validation is allow/deny only; the
  third-party page loads in the client iframe, never server-side (SSRF guard).
- Integrity over everything: this game has a competitive leaderboard, so a fix
  that protects score integrity outranks a cosmetic or performance change.

## Quick commands

```
npm install            # deps
npm run dev            # local dev at http://localhost:3000
npm run lint           # eslint (must be clean before commit)
npx tsc --noEmit       # typecheck (must be clean before commit)
npm run build          # production build (must succeed before commit)
npm test               # unit tests (added in BACKLOG L1-T5)
```

---

# AGENTS.md

This repository runs **CyberOS**. Any coding agent working here follows these rules.
This file is the cross-tool spine; the full one-pager is `.cyberos/AGENT-ENTRY.md`.

1. Work = feature requests. Read `.cyberos/cuo/ship-feature-requests.md` and drive the
   next eligible FR in `docs/feature-requests/BACKLOG.md` (frontmatter `status` is the
   record of truth; one backlog for `class: product` and `class: improvement`).
2. HITL is required. Halt at review acceptance (`reviewing -> ready_to_test`) and final
   acceptance (`testing -> done`) for a recorded human verdict. Never set `done` yourself.
   Doctrine: `.cyberos/cuo/EXECUTION-DISCIPLINE.md`; lifecycle: `.cyberos/cuo/STATUS-REFERENCE.md`.
3. Gates: `bash .cyberos/cuo/gates/run-gates.sh` (reads `.cyberos/gates.env`). Green is
   necessary, never sufficient.
4. Memory (BRAIN): record decisions, audits, and plans into `.cyberos/memory/store/`
   per the protocol in `.cyberos/memory/AGENTS.md`.
5. Never push, deploy, merge, or delete without an explicit operator instruction.

<!-- cyberos-agent-spine (managed by cyberos init; edit above/below this marker) -->
