# DOM Defender

A fullstack web survival game where the website *is* the game. You play a Webmaster patching CSS bugs, smashing console errors, and vacuuming memory leaks before the **Server Crash** meter hits 100%.

Built with **Next.js 14 (App Router) + MongoDB + NextAuth + Tailwind CSS**.

---

## Features

- **Three tools**: Duct Tape (drag drifting elements), Debugger (smash console popups), Garbage Collector (vacuum memory leaks). Hotkeys `1` `2` `3`.
- **Power-ups** mapped to `Q` `W` `E` `R`: Freeze, Auto-fix, Magnet, Shield.
- **Boss bugs** appear from wave 4 — three weak points, each requires a different tool.
- **Daily Challenge** with a deterministic seed (every player on a given day gets the same bug pattern, so the daily leaderboard is fair).
- **Endless mode** for free play.
- **Accounts** (NextAuth credentials) with per-user stats, score history, and a leaderboard.
- **Replays** — every run records a compact event log plus periodic snapshots; any run can be played back from `/replay/[id]`.
- **Private-seed URLs** — share a `/play?seed=...` link so a group of friends all play the same bug pattern off the main daily.
- **Post-run share card** with a copyable text summary and an auto-generated PNG for social.
- **Cosmetics shop** — buy trails, titles, badges, and SFX packs with coins earned from runs; some Pro-only items require a Pro subscription.
- **Pro tier scaffold** — `/pro` describes the subscription, gathers waitlist emails, and gates paid perks behind a feature flag (Stripe not shipped yet).
- **BYO-Website sandbox** — paste any URL at `/byo` and swat bugs on top of it in a sandboxed iframe. Sandbox runs don't score on the leaderboard.
- **Achievements & coins** that unlock new **skins** (Nebula, Terminal Green, Synthwave, Cyberpunk).
- **Procedural sound effects** via the Web Audio API (no audio files).
- **Analytics baseline** — a lightweight `track()` helper posts named events to an optional webhook, so you can hook up any backend (PostHog, Plausible, a console logger) without code changes.

---

## Tech stack

| Layer       | What it uses                              |
| ----------- | ----------------------------------------- |
| Framework   | Next.js 14 (App Router, TypeScript)       |
| Styling     | Tailwind CSS + custom CSS keyframes       |
| Auth        | NextAuth (Credentials provider, JWT)      |
| Database    | MongoDB via Mongoose 8                    |
| Game render | React 18 + Web Audio API                  |

---

## Getting started

### Prerequisites

- Node.js 18.17+
- A MongoDB instance (local Docker or Atlas free tier)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your env file
cp .env.local.example .env.local

# 3. Edit .env.local — set MONGODB_URI and NEXTAUTH_SECRET
#    (generate a secret with: openssl rand -base64 32)

# 4. Run the dev server
npm run dev
```

Open <http://localhost:3000> and play.

### Production build

```bash
npm run build
npm run start
```

---

## Environment variables

See `.env.local.example` for the full list:

### Core (required)

- `MONGODB_URI` — connection string, e.g. `mongodb://localhost:27017/dom-defender`
- `NEXTAUTH_SECRET` — random 32+ byte string
- `NEXTAUTH_URL` — your deployment URL (defaults to `http://localhost:3000` in dev)

### Feature flags (optional)

Every paid / third-party integration is **off by default** and stays off until
you set an env var and/or provide credentials. The app runs end-to-end without
any of these — the gated UI just shows "coming soon" banners.

| Variable | Purpose | Default |
| --- | --- | --- |
| `PRO_BILLING_ENABLED` | Set to `true` to actually charge for Pro. When `false`, the `/pro` page only collects waitlist emails. | `false` |
| `STRIPE_SECRET_KEY` | Server-side Stripe key. Required when `PRO_BILLING_ENABLED=true`. | unset |
| `STRIPE_WEBHOOK_SECRET` | Verifies Stripe webhook signatures. Required when `PRO_BILLING_ENABLED=true`. | unset |
| `BYO_IP_HASH_SALT` | Salt used when hashing IPs in the BYO abuse log. Rotate to invalidate prior rate-limit state. | `dom-defender-byo` |
| `NEXT_PUBLIC_BYO_ALLOW_LIST` | Comma-separated hostnames; when set, BYO only accepts URLs from this allow list. Leave unset for the normal deny-list-only policy. | unset |
| `NEXT_PUBLIC_ANALYTICS_WEBHOOK_URL` | If set, `track()` posts events here. Keep unset to no-op. | unset |

The feature-flag contract is: **ship with the flag off, fail closed if credentials are missing.** Turning a flag on without the matching creds is an error the server returns (e.g., `/api/shop/purchase` with `method: "usd"` returns 503 until Stripe is configured).

