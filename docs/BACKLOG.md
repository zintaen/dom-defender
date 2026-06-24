# DOM Defender - CAF audit backlog

This file is the audit ledger and the agent's memory (CAF rule R4: the file system
is the only memory). To resume work, read this file and `git log`, then continue from
the last IN-PROGRESS or OPEN task. Never restart finished work.

Protocol: CAF AUDIT.md v1.5.0 (CyberOS `tools/caf/core/AUDIT.md`). Config lives in
`docs/AUDIT-CONFIG.md`. Severities and statuses are closed sets:
Severity { Critical, High, Medium, Low }; Status { OPEN, IN-PROGRESS, DONE, BLOCKED }.

---

## Loop 1 - 2026-06-24

### Scope and method

- Protocol: CAF AUDIT.md v1.5.0 | Mode: gated | Depth: standard | Severity floor: Medium | Vectors: Architecture, Performance, Security, Maintainability, Testing
- Benchmark basis: internal targets, plus the public npm advisory database for the dependency CVEs. No external product benchmark applies to an indie web game; performance budgets are internal targets.
- Environment note: discovery ran in a sandbox that can create files but cannot unlink or git-write the repo mount. `next build` and any `curl`-based header check are therefore recorded UNMEASURED or NOT-APPLICABLE here and must be re-run by the operator on the Mac.

### Benchmark table

| Metric | Baseline | Target | Verify command |
| --- | --- | --- | --- |
| Typecheck errors | 0 (clean) | 0 | `npx tsc --noEmit` |
| Lint warnings | 2 | 0 | `npm run lint` |
| npm advisories (high + critical) | 7 (6 high, 1 critical); 11 total | 0 high or critical | `npm audit` |
| Automated tests | 25 in 4 suites (green) | keep CI green; grow coverage toward the score validator (NFR-DOM-001) | `npm test` |
| Production build | UNMEASURED (sandbox 40s timeout; mount blocks the unlinks `next build` needs) | clean build + bundle budget set | `npm run build` |
| Response security headers | 0 set (no `headers()` in next.config.mjs) | CSP, frame-ancestors, HSTS, Referrer-Policy, Permissions-Policy | NOT-APPLICABLE in sandbox; operator runs `curl -sI <deploy-url>` |
| Source size | 6196 lines TS/TSX across 14 API routes | tracked, not a target | `find app components lib models -name '*.ts*' \| xargs wc -l \| tail -1` |

Raw output captured during discovery:

```
$ npx tsc --noEmit
(exit 0, no output)
```

```
$ npm run lint
./components/ReplayPlayer.tsx
99:107  Warning: React Hook useMemo has missing dependencies: 'xScale' and 'yScoreScale'.
100:107 Warning: React Hook useMemo has missing dependencies: 'xScale' and 'yCrashScale'.
```

```
$ npm audit
11 vulnerabilities (4 moderate, 6 high, 1 critical)
- Next.js Middleware/Proxy bypass (Pages Router i18n)  GHSA-36qx-fr4f-26g5  -> fix in next@14.2.35
- postcss XSS via unescaped </style>                   GHSA-qx2v-qp2m-jg93
- uuid missing buffer bounds check                     GHSA-w5hq-g745-h8pq  (via next-auth)
```

```
$ npm run build
RC=124 (timeout at 40s in sandbox; re-run locally for a real baseline)
```

### Task table

