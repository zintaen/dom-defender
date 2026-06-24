import { describe, it, expect } from "vitest";
import {
  weekKey,
  tournamentSeed,
  weekStart,
  weekEnd,
  msUntilRollover,
} from "@/lib/game/tournament";

// FR-DD-SOC-003: a server-derived weekly seed that is identical for everyone in
// a week and rolls over deterministically.

const monday = new Date("2026-06-22T09:00:00Z"); // Mon of ISO 2026-W26
const sameWeekSunday = new Date("2026-06-28T23:59:59Z"); // Sun of the same week
const nextMonday = new Date("2026-06-29T00:00:00Z"); // start of 2026-W27

describe("weekKey", () => {
  it("is stable for any moment within the same ISO week", () => {
    expect(weekKey(monday)).toBe(weekKey(sameWeekSunday));
  });

  it("changes at the Monday rollover", () => {
    expect(weekKey(sameWeekSunday)).not.toBe(weekKey(nextMonday));
  });

  it("formats as YYYY-Www", () => {
    expect(weekKey(monday)).toMatch(/^\d{4}-W\d{2}$/);
  });
});

describe("tournamentSeed", () => {
  it("is identical across the week and unsigned 32-bit", () => {
    const s = tournamentSeed(monday);
    expect(s).toBe(tournamentSeed(sameWeekSunday));
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(0xffffffff);
  });

  it("differs across weeks", () => {
    expect(tournamentSeed(monday)).not.toBe(tournamentSeed(nextMonday));
  });
});

describe("week window", () => {
  it("weekStart is a Monday 00:00 UTC", () => {
    const s = weekStart(sameWeekSunday);
    expect(s.getUTCDay()).toBe(1); // Monday
    expect(s.getUTCHours()).toBe(0);
    expect(s.toISOString()).toBe("2026-06-22T00:00:00.000Z");
  });

  it("weekEnd is exactly seven days after weekStart", () => {
    expect(weekEnd(monday).getTime() - weekStart(monday).getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("msUntilRollover is within (0, one week] inside a week and never negative", () => {
    const ms = msUntilRollover(monday);
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000);
  });
});
