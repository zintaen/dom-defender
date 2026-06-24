# DOM Defender - feature-request catalog

Feature work, specced as CyberOS FRs. Each FR is a build contract with a verify gate.
Status values: spec written (full FR exists in the lane folder) or OPEN (a row to expand
before building). Priority is MUST / SHOULD / COULD. Phase maps to `docs/ROADMAP.md`:
P0 harden + launch, P1 retention + growth features, P2 monetization + scale.

As of 2026-06-24 the full P1 build wave is specced: every P1 row below is "spec written".
The remaining OPEN rows are P2 / COULD and get expanded when their phase arrives.

Build order rule: no feature FR is promoted to done until the P0 hardening NFRs that it
depends on are done. The big one is NFR-DOM-001 (server-authoritative scores): social,
tournament, teams, and monetization features that surface or reward leaderboard rank are
meaningless on a fakeable leaderboard.

## Lane: community (COMM)

| ID | Pri | Phase | Status | Title | Depends on |
| --- | --- | --- | --- | --- | --- |
| FR-DD-COMM-001 | MUST | P1 | spec written | Public player profiles at /u/[username] | - |
| FR-DD-COMM-002 | SHOULD | P1 | spec written | Friends / follow + a following feed | FR-DD-COMM-001 |
| FR-DD-COMM-003 | COULD | P2 | OPEN | Guilds / teams with a team leaderboard | FR-DD-COMM-001, FR-DD-COMM-002 |
| FR-DD-COMM-004 | SHOULD | P1 | spec written | Reactions + comments on shared replays | FR-DD-COMM-001, NFR-DOM-007 |

## Lane: social and viral (SOC)

| ID | Pri | Phase | Status | Title | Depends on |
| --- | --- | --- | --- | --- | --- |
| FR-DD-SOC-001 | MUST | P1 | spec written | Friend challenge links (beat-my-seed) | NFR-DOM-001 |
| FR-DD-SOC-002 | MUST | P1 | spec written | Share cards v2 + per-run OG images for link unfurls | FR-DD-SOC-001 |
| FR-DD-SOC-003 | SHOULD | P1 | spec written | Weekly tournament with its own seed + ranked board | NFR-DOM-001 |
| FR-DD-SOC-004 | COULD | P2 | OPEN | Referral rewards (coins for inviting a player who plays) | FR-DD-COMM-001 |

## Lane: AI (AI)

| ID | Pri | Phase | Status | Title | Depends on |
| --- | --- | --- | --- | --- | --- |
| FR-DD-AI-001 | MUST | P1 | spec written | Adaptive bug director (endless only; daily stays deterministic) | - |
| FR-DD-AI-002 | SHOULD | P1 | spec written | AI replay coach: review a run, suggest 3 concrete improvements | FR-DD-AI-001 |
| FR-DD-AI-003 | SHOULD | P2 | OPEN | AI BYO analysis: turn a real site's issues into a themed bug wave | NFR-DOM-002 |
| FR-DD-AI-004 | COULD | P2 | OPEN | AI-written daily flavor text + boss taunts (cosmetic, cached) | - |

## Lane: monetization (MON)

| ID | Pri | Phase | Status | Title | Depends on |
| --- | --- | --- | --- | --- | --- |
| FR-DD-MON-001 | MUST | P2 | spec written | Stripe Pro checkout (turn on the existing scaffold) | NFR-DOM-001, NFR-DOM-004 |
| FR-DD-MON-002 | SHOULD | P2 | OPEN | Pro-only modes + cosmetics gating | FR-DD-MON-001 |
| FR-DD-MON-003 | COULD | P2 | OPEN | One-time supporter coin packs | FR-DD-MON-001 |

## Lane: reach (REACH)

| ID | Pri | Phase | Status | Title | Depends on |
| --- | --- | --- | --- | --- | --- |
| FR-DD-REACH-001 | MUST | P1 | spec written | Mobile / touch support | - |
| FR-DD-REACH-002 | SHOULD | P1 | spec written | i18n: English + Vietnamese | - |
| FR-DD-REACH-003 | SHOULD | P1 | spec written | Accessibility pass (keyboard play, reduced-motion, contrast) | NFR-DOM-008 |

## Lane: education / B2B (EDU)

| ID | Pri | Phase | Status | Title | Depends on |
| --- | --- | --- | --- | --- | --- |
| FR-DD-EDU-001 | SHOULD | P1 | spec written | "DOM Defender for teams" - workshop / onboarding mode (CyberSkill funnel) | NFR-DOM-001, FR-DD-COMM-001 |

## Lane: live ops (OPS)

| ID | Pri | Phase | Status | Title | Depends on |
| --- | --- | --- | --- | --- | --- |
| FR-DD-OPS-001 | SHOULD | P2 | OPEN | Seasons + rotating weekly modifiers | FR-DD-SOC-003 |

## Lane: user-generated content (UGC)

| ID | Pri | Phase | Status | Title | Depends on |
| --- | --- | --- | --- | --- | --- |
| FR-DD-UGC-001 | COULD | P2 | OPEN | Challenge builder / custom bug packs | FR-DD-COMM-001 |

## Why these extra lanes exist

The REACH lane came straight out of the audit: the game is desktop-only and English-only, and
most social traffic is mobile and a large share of the warm audience is Vietnamese. The EDU lane
is the strongest strategic bet: it turns the game into a top-of-funnel asset for CyberSkill
rather than only a standalone game, which is the point of doing all this rather than just
shipping a game.

## How to expand an OPEN row into a full FR

Copy the frontmatter and section structure from any spec-written FR in this folder (for
example `ai/FR-DD-AI-001-adaptive-bug-director.md`), fill the build envelope (new_files,
modified_files, allowed_tools), write the acceptance criteria and the test plan, then run it
through the same evidence gate as the hardening tasks.
