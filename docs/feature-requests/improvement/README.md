# DOM Defender improvement program

This folder turns `docs/strategy/production-and-monetization-audit-2026-07-06.md` into an executable backlog. Every correction (C1-C9), recommendation (R1-R38), and monetization move (M1-M13) from that report maps to exactly one task here, except M11 (display ads on the main domain), which the report rejects; that rejection is doctrine, so no task exists for it.

## Structure

- `BACKLOG.md` - the master table: 52 tasks, DD-A01 through DD-D05, across four phases. Status lives here and only here.
- `phases/phase-A.md` .. `phases/phase-D.md` - the detailed task cards (why, files, steps, acceptance, verify).
- `LEDGER.md` - append-only evidence log. Every DONE task gets a ledger entry with raw command output; every review gets a verdict entry.
- `PROMPT.md` - two ready-to-paste prompts: prompt A triggers an implementation agent, prompt B runs the human (or agent-assisted) review. Stephen fires these when ready.

## Phases

- Phase A - ship blockers and public-safety minimum (13 tasks, ~50 h). The launch gate: integrity default, deploy, legal minimum, bot defense.
- Phase B - launch runway (20 tasks, ~151 h). Mobile input, account lifecycle, moderation, analytics, test depth, launch content.
- Phase C - post-launch: integrity v2 and revenue rails (14 tasks, ~129 h). Re-simulation anti-cheat, ops hardening, the billing provider, B2B and sponsor surfaces.
- Phase D - scale bets (5 tasks, ~90 h). Season pass, portal build, education kit, desktop wrapper, determinism corpus.

Inside a phase, tasks run top to bottom unless the Depends column says otherwise. Phases are strict: do not start B while an A task is OPEN or IN-PROGRESS (BLOCKED and GATED-on-Stephen tasks do not hold a phase closed, but they must be listed in the phase-exit ledger entry).

## Rules of engagement

The working protocol is `AGENTS.md` (AUTO_WORK): dedicated branch, one task per commit, evidence gate before every commit (`npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`), circuit breaker after 3 failed verifies. This program adds:

1. Base branch. Until DD-A02 (merge to main) is done, improvement branches fork from `auto/next-16-migration`, which holds the newest code. After DD-A02, fork from `main`.
2. Status set, closed: OPEN, IN-PROGRESS, DONE, BLOCKED. Tasks a machine cannot finish alone carry a Gate note naming what Stephen must provide (account, secret, decision, push). An agent hitting a gate marks the task BLOCKED with the gate as the reason and moves on; it never waits.
3. Owner column: `agent` (machine-completable), `stephen` (business or operator action), `mixed` (agent builds, Stephen supplies credentials or judgment).
4. Evidence or it did not happen. A DONE without a ledger entry containing raw output is treated as OPEN by the next loop.
5. Protected areas from `docs/AUDIT-CONFIG.md` still apply (daily-seed PRNG, public API response shapes) unless a task card says otherwise, and DD-C01 explicitly does.
6. Money and irreversibles stay human: push, deploy, secrets, paid flags, purchases, emails to real users.

## Source mapping

Audit item to task: C1>A01, C2>A03, C3>A02, C4>C09, C5>D02, C6>A12, C7>A08+B08, C8>A13, C9>C08; R1-R10 > A01-A10 (see table), R11-R14 > C01-C04, R15>B17, R16-R20 > B03-B07, R21>B01, R22>B02, R23>B13, R24>B14, R25>B12, R26>B18, R27>B08, R28>B09, R29>B19, R30>C05, R31>C06, R32>C07, R33>B10, R34+R35>B11, R36>B15, R37>B16, R38>D05; M1>C09, M2>C12, M3>C13, M4>D01, M5>C10, M6>C11, M7>D02, M8>A11, M9>D03, M10>D04, M12>B20, M13>C14. M11: no task by design.
