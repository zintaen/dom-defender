import { describe, it, expect } from "vitest";
import { validateRunAgainstReplay } from "@/lib/game/scoreValidator";
import type { ReplayLog } from "@/lib/game/replay";

// NFR-DOM-001: a score only counts if its replay supports it. These lock the
// rejection cases that make the leaderboard trustworthy.

function makeReplay(over: Partial<ReplayLog> = {}): ReplayLog {
  const events = [
    { t: 1, type: "fix", bugType: "drift", score: 100 },
    { t: 2, type: "fix", bugType: "error", score: 150 },
    { t: 3, type: "combo", value: 4 },
    { t: 4, type: "wave", wave: 2 },
    { t: 5, type: "boss_spawn" },
    { t: 6, type: "boss_down" },
    { t: 7, type: "fix", bugType: "leak", score: 250 },
  ];
  const snapshots = [
    { t: 0, score: 0, crash: 0, wave: 1, bugs: 0 },
    { t: 4, score: 250, crash: 10, wave: 2, bugs: 2 },
    { t: 7, score: 500, crash: 20, wave: 2, bugs: 1 },
  ];
  const summary = { score: 500, wave: 2, bugsFixed: 3, bossesDefeated: 1, maxCombo: 4 };
  return {
    mode: "endless",
    skinId: "default",
    startedAt: 0,
    durationSec: 8,
    events,
    snapshots,
    summary,
    ...over,
  } as ReplayLog;
}

const legitClaim = { score: 500, durationSec: 8, wave: 2, bugsFixed: 3, bossesDefeated: 1, maxCombo: 4 };

describe("validateRunAgainstReplay", () => {
  it("accepts a run whose replay supports it", () => {
    expect(validateRunAgainstReplay(legitClaim, makeReplay()).ok).toBe(true);
  });

  it("rejects a missing replay (the trivial POST-a-number attack)", () => {
    expect(validateRunAgainstReplay(legitClaim, null).ok).toBe(false);
    expect(validateRunAgainstReplay(legitClaim, undefined).ok).toBe(false);
  });

  it("rejects when the claimed summary does not match the replay summary", () => {
    const r = validateRunAgainstReplay({ ...legitClaim, score: 999999 }, makeReplay());
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/summary/i);
  });

  it("rejects an inflated score even when the summary is faked to match", () => {
    // attacker sets summary.score high but the events/snapshots only support 500
    const forged = makeReplay({ summary: { score: 999999, wave: 2, bugsFixed: 3, bossesDefeated: 1, maxCombo: 4 } });
    const r = validateRunAgainstReplay({ ...legitClaim, score: 999999 }, forged);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/score exceeds/i);
  });

  it("rejects more bugs than the event log recorded", () => {
    const forged = makeReplay({ summary: { score: 500, wave: 2, bugsFixed: 99, bossesDefeated: 1, maxCombo: 4 } });
    const r = validateRunAgainstReplay({ ...legitClaim, bugsFixed: 99 }, forged);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/bugs/i);
  });

  it("rejects more bosses than the replay recorded", () => {
    const forged = makeReplay({ summary: { score: 500, wave: 2, bugsFixed: 3, bossesDefeated: 9, maxCombo: 4 } });
    expect(validateRunAgainstReplay({ ...legitClaim, bossesDefeated: 9 }, forged).ok).toBe(false);
  });

  it("rejects a combo higher than the replay shows", () => {
    const forged = makeReplay({ summary: { score: 500, wave: 2, bugsFixed: 3, bossesDefeated: 1, maxCombo: 50 } });
    expect(validateRunAgainstReplay({ ...legitClaim, maxCombo: 50 }, forged).ok).toBe(false);
  });

  it("rejects a wave beyond the replay", () => {
    const forged = makeReplay({ summary: { score: 500, wave: 40, bugsFixed: 3, bossesDefeated: 1, maxCombo: 4 } });
    expect(validateRunAgainstReplay({ ...legitClaim, wave: 40 }, forged).ok).toBe(false);
  });

  it("rejects a replay whose timeline runs past the claimed duration", () => {
    const r = validateRunAgainstReplay({ ...legitClaim, durationSec: 1 }, makeReplay());
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/duration/i);
  });

  it("allows a small late-burst within tolerance", () => {
    // last snapshot 500, fix sum 500, ceiling = 550; claim 540 should pass
    const r = makeReplay({ summary: { score: 540, wave: 2, bugsFixed: 3, bossesDefeated: 1, maxCombo: 4 } });
    expect(validateRunAgainstReplay({ ...legitClaim, score: 540 }, r).ok).toBe(true);
  });
});
