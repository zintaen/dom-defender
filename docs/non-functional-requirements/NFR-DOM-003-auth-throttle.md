---
id: NFR-DOM-003
title: "Auth brute-force and registration throttle"
category: Security
status: proposed
verify: T
owner: Stephen Cheng
created: 2026-06-24
closes: [L1-T3, L1-T11]
related: [NFR-DOM-001]
source:
  - lib/auth.ts (Credentials authorize: no attempt limiting)
  - app/api/auth/register/route.ts (min length 6, no complexity, no rate limit)
---

## Target

- Login MUST be throttled per IP and per username, with a soft lockout / backoff after a
  threshold of failures in a window.
- Registration MUST be rate limited per IP to stop account-creation spam.
- The password policy MUST require a sensible minimum and reject obviously weak or known-
  breached passwords (a denylist of the most common passwords is enough for v1; a k-anonymity
  breach check is the stronger form).

## Why

`authorize` does a bcrypt compare with no attempt counter, so credential stuffing is open.
Registration is unthrottled and accepts 6-character passwords with no complexity check, so
account spam and weak credentials are both easy. These are cheap to fix now and become an
incident once there are real accounts to target.

## Acceptance and verification

1. N failed logins for the same username or IP within the window trigger backoff/lockout;
   the right credentials still work after the window.
2. Rapid repeated registration from one IP is rate limited.
3. A password on the common-password denylist is rejected at registration.

```
# verify
npm test -- auth-throttle register-policy
```

## Notes

A small fixed-window or token-bucket limiter backed by Mongo (or an edge KV when scale
warrants) is enough; reuse the same limiter primitive for L1-T7 (score submission) and
NFR-DOM-002 (BYO). Build the limiter once, apply it in three places.
