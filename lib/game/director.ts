// Adaptive bug director (FR-DD-AI-001).
//
// Pure function: maps a PlayerSkillSnapshot to a bounded DirectorDecision.
// USE IN ENDLESS MODE ONLY. Daily, tournament, and any seeded run must keep
// their deterministic spawn sequence (see docs/AUDIT-CONFIG.md protected areas),
// so the caller must not invoke this when mode !== "endless".
//
// v1 is a transparent heuristic. The function signature is the AI seam: a later
// learned policy can return the same DirectorDecision without changing callers.

import { PlayerSkillSnapshot, DirectorDecision } from "./director.types";

// Spawn-interval multiplier bounds. The director can never make the game
// unwinnable (too fast) or trivial (too slow).
export const MIN_INTERVAL_MULT = 0.55; // hardest: ~1.8x base spawn rate
export const MAX_INTERVAL_MULT = 1.6; // easiest: ~0.6x base spawn rate

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Estimate player skill in [0, 1] from the snapshot. Higher = doing better.
 * Inputs are combined and clamped so the result is always in range.
 */
export function estimateSkill(s: PlayerSkillSnapshot): number {
  // Each term is normalized to roughly [0, 1]; weights sum to 1.
  const latency = clamp(1 - (Number(s.recentFixLatencyMs) || 0) / 2000, 0, 1); // <=0ms -> 1, >=2000ms -> 0
  const combo = clamp((Number(s.currentCombo) || 0) / 12, 0, 1); // 12+ combo -> 1
  const headroom = clamp(1 - (Number(s.crashMeter) || 0) / 100, 0, 1); // low crash -> 1
  const trend = clamp(0.5 - (Number(s.crashTrendPerSec) || 0) / 20, 0, 1); // recovering -> >0.5
  const misses = clamp(1 - (Number(s.recentMisses) || 0) / 6, 0, 1); // few misses -> 1

  const skill = 0.3 * latency + 0.2 * combo + 0.2 * headroom + 0.15 * trend + 0.15 * misses;
  return clamp(skill, 0, 1);
}

export function decideDirector(s: PlayerSkillSnapshot): DirectorDecision {
  const skill = estimateSkill(s);

  // High skill -> lower multiplier (faster spawns). Linear across the bounds.
  const spawnIntervalMultiplier = clamp(
    MAX_INTERVAL_MULT - skill * (MAX_INTERVAL_MULT - MIN_INTERVAL_MULT),
    MIN_INTERVAL_MULT,
    MAX_INTERVAL_MULT
  );

  // Nudge the mix toward whatever is hurting the player. When they are missing
  // bugs or the meter is climbing, lean on leaks (the slow-burn pressure);
  // otherwise keep it close to even so runs stay varied.
  const pressure = clamp((Number(s.recentMisses) || 0) / 6 + (Number(s.crashTrendPerSec) || 0) / 20, 0, 1);
  const bugTypeWeights = {
    drift: 1,
    error: 1,
    leak: 1 + pressure, // up to 2x leaks under pressure
  };

  // Don't throw a boss at a struggling player; bosses start at wave 4.
  const allowBossThisWave = (Number(s.wave) || 1) >= 4 && skill >= 0.45;

  return { spawnIntervalMultiplier, bugTypeWeights, allowBossThisWave, skill };
}
