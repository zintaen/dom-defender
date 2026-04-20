// Replay system — compact, shareable "ghost track" of a run.
//
// Design:
// - We DO NOT try to re-simulate the game pixel-perfect. That would require
//   capturing viewport, cursor path, and every RNG call, and would only work
//   back at the same resolution the run was recorded at.
// - Instead, we capture (a) a timestamped event log of meaningful moments
//   (tool switches, power-ups, bug fixes, wave ups, boss events) and
//   (b) per-second snapshots of score / crash / wave / bugs-on-screen.
// - A player can re-watch the curve and the event markers to relive the run
//   and compare against someone else's.
// - The seed + mode + dailyKey fields let a viewer "Play this seed" to try
//   the identical bug sequence for themselves (wires up to task #3).

export type ReplayToolId = "tape" | "debugger" | "vacuum";

export type ReplayEvent =
  | { t: number; type: "tool"; tool: ReplayToolId }
  | { t: number; type: "powerup"; id: string }
  | { t: number; type: "fix"; bugType: string; score: number }
  | { t: number; type: "wave"; wave: number }
  | { t: number; type: "boss_spawn" }
  | { t: number; type: "boss_hit" }
  | { t: number; type: "boss_down" }
  | { t: number; type: "combo"; value: number };

export interface ReplaySnapshot {
  t: number;
  score: number;
  crash: number;
  wave: number;
  bugs: number;
}

export interface ReplayLog {
  mode: "endless" | "daily";
  seed?: number;
  dailyKey?: string;
  skinId: string;
  startedAt: number;
  durationSec: number;
  events: ReplayEvent[];
  snapshots: ReplaySnapshot[];
  summary: {
    score: number;
    wave: number;
    bugsFixed: number;
    bossesDefeated: number;
    maxCombo: number;
  };
}

// Max payload we accept server-side. Roughly ~30 KB of JSON — enough for a
// 20-minute run even with dense events.
export const REPLAY_MAX_EVENTS = 3000;
export const REPLAY_MAX_SNAPSHOTS = 2000;

// Short, URL-safe, base32-ish ID. Lowercase only, no l/0/o to avoid confusion.
const ID_ALPHA = "abcdefghijkmnpqrstuvwxyz23456789";
export function makeShortId(len = 10): string {
  let s = "";
  for (let i = 0; i < len; i++) {
    s += ID_ALPHA[Math.floor(Math.random() * ID_ALPHA.length)];
  }
  return s;
}

export function isValidShortId(id: string): boolean {
  return typeof id === "string" && id.length >= 6 && id.length <= 24 && /^[a-z2-9]+$/.test(id);
}

// Small recorder used inside Game.tsx to buffer events without triggering
// re-renders. Host keeps it in a useRef.
export class ReplayRecorder {
  private startedAt = 0;
  private events: ReplayEvent[] = [];
  private snapshots: ReplaySnapshot[] = [];
  private lastSnapshotT = -1;

  reset(startedAt: number) {
    this.startedAt = startedAt;
    this.events = [];
    this.snapshots = [];
    this.lastSnapshotT = -1;
  }

  // t = seconds since run start. Caller is responsible for providing it.
  // We use a permissive input type because discriminated-union Omit collapses
  // poorly in TS; we re-narrow when shaping the stored event.
  push(event: { type: ReplayEvent["type"]; t?: number; [k: string]: any }, nowMs: number) {
    if (this.events.length >= REPLAY_MAX_EVENTS) return;
    const t = event.t ?? Math.max(0, (nowMs - this.startedAt) / 1000);
    const { t: _ignored, ...rest } = event;
    this.events.push({ ...rest, t: Number(t.toFixed(2)) } as ReplayEvent);
  }

  // Take a snapshot at most once per second.
  tick(nowMs: number, data: Omit<ReplaySnapshot, "t">) {
    if (this.snapshots.length >= REPLAY_MAX_SNAPSHOTS) return;
    const t = Math.floor((nowMs - this.startedAt) / 1000);
    if (t === this.lastSnapshotT) return;
    this.lastSnapshotT = t;
    this.snapshots.push({
      t,
      score: data.score,
      crash: Math.round(data.crash * 10) / 10,
      wave: data.wave,
      bugs: data.bugs,
    });
  }

  build(params: {
    mode: "endless" | "daily";
    seed?: number;
    dailyKey?: string;
    skinId: string;
    durationSec: number;
    summary: ReplayLog["summary"];
  }): ReplayLog {
    return {
      mode: params.mode,
      seed: params.seed,
      dailyKey: params.dailyKey,
      skinId: params.skinId,
      startedAt: this.startedAt,
      durationSec: params.durationSec,
      events: this.events.slice(),
      snapshots: this.snapshots.slice(),
      summary: params.summary,
    };
  }
}
