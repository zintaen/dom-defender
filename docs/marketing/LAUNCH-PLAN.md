# DOM Defender - marketing plan (content-led launch)

Recommendation: start content-led and organic, and keep a small paid test in reserve for
after the landing page proves it converts. The reason is fit. DOM Defender is a game for web
developers (you patch CSS bugs, console errors, and memory leaks, and you can play it on top
of any website). That audience lives on Hacker News, the web-dev subreddits, and developer X,
and it rewards a good story far more than an ad. Paid spend before you know your landing page
converts is guessing; the same money after is buying a known result.

Ready-to-use copy for every channel below is in `docs/marketing/launch-assets.md`.

## Hard rule: do not launch before the P0 gate

Marketing drives strangers to a public leaderboard. If the leaderboard is fakeable (it is
today, see NFR-DOM-001) the launch teaches your first cohort that the game is broken, and that
first impression is the expensive one. Launch only after the P0 launch gate in
`docs/ROADMAP.md` is met: CI green, 0 high/critical advisories, scores server-validated, auth
throttled, security headers live, deployed on a real domain with backups.

## The one-line story

Pick one and use it everywhere (it becomes the PH tagline, the HN title, the OG text):

"A survival game where the website is the game - patch the bugs before the server crashes."

The strongest hook is the BYO feature: you can paste any URL and swat bugs on top of the real
site. That is the line that makes developers click and share.

## Channels, in priority order

1. Hacker News (Show HN). Highest-fit audience. One shot - post when the build is solid and
   you can sit with the thread for the day to answer every comment. Lead with what is
   technically interesting (deterministic daily seed, replay-validated anti-cheat, the BYO
   sandbox), be honest that it is solo-built.
2. Reddit: r/webdev (primary), then r/javascript and r/incremental_games. Reddit punishes ads
   and rewards makers. Post the making-of, not a pitch. Different day from HN.
3. Product Hunt. Good for a durable listing and a second traffic wave. Line up a few people
   who will genuinely try it on launch morning. Ship the per-run OG image (FR-DD-SOC-002)
   first so shared links unfurl with a picture.
4. Developer X / Twitter. A launch thread plus short clips of satisfying bug-swatting. This is
   where the challenge-link loop (FR-DD-SOC-001) compounds.
5. Short-form video (X, TikTok, YouTube Shorts). A 15 to 30 second clip of the BYO mode
   wrecking a famous site's homepage with bugs is the single most shareable asset. Storyboard
   is in the assets file.
6. Dev newsletters and communities. Submit to a few web-dev newsletters and post in friendly
   Discords/Slacks after the public launch, not before.

## Calendar

Pre-launch (1 to 2 weeks, runs in parallel with P1 features):
- Build in public on X: short clips, the audit-to-launch story, "a game for devs" framing.
- Stand up the landing page and the per-run OG image. Instrument analytics (the track() hook
  already exists) so you can read conversion.
- Warm up the channels: comment where your audience already is; do not drop links cold.

Launch week:
- Day 1: Show HN in the morning (your time-zone overlap with US mornings matters; plan for it).
  Spend the day in the thread.
- Day 2 to 3: Reddit r/webdev making-of. Different story angle from HN.
- Day 4: Product Hunt, with the OG image and a maker's first comment ready.
- Throughout: post clips on X, reply to everyone, ship a visible fix or small feature mid-week
  so the thread sees momentum.

Post-launch (ongoing):
- Weekly tournament (FR-DD-SOC-003) gives a recurring reason to post and return.
- Turn the best community runs and challenge links into content.
- Only now consider a small paid test (see below).

## Success metrics (instrument these before launch)

- Landing page: visit -> play conversion, and play -> signup conversion.
- Retention: D1 and D7 return rate.
- Virality: challenge-link click-through and the share rate per finished run (the referral
  coefficient you want trending toward 1).
- Channel: HN front-page time, PH rank, Reddit upvote ratio, top referrers.
- Integrity: rejected-score rate (proves the anti-cheat is working and is a credible "how I
  built anti-cheat" follow-up post).

## Paid test (only after organic conversion is proven)

When the landing page converts reliably, run one small, capped test - Reddit promoted posts or
X ads aimed at web-dev interests - with a fixed budget and a single success metric (cost per
signup). If it beats organic cost per signup, scale it; if not, stop. Decide the budget figure
at that point, not now.

## The CyberSkill connection (optional but high-leverage)

The game can quietly funnel to the consultancy without feeling like an ad: a small "made by
CyberSkill" credit, and the teams / workshop mode (FR-DD-EDU-001) as a real product - run
DOM Defender as a team event or a hiring-screen warmup, with a shared leaderboard. That turns
a fun launch into a repeatable top-of-funnel asset for CyberSkill, which is the point of doing
all this rather than just shipping a game.
