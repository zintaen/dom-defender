# DOM Defender - non-functional requirement catalog

NFRs are the measurable hardening guarantees behind the CAF backlog. Each one names a target
you can verify with a command. As of 2026-06-24 all eight are written in full. The CAF task
each NFR closes (where applicable) is in the last column.

| ID | Category | Status | Title | Closes |
| --- | --- | --- | --- | --- |
| NFR-DOM-001 | Integrity | spec written | Server-authoritative scores via replay validation | L1-T1 |
| NFR-DOM-002 | Security | spec written | BYO safety: trusted client IP + no server-side fetch | L1-T6 |
| NFR-DOM-003 | Security | spec written | Auth brute-force + registration throttle | L1-T3, L1-T11 |
| NFR-DOM-004 | Security | spec written | Response security headers | L1-T4 |
| NFR-DOM-005 | Quality | spec written | CI gate: lint + typecheck + test + build green | L1-T5, L1-T10 |
| NFR-DOM-006 | Performance | spec written | Bundle + route size budget enforced in CI | L1-T12 |
| NFR-DOM-007 | Safety | spec written | Moderation for user text (profiles, comments) | (FR-DD-COMM-004) |
| NFR-DOM-008 | Accessibility | spec written | WCAG-aligned: keyboard play, reduced-motion, contrast | (FR-DD-REACH-003) |

Rule: a feature FR that depends on an NFR cannot ship until that NFR is done. The dependency
edges are in `docs/feature-requests/BACKLOG.md`. Note the shared building block: NFR-DOM-003
defines the rate-limit primitive that NFR-DOM-002, NFR-DOM-007, and the per-user score limit
(L1-T7) all reuse - build it once.
