// Types for the adaptive bug director (FR-DD-AI-001). Kept separate so a future
// LLM- or model-backed director can return the same DirectorDecision shape.

export interface PlayerSkillSnapshot {
  // Average time to fix recent bugs, in ms. Lower means sharper.
  recentFixLatencyMs: number;
  // Current combo count.
  currentCombo: number;
  // Crash meter 0..100 (100 = lost).
  crashMeter: number;
  // Crash-meter change per second: positive = losing ground, negative = recovering.
  crashTrendPerSec: number;
  // Bugs that expired / were missed in the recent window.
  recentMisses: number;
  // Current wave.
  wave: number;
}

export interface DirectorDecision {
  // Multiplies the base spawn interval. <1 spawns faster, >1 slower.
  spawnIntervalMultiplier: number;
  // Relative weights for the three bug families (sum > 0).
  bugTypeWeights: { drift: number; error: number; leak: number };
  // Whether a boss may appear this wave.
  allowBossThisWave: boolean;
  // 0..1 estimate of player skill, exposed for telemetry / the coach.
  skill: number;
}
