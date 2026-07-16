---
id: NFR-DOM-002
title: "BYO safety: trusted client IP for rate limits, no server-side fetch"
category: Security
status: proposed
verify: T
owner: Stephen Cheng
created: 2026-06-24
closes: [L1-T6]
related: [TASK-DD-AI-003]
source:
  - app/api/byo-attempt/route.ts (rate limit keyed on x-forwarded-for first hop)
  - lib/game/byoValidator.ts (allow/deny + private-IP rejection)
---

## Target

- The BYO rate limit MUST key on the platform-verified client IP, not a raw
  `x-forwarded-for` first hop that a client can set when not strictly behind a trusted proxy.
- The server MUST NOT fetch BYO URLs. Validation stays allow/deny only; the third-party page
  loads in the client's sandboxed iframe. This keeps the SSRF surface at zero.
- Private, loopback, and link-local hosts MUST stay rejected (today's behavior, kept under test).

## Why

The current rate limit reads `x-forwarded-for.split(",")[0]`, which is attacker-controlled
outside a trusted proxy, so the 30-per-10-minutes guard is bypassable. The good news is the
server never fetches the URL, so there is no classic SSRF today; the requirement is to keep
it that way as AI BYO analysis (TASK-DD-AI-003) is built, since that feature is the obvious
place a server-side fetch would sneak in.

## Acceptance and verification

1. On the deploy platform, the rate limit uses the verified client IP; a spoofed
   `x-forwarded-for` does not reset or evade the counter.
2. No code path performs a server-side fetch of a user-supplied BYO URL.
3. Private / loopback / link-local hosts remain rejected (regression test on `byoValidator`).

```
# verify
npm test -- byo-ratelimit byo-validator
grep -rn "fetch(" app/api/byo-attempt app/api/**/byo* lib/game/byoValidator.ts   # expect no user-URL fetch
```

## Notes

When TASK-DD-AI-003 (AI BYO analysis) lands, the analysis MUST run on signals the client already
has or on a separately sandboxed, allow-listed fetch service - never an unbounded server fetch
of the pasted URL. Document that decision in that task before building it.
