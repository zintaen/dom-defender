---
id: NFR-DOM-005
title: "CI gate: lint + typecheck + test + build green on every push"
category: Quality
status: proposed
verify: T
owner: Stephen Cheng
created: 2026-06-24
closes: [L1-T5, L1-T10]
related: [NFR-DOM-006]
source:
  - no .github/workflows today
  - package.json (no test script today)
---

## Target

- A CI workflow MUST run on every push and pull request and block merge unless lint,
  typecheck, unit tests, and the production build all pass.
- A test runner MUST be added (`npm test`) with unit coverage for the determinism-critical
  and integrity-critical units: `dailySeed`, `byoValidator`, `achievements`, the score
  validator (NFR-DOM-001), and cosmetic prerequisites.
- A pre-commit hook SHOULD run lint + typecheck locally so red never reaches CI.

## Why

There are no tests and no CI. The AWH promote-to-done gate in CyberOS is exactly this: nothing
ships until the gate is green. Without it, every hardening fix and every feature is unverified,
and the AUTO_WORK loop has nothing to check against. This NFR is the enabling layer for the
whole roadmap, which is why the backlog runs it second (right after the dependency CVEs).

## Acceptance and verification

1. `.github/workflows/ci.yml` runs lint, typecheck, test, build on push and PR.
2. `npm test` exists and the seed/validator/achievements/score/cosmetics units pass.
3. A PR that breaks any gate cannot be merged (branch protection on `main`).

```
# verify
npm run lint && npx tsc --noEmit && npm test && npm run build
# and: CI shows a required, green check on a test PR
```

## Notes

Vitest is a light fit for this stack. Keep the first test set small and high-signal - the
five units above - then grow coverage as features land. Pair with branch protection so the
gate is actually enforcing, not advisory.
