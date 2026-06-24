// AI replay coach (FR-DD-AI-002).
//
// Pure, deterministic analysis of a recorded run. Returns up to three tips, each
// grounded in evidence from the replay (no generic advice). v1 is a heuristic
// over the event log and snapshots; a later LLM coach (behind a flag + cost
// guard) can return the same CoachTip[] shape. No network call here.

import { ReplayLog } from "./replay";
import { CoachTip } from "./coach.types";

export function coachRun(replay: ReplayLog): CoachTip[] {
  const events = Array.isArray(replay?.events) ? replay.events : [];
  const snaps = Array.isArray(replay?.snapshots) ? replay.snapshots : [];
  const summary = replay?.summary ?? {
    score: 0,
    wave: 1,
    bugsFixed: 0,
    bossesDefeated: 0,
    maxCombo: 0,
  };
  const durationSec = Number(replay?.durationSec) || 0;

  let bossSpawns = 0;
  let powerups = 0;
  for (const e of events as any[]) {
    if (!e || typeof e !== "object") continue;
    if (e.type === "boss_spawn") bossSpawns++;
    else if (e.type === "powerup") powerups++;
  }
  const maxCrash = snaps.reduce((m: number, s: any) => Math.max(m, Number(s?.crash) || 0), 0);

  const bugsFixed = Number(summary.bugsFixed) || 0;
  const maxCombo = Number(summary.maxCombo) || 0;
  const bossesDefeated = Number(summary.bossesDefeated) || 0;
  const wave = Number(summary.wave) || 1;

  const tips: CoachTip[] = [];

  // 1) A boss showed up but went down for none of them.
  if (bossSpawns > 0 && bossesDefeated === 0) {
    tips.push({
      title: "Finish the boss fights",
      detail:
        "Boss bugs have three weak points, each cleared by a different tool. Rotate Duct Tape, Debugger, and Garbage Collector instead of hammering one.",
      evidence: "A boss appeared but none were defeated this run.",
    });
  }

  // 2) No power-ups used on a run long enough to need them.
  if (powerups === 0 && durationSec >= 30) {
    tips.push({
      title: "Spend your power-ups",
      detail:
        "Freeze, Auto-fix, Magnet, and Shield (Q/W/E/R) can turn a losing wave around. Holding them until the end wastes them.",
      evidence: `You played ${durationSec}s without firing a single power-up.`,
    });
  }

  // 3) Lots of fixes but the combo never built.
  if (maxCombo < 3 && bugsFixed >= 5) {
    tips.push({
      title: "Chain fixes for combos",
      detail:
        "Fixing bugs back-to-back builds a combo multiplier that is most of a high score. Group nearby bugs and clear them in a streak.",
      evidence: `Best combo was x${maxCombo} across ${bugsFixed} fixes.`,
    });
  }

  // 4) The meter ran hot - usually leaks left to spread.
  if (maxCrash >= 80 && tips.length < 3) {
    tips.push({
      title: "Stay ahead of the crash meter",
      detail:
        "Memory leaks spread if ignored and push the meter up fast. Vacuum leaks early with the Garbage Collector rather than chasing drift first.",
      evidence: `The crash meter peaked at ${Math.round(maxCrash)}%.`,
    });
  }

  // Clean, strong run: praise plus one stretch goal.
  if (tips.length === 0) {
    tips.push({
      title: "Clean run",
      detail:
        "No obvious mistakes - quick fixes and the meter stayed under control. Push for a higher wave or a faster boss clear to grow the score.",
      evidence: `Wave ${wave}, ${bugsFixed} bugs, best combo x${maxCombo}.`,
    });
  }

  return tips.slice(0, 3);
}
