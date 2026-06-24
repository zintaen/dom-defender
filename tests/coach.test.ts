import { describe, it, expect } from "vitest";
import { coachRun } from "@/lib/game/coach";
import type { ReplayLog } from "@/lib/game/replay";

// FR-DD-AI-002: every tip must be grounded in the run, deterministic, and capped at 3.

function makeReplay(over: Partial<ReplayLog> = {}): ReplayLog {
  return {
    mode: "endless",
    skinId: "default",
    startedAt: 0,
    durationSec: 90,
    events: [],
    snapshots: [{ t: 0, score: 0, crash: 0, wave: 1, bugs: 0 }],
    summary: { score: 1000, wave: 4, bugsFixed: 20, bossesDefeated: 1, maxCombo: 6 },
    ...over,
  } as ReplayLog;
}

describe("coachRun", () => {
  it("flags a boss that appeared but was not defeated", () => {
    const r = makeReplay({
      events: [{ t: 5, type: "boss_spawn" }] as any,
      summary: { score: 800, wave: 5, bugsFixed: 20, bossesDefeated: 0, maxCombo: 6 },
    });
    expect(coachRun(r).some((t) => /boss/i.test(t.title))).toBe(true);
  });

  it("flags a run with no power-ups used", () => {
    const r = makeReplay({ events: [] as any, durationSec: 60 });
    expect(coachRun(r).some((t) => /power-?up/i.test(t.title))).toBe(true);
  });

  it("flags low combo with many fixes", () => {
    const r = makeReplay({
      events: [{ t: 1, type: "powerup", id: "freeze" }] as any,
      summary: { score: 500, wave: 3, bugsFixed: 12, bossesDefeated: 0, maxCombo: 1 },
    });
    expect(coachRun(r).some((t) => /combo/i.test(t.title))).toBe(true);
  });

  it("flags a run where the crash meter ran hot", () => {
    const r = makeReplay({
      events: [{ t: 1, type: "powerup", id: "shield" }] as any,
      snapshots: [{ t: 10, score: 500, crash: 92, wave: 3, bugs: 5 }] as any,
      summary: { score: 500, wave: 3, bugsFixed: 10, bossesDefeated: 0, maxCombo: 8 },
    });
    expect(coachRun(r).some((t) => /meter/i.test(t.title))).toBe(true);
  });

  it("praises a clean run with no faults", () => {
    const r = makeReplay({
      events: [{ t: 1, type: "powerup", id: "freeze" }, { t: 9, type: "boss_down" }] as any,
      snapshots: [{ t: 10, score: 5000, crash: 30, wave: 6, bugs: 2 }] as any,
      summary: { score: 5000, wave: 6, bugsFixed: 40, bossesDefeated: 2, maxCombo: 12 },
    });
    const tips = coachRun(r);
    expect(tips).toHaveLength(1);
    expect(tips[0].title).toMatch(/clean/i);
  });

  it("returns at most 3 tips and is deterministic", () => {
    const r = makeReplay({
      events: [{ t: 5, type: "boss_spawn" }] as any,
      snapshots: [{ t: 10, score: 100, crash: 95, wave: 3, bugs: 9 }] as any,
      durationSec: 80,
      summary: { score: 100, wave: 3, bugsFixed: 9, bossesDefeated: 0, maxCombo: 1 },
    });
    const a = coachRun(r);
    const b = coachRun(r);
    expect(a.length).toBeLessThanOrEqual(3);
    expect(a).toEqual(b);
  });
});
