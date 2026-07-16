---
id: TASK-DD-MON-001
title: "Stripe Pro checkout - turn on the existing Pro scaffold"
lane: MON
priority: MUST
status: draft
verify: T
phase: P2
milestone: P2 - monetization slice 1
owner: Stephen Cheng
created: 2026-06-24
related_frs: [TASK-DD-MON-002, TASK-DD-MON-003]
depends_on: [NFR-DOM-001, NFR-DOM-004]   # trustworthy scores + secure headers before taking money
blocks: [TASK-DD-MON-002, TASK-DD-MON-003]

# Source contracts
source_decisions:
  - README.md (feature-flag contract: ship with the flag off, fail closed if creds missing)
  - app/api/shop/purchase/route.ts (usd path is a stub today; returns 503 until Stripe is set)
  - lib/pro.ts (isProBillingEnabled, requirePro guard)
  - models/User.ts, models/ProWaitlist.ts (pro state + existing waitlist)

# Build envelope
language: typescript
new_files:
  - app/api/billing/webhook/route.ts   # Stripe webhook: mark Pro active/canceled
  - lib/stripe.ts                       # server-side Stripe client (lazy, env-gated)
  - tests/billing.test.ts
modified_files:
  - app/api/shop/purchase/route.ts      # usd path returns a real Checkout Session URL
  - lib/pro.ts                          # resolve Pro state from the subscription record
  - models/User.ts                      # proSince, proStatus, stripeCustomerId
  - .env.local.example                  # document STRIPE_* vars (no real values)
allowed_tools:
  - file_read: app/**, lib/**, models/**
  - file_write: app/api/billing/**, lib/stripe.ts, app/api/shop/purchase/route.ts, lib/pro.ts, models/User.ts, tests/**, .env.local.example
  - bash: npm test, npx tsc --noEmit, npm run lint
disallowed_tools:
  - enable the path without verifying the Stripe webhook signature (forged webhooks must be rejected)
  - grant Pro from the client; Pro is granted only by a verified webhook event
  - commit any real STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET

effort_hours: 12
risk_if_skipped: "The Pro tier is a scaffold collecting waitlist emails with no way to charge. There is no revenue path. The waitlist exists precisely so this task can convert it; leaving it stubbed means the audience built in P1 cannot be monetized."
---

## Section 1 - behavior

Wire Stripe Checkout behind the existing `PRO_BILLING_ENABLED` flag, keeping the fail-closed
contract: when the flag is off or `STRIPE_SECRET_KEY` is missing, the usd path keeps returning
503 and the UI points to the waitlist (today's behavior). When configured, `POST /api/shop/
purchase` with `method: "usd"` creates a Stripe Checkout Session and returns its URL.

A webhook at `/api/billing/webhook` verifies the Stripe signature and, on
`checkout.session.completed` / subscription events, sets the user's Pro state. Pro is granted
only by a verified webhook, never by the client. `requirePro()` in `lib/pro.ts` then resolves
against the stored subscription state and gates Pro cosmetics and modes (TASK-DD-MON-002).

## Section 4 - acceptance criteria

1. Flag off or key missing: usd purchase returns 503 with the waitlist pointer (unchanged).
2. Flag on + key set: usd purchase returns a valid Checkout Session URL.
3. A webhook with a bad or missing signature is rejected with 400 and grants nothing.
   Verified by `billing.test.ts`.
4. A valid `checkout.session.completed` marks the user Pro; a cancellation clears it.
5. Pro can never be set from a client request - only from a verified webhook (test asserts).
6. `npx tsc --noEmit`, `npm run lint`, `npm test` clean. No secret committed.

## Section 5 - test plan

- Unit: signature verification rejects forged payloads; the grant/revoke reducer maps events
  to Pro state correctly.
- Integration: full path with the flag off (503) and on (session URL); webhook grant then
  the user reads as Pro through `requirePro`.

## Section 7 - dependencies and notes

Phase P2, after the P0 hardening and a P1 audience exist. Depends on NFR-DOM-001 (do not sell
status on a fakeable leaderboard) and NFR-DOM-004 (security headers / HSTS before taking
card flows, even though Stripe hosts the card form). Test mode end to end with Stripe test
keys before the flag is flipped in production; flipping the flag is an operator action
(a stop condition under AGENTS.md).