---

## Project structure

```
app/
  page.tsx              # Home / menu
  play/                 # Endless mode (supports ?seed= for private runs)
  daily/                # Daily challenge (seeded)
  leaderboard/          # Endless + daily leaderboards
  account/              # Profile, stats, skin picker
  achievements/         # Achievement gallery
  shop/                 # Cosmetics shop (trails, titles, badges, SFX packs)
  pro/                  # Pro subscription / waitlist page
  byo/                  # BYO-Website sandbox (paste a URL, swat bugs on it)
  replay/[id]/          # Play back any saved run
  login/  register/     # Auth pages
  api/
    auth/               # NextAuth + register
    scores/             # POST a run summary
    leaderboard/        # GET top scores (per mode)
    daily/              # GET today's daily key + seed
    profile/            # GET / PATCH profile (now includes cosmetics / pro state)
    achievements/       # GET achievement metadata
    replays/            # POST a replay; GET by id
    shop/               # GET catalogue + owned + coins
    shop/purchase/      # POST to buy with coins or (feature-flagged) USD
    shop/equip/         # POST to equip a cosmetic in a slot
    pro-waitlist/       # POST to join the Pro waitlist
    byo-attempt/        # POST: server-side BYO URL validation + rate limit

components/
  Nav.tsx               # Top nav (auto-hides on /play and /daily)
  Providers.tsx         # NextAuth SessionProvider
  PlayShell.tsx         # Wraps <Game />, fetches skin, posts score on run end
  BYOGame.tsx           # Client-only bug-swatting overlay for BYO mode
  ShareCard.tsx         # Post-run share UI (text + PNG)
  game/
    Game.tsx            # Main game component
    LandingPage.tsx     # The fake SaaS landing page that bugs spawn on
    sounds.ts           # Web Audio SFX
    styles.css          # Bug animations, cursors, overlays

lib/
  mongodb.ts            # Cached Mongoose connection
  auth.ts               # NextAuth config
  analytics.ts          # track() — posts to NEXT_PUBLIC_ANALYTICS_WEBHOOK_URL if set
  pro.ts                # isProBillingEnabled(), requirePro() guard
  game/
    skins.ts            # 4 cosmetic skins
    cosmetics.ts        # Trails / titles / badges / SFX pack catalogue
    achievements.ts     # Achievements + RunSummary type
    powerups.ts         # Power-ups w/ cooldowns
    dailySeed.ts        # FNV-1a hash + mulberry32 PRNG
    replay.ts           # ReplayRecorder (bounded event + snapshot capture)
    byoValidator.ts     # Client-side URL validation + rate-limit shim

models/
  User.ts               # username, coins, runs, unlocks, cosmetics, pro state
  Score.ts              # one document per submitted run
  Replay.ts             # events + snapshots for a single run
  ProWaitlist.ts        # unique-email waitlist for the Pro launch
  ByoAttempt.ts         # TTL'd log of BYO URL attempts (rate-limit + abuse signal)

legacy/
  index.html            # Original v1 standalone HTML (preserved)
```

---

## How a run is scored

1. The client plays a round and tracks: `score`, `durationSec`, `wave`, `bugsFixed`, `bossesDefeated`, `maxCombo`, `powerUpsUsed`.
2. On crash (or boss fight win), `Game` calls `onRunEnd(summary)`.
3. `PlayShell` POSTs the summary to `/api/scores`.
4. The server sanity-checks the score (rejects > 200 score/sec average), stores a `Score` document, updates the user's aggregates, evaluates new achievements, and awards coins/skin unlocks.

The leaderboard endpoint groups scores by `userId` and returns the best per user.

---

## Daily challenge seeding

`todaysDailyKey()` returns the current UTC date as `YYYY-MM-DD`. `seedFromDateKey()` hashes that into a 32-bit integer (FNV-1a), which seeds a Mulberry32 PRNG. The `Game` component swaps in this PRNG when `mode === "daily"`, so every player sees the same bug spawn order, types, and positions — making the daily leaderboard a genuine apples-to-apples comparison.

---

## Skins

Skins are pure cosmetics. They change the page background, brand name/tagline, accent gradient, and bug palette via CSS variables. Three of the four are unlock-only:

- **Nebula** — default
- **Terminal Green** — survive 60 seconds
- **Synthwave** — reach wave 6
- **Cyberpunk** — defeat your first boss

---

## Replays

Every run records an event log (tool switches, hits, misses, boss phases, power-up activations) and a handful of periodic snapshots (score, crash meter, wave, time elapsed). On run end the client POSTs this to `/api/replays` alongside the seed and mode.