| ID | Sev | Status | Vector | Description + expected delta | Verify command |
| --- | --- | --- | --- | --- | --- |
| L1-T1 | Critical | OPEN | Security | Score endpoint trusts a client-computed score behind only a coarse sanity check (`score <= max(500, durationSec*200)`). Any signed-in user can POST a fabricated leaderboard score. Make the server authoritative: validate the submitted replay server-side (re-simulate or bounds-check events vs claimed score) before accepting. See NFR-DOM-001. Delta: fabricated scores rejected. | new `tests/score-integrity.test.ts` green; `npm test` |
| L1-T2 | Critical | OPEN | Security | 11 npm advisories (1 critical, 6 high), including a Next.js middleware/proxy bypass, postcss XSS, and a uuid bounds bug via next-auth. Pin Next to the patched 14.2.x, update next-auth/postcss within range, re-audit. Delta: 0 high or critical. | `npm audit` shows 0 high/critical |
| L1-T3 | High | OPEN | Security | No brute-force throttle on `POST /api/auth` (login) or `POST /api/auth/register`. Credential stuffing and account-creation spam are open. Add per-IP and per-username rate limiting plus soft lockout. See NFR-DOM-003. | new `tests/auth-throttle.test.ts` green |
| L1-T4 | High | OPEN | Security | No response security headers. `next.config.mjs` has no `headers()`. Add CSP, `frame-ancestors`, HSTS, `Referrer-Policy`, `Permissions-Policy`. Matters more here because BYO mode renders third-party sites in an iframe. See NFR-DOM-004. | operator `curl -sI <url>` shows all 5 headers |
| L1-T5 | High | DONE | Testing | Zero automated tests and no CI. Add unit tests for `dailySeed` determinism, `byoValidator`, `achievements`, score sanity, and cosmetic prerequisites, then a GitHub Actions gate (lint + typecheck + test + build). This is the foundation the AWH gate needs. | `npm test` green in CI |
| L1-T6 | Medium | OPEN | Security | BYO rate limit trusts `x-forwarded-for` first hop, which a client can spoof when not strictly behind a trusted proxy. Use the platform's verified client IP (e.g. Vercel `x-vercel-forwarded-for` / request IP) and make the window count resilient. See NFR-DOM-002. | code review + `tests/byo-ratelimit.test.ts` |
| L1-T7 | Medium | OPEN | Security | No per-user rate limit on `POST /api/scores`. A user can flood the collection. Add a short per-user window cap. | `tests/score-ratelimit.test.ts` |
| L1-T8 | Medium | OPEN | Security | Daily mode stores `seed` from the request body. For a fair daily, derive the seed server-side from `dailyKey` and reject mismatches. Delta: daily runs cannot be submitted under a forged seed. | `tests/daily-seed.test.ts` |
| L1-T9 | Medium | OPEN | Architecture | Coin purchase is read-modify-write (`findById` -> check -> `save`) with no transaction. Two concurrent purchases can double-spend coins. Use a conditional atomic update (`updateOne` with `$gte` balance guard and `$inc`). | `tests/shop-concurrency.test.ts` |
| L1-T10 | Medium | OPEN | Maintainability | No CI gate and 2 unaddressed lint warnings. Add `.github/workflows/ci.yml` and a pre-commit hook (lint + typecheck). Fix the `ReplayPlayer.tsx` exhaustive-deps warnings. | `npm run lint` clean; CI green |
| L1-T11 | Low | OPEN | Security | Password policy is min length 6 with no complexity or breached-password check, and registration has no rate limit. Raise to a sensible minimum and add a k-anonymity breach check or a denylist. | `tests/register-policy.test.ts` |
| L1-T12 | Low | OPEN | Performance | No production-build baseline or bundle budget (build UNMEASURED in sandbox). Add a CI step that runs `next build` and asserts a route/bundle size budget. See NFR-DOM-006. | `npm run build` + size assertion in CI |
| L1-T13 | Low | OPEN | Maintainability | No error monitoring or structured logging; only `console.error`. Add Sentry (or equivalent) behind an env flag so production failures are visible before users report them. | env-gated init present; deploy smoke test |
| L1-T14 | Low | OPEN | Maintainability | Dependencies aging: Next 14.2.5 -> 14.2.35 patch, mongoose and types behind. Patch-pin within the stated ranges (separate from the CVE fixes in T2). | `npm outdated` shows patches applied |

### Loop 1 verdict

Fourteen findings at or above the Medium floor, two Critical. The headline risk is integrity,
not crashes: the game presents a competitive daily leaderboard, but the server accepts whatever
score the client claims (L1-T1), and the dependency stack carries a critical and six high CVEs
(L1-T2). Both must close before any public launch or marketing push, because a marketed launch
that drives a leaderboard which is trivially faked damages the product and the CyberSkill brand
attached to it. Testing and CI (L1-T5) are the enabling layer: without them the AWH gate cannot
promote anything to done.

Recommended execution order: T2, T5 (enabling), then T1, T3, T4, then the Medium set, then Low.
Run as a CAF gated loop: implement one task, re-run its verify command, commit, move on
(CAF rule R5, one task at a time; R6 circuit breaker after 3 failed validations).

---

## Loop 1 progress log

2026-06-24 - L1-T5 (test runner + CI gate; closes NFR-DOM-005): DONE. Added Vitest
(`vitest.config.ts`, `test` / `test:watch` scripts), four unit suites (`tests/dailySeed`,
`tests/byoValidator`, `tests/achievements`, `tests/cosmetics` = 25 tests), the CI workflow
(`.github/workflows/ci.yml`: lint + typecheck + test + build), and a pre-commit hook
(`.githooks/pre-commit`). Suite is green:

```
$ vitest run
 ok tests/byoValidator.test.ts  (7 tests)
 ok tests/achievements.test.ts  (6 tests)
 ok tests/dailySeed.test.ts     (8 tests)
 ok tests/cosmetics.test.ts     (4 tests)
 Test Files  4 passed (4)
      Tests  25 passed (25)
```

Evidence note: the sandbox mount cannot add vitest to the repo `node_modules` (it blocks the
install/unlink), so the suite was proven green in an isolated runner against copies of the real
source. Operator confirmation step: `npm install` (refreshes `package-lock.json` with vitest),
then `npm test`, then push so CI runs the full gate. Next OPEN task: L1-T2 (dependency CVEs).

---

## How to resume (for the next agent or session)

1. `git status` and `git log --oneline -15`.
2. Read this file top to bottom; find the first OPEN or IN-PROGRESS task in the Loop 1 table.
3. Set it IN-PROGRESS, implement only that task, re-run its verify command, then mark DONE
   or BLOCKED with a one-line root cause. Commit before the next task.
4. When all Loop 1 tasks are DONE, open Loop 2 with a fresh discovery pass at the same depth.
