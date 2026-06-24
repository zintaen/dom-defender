# Wiring the adaptive director into Game.tsx (FR-DD-AI-001)

The director core is built and unit-tested in `lib/game/director.ts`. This is the
manual integration into `components/game/Game.tsx` (the protected game loop), kept
out of the automated changes because it cannot be build- or play-tested in the
sandbox. Apply it on your machine and playtest.

## The one rule

Run the director ONLY on free endless runs - that is, `mode === "endless"` AND
`initialSeed === undefined`. Seeded runs (daily, `?seed=`, and friend challenges
via `?challenge=`) MUST stay deterministic so two players on the same seed get the
same bugs. The existing seed logic already keys off this: `rngRef` is
`mulberry32(initialSeed)` when a seed is present, else `Math.random`. So:

```ts
const directorActive = mode === "endless" && initialSeed === undefined;
```

Compute that once near the top of the component (you have `mode` and `initialSeed`
as props).

## 1. Build a snapshot helper

Near the other refs, add a small helper that reads the live signals you already
track (`comboRef`, `crashRef`, `waveRef`). Trend and misses are optional - the
director clamps missing inputs, so 0 is a safe default.

```ts
import { decideDirector } from "@/lib/game/director";
import type { PlayerSkillSnapshot } from "@/lib/game/director.types";

function currentSnapshot(): PlayerSkillSnapshot {
  return {
    recentFixLatencyMs: Math.min(2000, Math.max(0, Date.now() - comboRef.current.lastFix)),
    currentCombo: comboRef.current.count,
    crashMeter: crashRef.current,
    crashTrendPerSec: 0, // optional: track a crash delta per second if you want finer control
    recentMisses: 0,     // optional: increment a ref when a bug expires, read it here
    wave: waveRef.current,
  };
}
```

## 2. Spawn rate - in the "Bug spawn timing" effect (around the `scheduleNext` you have at ~line 519)

Multiply the base delay by the director's multiplier when active. Leave the
deterministic path exactly as it is.

```ts
const scheduleNext = () => {
  const w = waveRef.current;
  let base = Math.max(600, 3200 - w * 600);
  if (directorActive) base *= decideDirector(currentSnapshot()).spawnIntervalMultiplier; // 0.55..1.6
  const jitter = rngRef.current() * 400;
  t = setTimeout(() => {
    spawnBug();
    if (w >= 3 && rngRef.current() < 0.25) setTimeout(spawnBug, 200);
    if (w >= 5 && rngRef.current() < 0.30) setTimeout(spawnBug, 400);
    scheduleNext();
  }, base + jitter);
};
```

## 3. Boss gating - in the game-tick effect (the boss block at ~line 502)

```ts
// Boss spawn pacing - wave 4+, every 30s
if (waveRef.current >= 4 && !boss) {
  const sinceLast = (now - lastBossSpawnRef.current) / 1000;
  const directorAllows = !directorActive || decideDirector(currentSnapshot()).allowBossThisWave;
  if (sinceLast > 30 && directorAllows) {
    lastBossSpawnRef.current = now;
    spawnBoss();
  }
}
```

## 4. (Optional) Bug-type bias - in `spawnBug` (~line 186)

The director returns `bugTypeWeights { drift, error, leak }`. If you want the mix
to lean on whatever is hurting the player, replace the fixed `r < 0.45` thresholds
with a weighted pick from those weights - again only when `directorActive`. This
is a nice-to-have; the spawn-rate and boss changes are the bulk of the feel.

## Verify

- Daily and a `?seed=` run still produce the identical bug sequence on replay
  (director untouched there).
- A free endless run visibly speeds up when you play well and eases when you are
  drowning, and never becomes unwinnable or trivial (the multiplier is clamped to
  0.55..1.6 in the core).
- `npx tsc --noEmit` and `npm test` stay green (the core is already covered by
  `tests/director.test.ts`).
