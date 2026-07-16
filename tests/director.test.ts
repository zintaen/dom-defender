import { describe, it, expect } from "vitest";
import { decideDirector, estimateSkill, MIN_INTERVAL_MULT, MAX_INTERVAL_MULT } from "@/lib/game/director";
import type { PlayerSkillSnapshot } from "@/lib/game/director.types";

// TASK-DD-AI-001: endless-only adaptive difficulty. These pin the direction of
// adaptation and the hard bounds (the game can never become unwinnable/trivial).

const strong: PlayerSkillSnapshot = {
  recentFixLatencyMs: 300,
  currentCombo: 10,
  crashMeter: 20,
  crashTrendPerSec: -3,
  recentMisses: 0,
  wave: 5,
};
const struggling: PlayerSkillSnapshot = {
  recentFixLatencyMs: 1800,
  currentCombo: 0,
  crashMeter: 85,
  crashTrendPerSec: 6,
  recentMisses: 5,
  wave: 5,
};

describe("estimateSkill", () => {
  it("rates a strong player higher than a struggling one, both in [0,1]", () => {
    const a = estimateSkill(strong);
    const b = estimateSkill(struggling);
    expect(a).toBeGreaterThan(b);
    for (const v of [a, b]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe("decideDirector", () => {
  it("speeds up for strong play and slows down for struggling play", () => {
    expect(decideDirector(strong).spawnIntervalMultiplier).toBeLessThan(
      decideDirector(struggling).spawnIntervalMultiplier
    );
  });

  it("never returns a multiplier outside the bounds", () => {
    for (let i = 0; i < 500; i++) {
      const snap: PlayerSkillSnapshot = {
        recentFixLatencyMs: Math.random() * 5000 - 1000,
        currentCombo: Math.random() * 40 - 5,
        crashMeter: Math.random() * 140 - 20,
        crashTrendPerSec: Math.random() * 60 - 30,
        recentMisses: Math.random() * 20 - 5,
        wave: Math.floor(Math.random() * 20),
      };
      const d = decideDirector(snap);
      expect(d.spawnIntervalMultiplier).toBeGreaterThanOrEqual(MIN_INTERVAL_MULT);
      expect(d.spawnIntervalMultiplier).toBeLessThanOrEqual(MAX_INTERVAL_MULT);
      expect(d.bugTypeWeights.leak).toBeGreaterThanOrEqual(1);
      expect(d.bugTypeWeights.drift + d.bugTypeWeights.error + d.bugTypeWeights.leak).toBeGreaterThan(0);
    }
  });

  it("does not boss-rush a struggling player but allows it for strong late play", () => {
    expect(decideDirector(struggling).allowBossThisWave).toBe(false);
    expect(decideDirector(strong).allowBossThisWave).toBe(true);
  });

  it("never allows a boss before wave 4", () => {
    expect(decideDirector({ ...strong, wave: 3 }).allowBossThisWave).toBe(false);
  });
});
