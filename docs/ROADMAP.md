# DOM Defender - roadmap (harden, grow, launch)

This is the master plan for taking DOM Defender from a strong local prototype to a hardened,
public, growing game, run through CyberOS workflows. It sequences three goals into three
phases and points to the specs that drive each piece.

- Audit and hardening: the CAF backlog in `docs/BACKLOG.md` and the NFRs in
  `docs/non-functional-requirements/`.
- New features (community, social, AI, monetization, and the extras): the FRs in
  `docs/feature-requests/`.
- Marketing: the plan and assets in `docs/marketing/`.
- The working protocol for executing all of it: `AGENTS.md`.

## Where the project stands today

Next.js 14 (App Router, TypeScript) + MongoDB + NextAuth + Tailwind. About 6,200 lines across
14 API routes. Feature-rich already: accounts, daily + endless leaderboards, replays, a coin
and cosmetics economy, a Pro scaffold (Stripe not wired), and a BYO-website sandbox. Two git
commits, not deployed, no tests, no CI. Typecheck is clean; lint has 2 warnings; `npm audit`
reports 11 advisories (1 critical, 6 high). Full evidence is in `docs/BACKLOG.md`.

The gap is not features. It is integrity, safety, and the absence of a test/CI gate - exactly
the things that must be true before you put marketing spend or a leaderboard in front of real
people.

## Each goal, mapped to a CyberOS workflow

| Your goal | CyberOS workflow | Artifact in this repo |
| --- | --- | --- |
| Deep audit, strengthen, harden | CAF (Code Audit Framework, gated loop) | `docs/AUDIT-CONFIG.md`, `docs/BACKLOG.md`, `docs/non-functional-requirements/` |
| Add features (community, social, AI, more) | FR specs -> AWH promote-to-done gate | `docs/feature-requests/` |
| Run real marketing | Content-led launch plan + assets | `docs/marketing/` |
| Execute all of it unattended | AUTO_WORK loop (branch, evidence, ledger, review) | `AGENTS.md` |

The loop is the same one you use in CyberOS: spec it (FR/NFR) or find it (CAF), build one task
on a dedicated branch, prove it with the evidence gate (lint, typecheck, test, build), commit,
repeat; the AWH gate is what promotes a task to done; AUTO_WORK keeps it moving and only stops
at a real fork or before pushing/deploying.

## Phase plan

### P0 - harden and launch (do this first, it is the launch gate)

Goal: nothing below ships to the public until this phase is done. Close the integrity and
security backlog, stand up the test/CI gate, then deploy.

1. NFR-DOM-005 - add the test runner and CI gate (enabling layer; everything else verifies
   against it). Closes L1-T5, L1-T10.
2. L1-T2 - fix the 11 npm advisories (pin Next 14.2.x patched, update next-auth/postcss).
3. NFR-DOM-001 - server-authoritative scores via replay validation (the headline fix).
   Closes L1-T1.
4. NFR-DOM-003 - auth + registration throttle and password policy. Closes L1-T3, L1-T11.
5. NFR-DOM-004 - response security headers. Closes L1-T4.
6. NFR-DOM-002 - BYO trusted-IP rate limit, keep zero server-side fetch. Closes L1-T6.
7. The remaining Medium tasks: per-user score rate limit (L1-T7), daily seed server-derived
   (L1-T8), coin-purchase race fix (L1-T9). Then deploy (see below).

Launch gate (definition of done for P0): CI green; `npm audit` shows 0 high/critical; a forged
score POST is rejected; login and register are throttled; the five security headers are present
on the deployed URL; the game is live on a real domain with backups on. Only then does the
marketing in P1 start.

### P1 - retention, growth, and the public launch

Build the loops that keep and spread players, and run the content-led launch.

- Community: FR-DD-COMM-001 public profiles (the anchor everything attaches to), then
  friends/follow (-002) and replay reactions (-004).
- Social: FR-DD-SOC-001 friend challenge links + FR-DD-SOC-002 per-run OG images (the viral
  pair), then weekly tournaments (-003).
- AI: FR-DD-AI-001 adaptive bug director (endless only, daily stays deterministic), then the
  AI replay coach (-002).
- Reach: FR-DD-REACH-001 mobile/touch (most social traffic is mobile), -002 i18n (English +
  Vietnamese), -003 accessibility.
- Marketing: run the launch plan in `docs/marketing/` - Product Hunt, Hacker News (Show HN),
  the web-dev subreddits, a short-form video, and the "a game for web developers" angle.

### P2 - monetization and scale

Turn the audience into revenue and depth.

- Monetization: FR-DD-MON-001 Stripe Pro checkout (turn on the scaffold), then Pro modes and
  cosmetics (-002), supporter coin packs (-003).
- Depth: seasons + weekly modifiers (FR-DD-OPS-001), challenge builder / UGC (FR-DD-UGC-001).
- Strategic: FR-DD-EDU-001 "DOM Defender for teams" - the dev-onboarding / workshop mode that
  makes the game a lead magnet for CyberSkill. This is the bet that connects the game to your
  goal of scaling the consultancy globally.
- Growth: a small paid test (Reddit or X) only after the landing page's organic conversion is
  proven. See the marketing plan.

## Deploy plan (P0, before any marketing)

- Host: Vercel (native Next.js 14 App Router). Database: MongoDB Atlas free or shared tier.
- Env / secrets: set `MONGODB_URI`, `NEXTAUTH_SECRET` (generate fresh, never reuse the dev
  one), `NEXTAUTH_URL` to the production domain. Keep all paid/third-party flags off
  (`PRO_BILLING_ENABLED=false`, no Stripe keys, analytics webhook optional) until their FRs
  land. The fail-closed contract in the README already enforces this.
- Domain: a dedicated domain or a subdomain (for example a CyberSkill subdomain) with HTTPS,
  which also satisfies the HSTS part of NFR-DOM-004.
- Backups: enable Atlas automated backups before opening signups.
- Monitoring: add error reporting (L1-T13) behind an env flag so production failures are
  visible from day one.

## How to run this roadmap

On the Mac, one task at a time, under `AGENTS.md`:

```
git checkout -b auto/p0-harden
# CAF gated loop against docs/AUDIT-CONFIG.md, resuming from docs/BACKLOG.md.
# One task: implement -> run its verify command -> commit. Repeat. Stop only at a real
# fork or before push/deploy.
```

P0 is a CAF loop over the backlog. P1 and P2 are FR builds promoted through the same evidence
gate. The order inside each phase is set by the dependency edges in the FR and NFR catalogs,
so the build order is already decided; the next agent just resumes from the first OPEN item.

## One-screen summary

Harden first (P0): integrity, security, CI, deploy - this is the launch gate. Then grow (P1):
profiles, challenges, an adaptive AI director, mobile and Vietnamese, run the content-led
launch. Then earn and scale (P2): Stripe Pro, seasons, and the teams/education mode that turns
the game into a CyberSkill funnel. Every step is a spec with a verify command, run through the
same AUTO_WORK loop you already use.
