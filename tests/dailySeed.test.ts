import { describe, it, expect } from "vitest";
import { todaysDailyKey, seedFromDateKey, mulberry32 } from "@/lib/game/dailySeed";

// These guard the protected area in docs/AUDIT-CONFIG.md: the daily seed must stay
// deterministic, or every historical daily-leaderboard comparison silently breaks.

describe("todaysDailyKey", () => {
  it("formats a UTC date as YYYY-MM-DD", () => {
    const d = new Date(Date.UTC(2026, 5, 24, 23, 59));
    expect(todaysDailyKey(d)).toBe("2026-06-24");
  });

  it("is the same for any hour within one UTC day", () => {
    const morning = new Date(Date.UTC(2026, 0, 1, 0, 0));
    const night = new Date(Date.UTC(2026, 0, 1, 23, 59));
    expect(todaysDailyKey(morning)).toBe(todaysDailyKey(night));
  });
});

describe("seedFromDateKey", () => {
  it("is deterministic for the same key", () => {
    expect(seedFromDateKey("2026-06-24")).toBe(seedFromDateKey("2026-06-24"));
  });

  it("differs across keys", () => {
    expect(seedFromDateKey("2026-06-24")).not.toBe(seedFromDateKey("2026-06-25"));
  });

  it("returns an unsigned 32-bit integer", () => {
    const s = seedFromDateKey("2026-06-24");
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(0xffffffff);
  });
});

describe("mulberry32", () => {
  it("produces the same sequence for the same seed (fairness guarantee)", () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const seqA = Array.from({ length: 16 }, () => a());
    const seqB = Array.from({ length: 16 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it("returns values in [0, 1)", () => {
    const r = mulberry32(99);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
