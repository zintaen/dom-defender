# DOM Defender - launch assets (copy-ready)

Paste-ready copy for each channel. Swap `<URL>` for the live domain before posting. Keep it
honest: do not claim numbers you do not have, and do not launch before the P0 gate
(`docs/ROADMAP.md`). All of this assumes the per-run OG image (FR-DD-SOC-002) is live so links
unfurl with a picture.

## Taglines (pick one, use everywhere)

1. A survival game where the website is the game.
2. Swat the web bugs before the server crashes.
3. The website is breaking. You are the only one who can patch it.

## Product Hunt

Name: DOM Defender

Tagline (60 char max): A survival game where the website is the game

Description:
DOM Defender is a browser game for people who fix websites for a living. CSS bugs drift across
the page, console errors pop up, memory leaks spread, and a crash meter climbs. You have three
tools and a few power-ups to keep the site alive. There is a daily challenge everyone plays on
the same seed, an endless mode, replays of every run, and a leaderboard. The twist: paste any
URL and play on top of the real site in a sandboxed frame. Free, no install.

Maker's first comment:
I build software in Ho Chi Minh City and made this because the bugs we fight all day are
weirdly fun when they are the enemy. A few things I am proud of: the daily challenge is
deterministic, so everyone gets the exact same bugs and the daily leaderboard is a fair fight;
scores are validated server-side against a recorded replay, so the board is hard to fake; and
the bring-your-own-site mode lets you swat bugs on any page. It is solo-built and I am here all
day, so tell me what breaks and what you want next.

## Hacker News (Show HN)

Title: Show HN: DOM Defender - a survival game where the website is the game

First comment:
Hi HN. DOM Defender is a small browser game where you keep a fake SaaS site alive by patching
CSS bugs, smashing console errors, and vacuuming memory leaks before a crash meter fills.

Two parts might interest this crowd. First, the daily challenge is seeded deterministically
(FNV-1a into a Mulberry32 PRNG), so every player gets the identical bug sequence and the daily
board is genuinely comparable. Second, scores are validated on the server against a recorded
replay rather than trusted from the client, which is the part that took the most care.

There is also a bring-your-own-site mode: paste a URL and the bugs spawn on top of the real
page in a sandboxed iframe (the server never fetches the URL; validation is allow/deny only).

Stack is Next.js 14, MongoDB, NextAuth. It is solo-built and free. Happy to go into the
anti-cheat or the seeding in the comments, and I would love to hear where it falls over.

## Reddit - r/webdev (primary)

Title: I made a browser game where you fix web bugs, and you can play it on top of any website

Body:
I spend my days fixing front-end bugs, so I turned them into the enemy. In DOM Defender you
keep a site alive by dragging drifting elements back, smashing console-error popups, and
vacuuming memory leaks before the crash meter hits 100%. There is a daily challenge on a shared
seed, an endless mode, and replays.

The part I had the most fun with: you can paste any URL and the bugs spawn on top of that real
site in a sandboxed frame. Watching a polished homepage fall apart while you scramble to patch
it is the whole pitch.

It is free and solo-built with Next.js and MongoDB. Link in a comment so this is not just a
drive-by. I would really like feedback on difficulty and on the bring-your-own-site mode.

Notes: post the link as a comment, reply to everyone, and do not cross-post the same text to
r/javascript and r/incremental_games on the same day - rewrite the angle for each.

## X / Twitter launch thread

1/ I made DOM Defender: a survival game where the website is the game. CSS bugs drift, console
errors pop, memory leaks spread, and you patch it all before the server crashes. Free, in the
browser. <URL>

2/ The hook: paste ANY url and play on top of the real site. Your favorite homepage, swarmed
with bugs, while you scramble to keep it alive. [clip]

3/ There is a daily challenge on a shared seed, so everyone fights the exact same bugs and the
daily leaderboard is a real contest, not vibes.

4/ Scores are validated server-side against a recorded replay, so the board is hard to fake. I
will write up how that works if people want it.

5/ Built solo with Next.js and MongoDB. Tell me your high score and what I should add. Challenge
a friend with your seed and see who patches faster.

## In-product share + challenge copy (FR-DD-SOC-001 / SOC-002)

Share card auto text:
I survived to wave {wave} and scored {score} in DOM Defender. Think you can patch faster?
Beat my run: <challenge-URL>

Challenge landing headline:
{name} scored {score}. Same bugs, same seed. Can you beat it?

OG image (per run) should show: the score, the wave reached, the skin/theme, and a clear
"Beat my seed" call to action, on the run's accent gradient. This is what makes a pasted link
worth clicking in a chat or a tweet.

## Short demo video (15 to 30 seconds)

- 0 to 3s: a clean, familiar-looking homepage. Text: "every website has bugs".
- 3 to 8s: bugs erupt - elements drift, console popups, the crash meter climbs. Text: "this
  one is fighting back".
- 8 to 22s: fast cuts of swatting bugs, a power-up, a boss weak point, combo counter rising.
- 22 to 27s: the "paste any URL" moment - a recognizable site starts breaking. Text: "play it
  on ANY site".
- 27 to 30s: logo + URL + "free in your browser".
Caption: A survival game where the website is the game. Paste any URL and try it. <URL>

## Pre-launch build-in-public posts (run during P1)

- The audit-to-launch story: "I ran a security audit on my own game before launching it. Here
  is what I found." (links the integrity work to a credible launch - developers respect this).
- "How I stopped people faking my leaderboard" - the replay-validation write-up (after
  NFR-DOM-001 ships).
- Short clips of the adaptive AI director (FR-DD-AI-001) ramping difficulty to the player.

## Reminders

- One channel per day during launch week; be present in every thread.
- Never post a number you cannot back up.
- Ship one visible improvement mid-launch-week so the audience sees momentum.