`/replay/[id]` plays the run back at real time — no simulation, just stepping through events and interpolating snapshots. The event count is bounded (`REPLAY_MAX_EVENTS` in `lib/game/replay.ts`) so one very long session can't blow up the collection.

## Share card

When a run ends, `ShareCard` renders a post-run summary with:

- A copyable one-liner (`"🧪 DOM Defender — W7, 12,340 pts, 93s"`).
- A PNG auto-generated via `<canvas>` that plays nicely with social preview scrapers.

No third-party image service — everything happens in the browser.

## Cosmetics shop

The catalogue lives in `lib/game/cosmetics.ts` as a static array (no separate Mongo collection — keeps migrations cheap). Each item has a category (`trail` / `title` / `badge` / `sfx_pack`), an optional `coinPrice`, an optional `usdPrice`, and an optional `proOnly` flag.

- **Coin purchases** — go through `/api/shop/purchase` with `method: "coins"`, deduct `user.totalCoins`, add to `user.ownedCosmetics`.
- **USD purchases** — gated behind `PRO_BILLING_ENABLED` + a configured Stripe key. The current handler returns a `{ ok: false, stub: true }` response until Stripe is wired up, so the UI can render paid items without actually charging anyone.
- **Equip** — `/api/shop/equip` writes to one of four slots on `User`: `selectedTrail`, `selectedTitle`, `selectedBadge`, `selectedSfxPack`.

## Pro tier

`/pro` is a marketing page with perk cards, pricing cards, and a waitlist form. It reads `publicProConfig()` from `/api/shop`:

- If `PRO_BILLING_ENABLED` is unset / false → show waitlist form, hide "Subscribe" buttons.
- If enabled + Stripe configured → show subscribe buttons (not yet wired to checkout — placeholder).

`requirePro()` in `lib/pro.ts` is the two-layer guard every Pro-gated endpoint should use: env-flag check **and** `user.isPro` DB field. Waitlist submissions go to the `ProWaitlist` collection (unique index on email, idempotent).

## BYO-Website sandbox

`/byo` lets a user paste any URL and play a bug-swatting overlay on top of it in a sandboxed iframe. Because same-origin policy prevents touching the iframe's DOM, bugs are positioned in a separate full-viewport overlay — the game works even if the target site sends `X-Frame-Options: DENY`.

Defense layers:

1. **Client validation** (`lib/game/byoValidator.ts`) — auto-https, block private IPs (10/8, 172.16/12, 192.168/16, 169.254/16, 127/8), block `.local` / `.internal` / `.arpa` / `.home`, deny list, optional allow list via `NEXT_PUBLIC_BYO_ALLOW_LIST`, strip credentials and fragments.
2. **First-visit consent banner** — stored in `localStorage` as `dd.byo.consent.v1`. Explains the iframe sandbox, no tracking pixels, scores don't save.
3. **Sandboxed iframe** — `sandbox="allow-scripts allow-same-origin allow-forms"`, `referrerPolicy="no-referrer"`.
4. **Server revalidation + rate limit** (`/api/byo-attempt`) — the client calls this *before* rendering the iframe. Salted SHA-256 IP hash (`BYO_IP_HASH_SALT`) is used to count attempts (max 30 per 10 minutes per IP). The `ByoAttempt` collection TTLs itself at 30 days.
5. **Scores don't save** — BYO runs skip `/api/scores` entirely. The UI shows a "Sandbox mode" badge.

## Analytics

`lib/analytics.ts` exports a single `track(eventName, payload)` helper. If `NEXT_PUBLIC_ANALYTICS_WEBHOOK_URL` is set it `fetch()`es a `POST` with `{ event, payload, ts }`. Unset → no-op. Events are named with a `snake_case_verb` convention (e.g., `byo_run_started`, `pro_waitlist_submitted`, `share_card_copied`) so any backend can aggregate them easily.

---

## Deployment

Any Node-friendly host works (Vercel, Fly.io, Railway, your own Docker):

1. Provision a MongoDB instance (Atlas free tier is fine).
2. Set `MONGODB_URI`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` in your host's env.
3. `npm run build && npm run start` (or let your host do that for you).

Vercel example: push to GitHub, import the repo on Vercel, add the three env vars, deploy.

---

## Roadmap ideas

- Power-up upgrade tree (spend coins to extend duration / cut cooldowns).
- More boss types with unique patterns.
- Co-op mode (two players on one page).
- Wire Stripe Checkout into `/api/shop/purchase` (method: `"usd"`) + a Pro webhook handler — currently a feature-flagged stub.
- Distributed / Redis-backed rate limiter for BYO to replace the Mongo count query.
- Replay diff view — compare two runs side by side on the same seed.

---

## License

MIT — do whatever you want, just don't blame me when your real DOM has bugs.
