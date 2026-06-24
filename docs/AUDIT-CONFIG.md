# CAF audit config - DOM Defender

This is the CONFIG block for running the CyberOS Code Audit Framework
(`tools/caf/core/AUDIT.md`, v1.5.0) against this repo. Edit it before each run.
The framework reads CONFIG, recovers state from `docs/BACKLOG.md`, then works one
task at a time with evidence (rule R1) and a 3-strike circuit breaker (rule R6).

```
PROJECT_PATH:    ./
TECH_STACK:      Next.js 14 (App Router, TypeScript) / MongoDB (Mongoose 8) / NextAuth (Credentials, JWT) / Tailwind CSS / Web Audio API
PROJECT_PURPOSE: A browser survival game where the website is the game. Players patch web bugs (drifting elements, console errors, memory leaks) before a crash meter fills. Has accounts, a competitive daily + endless leaderboard, replays, a cosmetics economy, and a BYO-website sandbox.
MODE:            gated
LOOP_BUDGET:     3
DEPTH:           standard
SEVERITY_FLOOR:  Medium
PROTECTED_AREAS: components/game/Game.tsx (core loop timing + render); lib/game/dailySeed.ts (changing the PRNG invalidates every historical daily comparison - behavior must be preserved); the public JSON response shapes of /api/scores, /api/leaderboard, /api/replays consumed by the client.
RUN_COMMANDS:    install: npm install | dev: npm run dev | build: npm run build | lint: npm run lint | typecheck: npx tsc --noEmit | test: npm test (test runner added in L1-T5)
DOMAIN_NOTES:    Competitive leaderboard => integrity is the top concern, above crashes. Feature flags must fail closed: Stripe, BYO, and analytics are off until env + creds are present. BYO renders third-party sites in a sandboxed iframe; the server does NOT fetch BYO URLs today - keep it that way to avoid SSRF. Secrets live in .env.local (never commit). bcrypt cost 10.
BENCHMARK_MODE:  none
COMPARATORS:     none
```

## How to run

On the Mac, from the repo root, on a dedicated branch:

```
git checkout -b auto/caf-loop-1
# Open the CAF protocol and this CONFIG in your agent, then run a gated loop.
# The agent recovers state from docs/BACKLOG.md and works one task at a time.
```

Gated mode pauses after Phase 2 (the backlog) for human approval before it edits code.
Loop 1 discovery is already written to `docs/BACKLOG.md`; the next run resumes at the
first OPEN task there (recommended order: L1-T2, L1-T5, then L1-T1, L1-T3, L1-T4).

## Why these settings

- Severity floor Medium, not High: the codebase is small and pre-launch, so the
  Medium items (rate limits, the coin race, the daily seed) are cheap to fix now
  and expensive to fix after users exist.
- Protected areas pin the two things a refactor must never silently change: the
  daily PRNG (fairness across days) and the client-facing API shapes.
- Benchmark mode none: there is no public, relevant performance benchmark for an
  indie web game, so all targets are internal (CAF rule R2).
