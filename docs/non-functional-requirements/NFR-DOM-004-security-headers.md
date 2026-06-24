---
id: NFR-DOM-004
title: "Response security headers"
category: Security
status: proposed
verify: T
owner: Stephen Cheng
created: 2026-06-24
closes: [L1-T4]
related: [FR-DD-MON-001]
source:
  - next.config.mjs (no headers() block today)
  - components/BYOGame.tsx (BYO renders third-party sites in a sandboxed iframe)
---

## Target

The app MUST send, on every response, a baseline header set:

- `Content-Security-Policy` (start in report-only, then enforce)
- `X-Frame-Options: DENY` and a CSP `frame-ancestors 'self'` so the game's own pages cannot
  be framed (clickjacking)
- `Strict-Transport-Security` (HSTS) once on HTTPS
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` locking down camera, microphone, geolocation, and similar

## Why

`next.config.mjs` sets no headers. For a normal site this is a should-fix; here it is sharper
because BYO embeds third-party pages in an iframe, and the app is heading toward a paid flow
(FR-DD-MON-001) where HSTS and a tight CSP are expected baseline. The CSP must be written so
the game's own scripts and the sandboxed BYO iframe both keep working - hence report-only
first, then enforce after watching the report stream.

## Acceptance and verification

1. All five headers are present on a deployed response.
2. The CSP does not break the game or the BYO iframe (no console CSP violations in normal
   play after enforce).
3. The app's own pages cannot be embedded in a foreign frame.

```
# verify (operator, against the deployed URL)
curl -sI https://<deploy-url> | grep -iE "content-security-policy|strict-transport|x-frame|referrer-policy|permissions-policy"
```

## Notes

Implement via `headers()` in `next.config.mjs`. Roll the CSP out report-only, collect a few
days of reports, then switch to enforce. Recorded UNMEASURED in the audit because the sandbox
cannot run a deployed `curl`; this is verified at deploy time.
