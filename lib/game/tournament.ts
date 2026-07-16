// TASK-DD-SOC-003 weekly tournament: one shared seed per ISO week, derived
// server-side from the week key so no one can pre-practice a forged seed.
// Reuses the daily-seed hash for a stable single-seed PRNG input.
import { seedFromDateKey } from "./dailySeed";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// ISO-8601 week label in UTC, e.g. "2026-W26". The ISO year can differ from the
// calendar year in the first/last days of a year, which is why we resolve the
// year from the week's Thursday.
export function weekKey(d: Date = new Date()): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // move to this week's Thursday
  const isoYear = date.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / WEEK_MS);
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

// Deterministic unsigned 32-bit seed for the tournament week. Server-derived:
// callers pass a Date (default now), never a client-supplied seed.
export function tournamentSeed(d: Date = new Date()): number {
  return seedFromDateKey(weekKey(d)) >>> 0;
}

// Monday 00:00 UTC that opens the week containing d.
export function weekStart(d: Date = new Date()): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0
  date.setUTCDate(date.getUTCDate() - dayNum);
  return date;
}

// Monday 00:00 UTC that closes the week (start of the next week).
export function weekEnd(d: Date = new Date()): Date {
  return new Date(weekStart(d).getTime() + WEEK_MS);
}

// Milliseconds until the current week rolls over (never negative).
export function msUntilRollover(d: Date = new Date()): number {
  return Math.max(0, weekEnd(d).getTime() - d.getTime());
}
