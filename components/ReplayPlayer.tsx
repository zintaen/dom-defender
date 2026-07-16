"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ReplayEvent, ReplaySnapshot } from "@/lib/game/replay";
import { coachRun } from "@/lib/game/coach";

// Timeline chart dimensions. Module-level constants so the hooks below do not
// need to list them as dependencies.
const CHART_W = 720;
const CHART_H = 180;
const pad = 8;

export interface ReplayPayload {
  shortId: string;
  username: string | null;
  mode: "endless" | "daily";
  seed: number | null;
  dailyKey: string | null;
  skinId: string;
  durationSec: number;
  score: number;
  wave: number;
  bugsFixed: number;
  bossesDefeated: number;
  maxCombo: number;
  events: ReplayEvent[];
  snapshots: ReplaySnapshot[];
  createdAt: string;
}

const TOOL_ICON: Record<string, string> = {
  tape: "🩹",
  debugger: "🔨",
  vacuum: "🌀",
};
const POWERUP_ICON: Record<string, string> = {
  freeze: "❄",
  autofix: "✨",
  magnet: "🧲",
  shield: "🛡",
};

// Colors
const COLOR_SCORE = "#22d3ee";
const COLOR_CRASH = "#f87171";
const COLOR_WAVE = "#a78bfa";

export default function ReplayPlayer({ replay }: { replay: ReplayPayload }) {
  const duration = Math.max(1, replay.durationSec);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  // RAF loop
  useEffect(() => {
    if (!playing) return;
    const step = (now: number) => {
      const dtMs = now - (lastTickRef.current || now);
      lastTickRef.current = now;
      setT((prev) => {
        const next = prev + (dtMs / 1000) * speed;
        if (next >= duration) {
          setPlaying(false);
          return duration;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    lastTickRef.current = 0;
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, speed, duration]);

  // State at time t
  const { currentSnap, currentTool, activeEvents, maxScore, maxCrash } = useMemo(() => {
    const snaps = replay.snapshots;
    let cur: ReplaySnapshot | null = null;
    for (const s of snaps) {
      if (s.t <= t) cur = s;
      else break;
    }
    let tool = "tape";
    for (const e of replay.events) {
      if (e.t > t) break;
      if (e.type === "tool") tool = e.tool;
    }
    const recent = replay.events.filter((e) => e.t <= t && e.t > t - 1.5 && e.type !== "tool");
    const maxS = snaps.reduce((m, s) => Math.max(m, s.score), 0) || replay.score || 1;
    const maxC = 100;
    return { currentSnap: cur, currentTool: tool, activeEvents: recent, maxScore: maxS, maxCrash: maxC };
  }, [t, replay]);

  // Timeline chart scales, memoized so the path useMemos below stay stable
  // (each only changes when its inputs do).
  const xScale = useCallback((tt: number) => pad + (tt / duration) * (CHART_W - pad * 2), [duration]);
  const yScoreScale = useCallback((s: number) => CHART_H - pad - (s / maxScore) * (CHART_H - pad * 2), [maxScore]);
  const yCrashScale = useCallback((c: number) => CHART_H - pad - (c / maxCrash) * (CHART_H - pad * 2), [maxCrash]);

  const scorePath = useMemo(() => pathFrom(replay.snapshots, (s) => [xScale(s.t), yScoreScale(s.score)]), [replay.snapshots, xScale, yScoreScale]);
  const crashPath = useMemo(() => pathFrom(replay.snapshots, (s) => [xScale(s.t), yCrashScale(s.crash)]), [replay.snapshots, xScale, yCrashScale]);

  // AI coach tips for this run (TASK-DD-AI-002), derived deterministically from the replay.
  const coachTips = useMemo(
    () =>
      coachRun({
        mode: replay.mode,
        skinId: replay.skinId,
        startedAt: 0,
        durationSec: replay.durationSec,
        events: replay.events,
        snapshots: replay.snapshots,
        summary: {
          score: replay.score,
          wave: replay.wave,
          bugsFixed: replay.bugsFixed,
          bossesDefeated: replay.bossesDefeated,
          maxCombo: replay.maxCombo,
        },
      } as any),
    [replay]
  );

  // Event markers for the timeline (waves, boss events, power-ups)
  const markers = replay.events.filter((e) =>
    e.type === "wave" || e.type === "boss_spawn" || e.type === "boss_down" || e.type === "powerup"
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="text-sm text-slate-400 hover:text-white">← Home</Link>
          <div className="text-xs text-slate-500">
            Replay <span className="font-mono text-slate-300">{replay.shortId}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-cyan-300 mb-1">
                {replay.mode === "daily" ? `Daily Challenge · ${replay.dailyKey ?? ""}` : "Endless Mode"}
              </div>
              <h1 className="text-3xl font-black tracking-tight">
                {replay.username ? `${replay.username}'s run` : "Anonymous run"}
              </h1>
              <div className="text-sm text-slate-400 mt-1">
                {new Date(replay.createdAt).toLocaleString()} · skin:{" "}
                <span className="text-slate-200">{replay.skinId}</span>
                {replay.seed != null && (
                  <>
                    {" · "}seed:{" "}
                    <Link
                      href={`/play?seed=${replay.seed}`}
                      className="text-violet-300 hover:text-violet-200 underline"
                      title="Play this exact bug sequence yourself"
                    >
                      {replay.seed}
                    </Link>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href={
                  replay.seed != null
                    ? `/play?seed=${replay.seed}`
                    : replay.mode === "daily"
                    ? "/daily"
                    : "/play"
                }
                className="px-3 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-900 font-semibold text-sm"
              >
                Challenge this seed →
              </Link>
            </div>
          </div>

          {/* Run summary */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
            <Stat label="Score" value={replay.score.toLocaleString()} color="text-cyan-300" />
            <Stat label="Wave" value={String(replay.wave)} color="text-violet-300" />
            <Stat label="Time" value={`${replay.durationSec}s`} color="text-slate-200" />
            <Stat label="Fixed" value={String(replay.bugsFixed)} color="text-emerald-300" />
            <Stat label="Bosses" value={String(replay.bossesDefeated)} color="text-orange-300" />
            <Stat label="Best Combo" value={`x${replay.maxCombo}`} color="text-pink-300" />
          </div>

          {/* AI coach (TASK-DD-AI-002) */}
          {coachTips.length > 0 && (
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 mb-4">
              <div className="text-xs uppercase tracking-widest text-cyan-300 mb-2">Coach</div>
              <ul className="space-y-3">
                {coachTips.map((tip, i) => (
                  <li key={i}>
                    <div className="font-semibold text-slate-100">{tip.title}</div>
                    <div className="text-sm text-slate-300">{tip.detail}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{tip.evidence}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Timeline chart */}
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 mb-4">
            <div className="flex items-center justify-between mb-2 text-xs">
              <div className="flex items-center gap-4 text-slate-400">
                <LegendSwatch color={COLOR_SCORE} label="Score" />
                <LegendSwatch color={COLOR_CRASH} label="Crash %" />
              </div>
              <div className="font-mono text-slate-500">
                {formatTime(t)} / {formatTime(duration)}
              </div>
            </div>
            <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full h-44 block">
              {/* Grid */}
              <rect x={0} y={0} width={CHART_W} height={CHART_H} fill="transparent" />
              {[0.25, 0.5, 0.75].map((f) => (
                <line
                  key={f}
                  x1={pad}
                  y1={CHART_H * f}
                  x2={CHART_W - pad}
                  y2={CHART_H * f}
                  stroke="#1e293b"
                  strokeDasharray="3 4"
                />
              ))}
              {/* Wave markers */}
              {markers.map((m, i) => (
                <line
                  key={i}
                  x1={xScale(m.t)}
                  x2={xScale(m.t)}
                  y1={pad}
                  y2={CHART_H - pad}
                  stroke={markerColor(m)}
                  strokeOpacity={0.5}
                  strokeWidth={1}
                />
              ))}
              {/* Crash area */}
              <path d={crashPath + ` L${xScale(duration)},${CHART_H - pad} L${pad},${CHART_H - pad} Z`} fill={COLOR_CRASH} fillOpacity={0.08} />
              <path d={crashPath} fill="none" stroke={COLOR_CRASH} strokeWidth={2} />
              {/* Score line */}
              <path d={scorePath} fill="none" stroke={COLOR_SCORE} strokeWidth={2} />
              {/* Playhead */}
              <line x1={xScale(t)} x2={xScale(t)} y1={0} y2={CHART_H} stroke="#fde047" strokeWidth={2} />
            </svg>

            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={t}
              onChange={(e) => {
                setPlaying(false);
                setT(Number(e.target.value));
              }}
              className="w-full mt-2 accent-yellow-300"
              aria-label="Scrub replay"
            />
          </div>

          {/* Transport + live snapshot */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <button
              onClick={() => {
                if (t >= duration) setT(0);
                setPlaying((p) => !p);
              }}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 font-semibold text-sm"
            >
              {playing ? "⏸ Pause" : "▶ Play"}
            </button>
            <button
              onClick={() => {
                setPlaying(false);
                setT(0);
              }}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm"
            >
              ⟲ Restart
            </button>
            <div className="flex items-center gap-1 text-xs">
              {[1, 2, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s as 1 | 2 | 4)}
                  className={`px-2 py-1 rounded ${
                    speed === s ? "bg-cyan-500/20 text-cyan-200 border border-cyan-500/40" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {s}×
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-4 text-sm">
              <span>
                Score <span className="font-mono font-bold text-cyan-300">{currentSnap?.score.toLocaleString() ?? 0}</span>
              </span>
              <span>
                Wave <span className="font-mono font-bold text-violet-300">{currentSnap?.wave ?? 1}</span>
              </span>
              <span>
                Crash <span className="font-mono font-bold text-red-300">{currentSnap?.crash.toFixed(1) ?? "0.0"}%</span>
              </span>
              <span>
                Tool <span className="font-mono font-bold text-yellow-300">{TOOL_ICON[currentTool] ?? "?"} {currentTool}</span>
              </span>
            </div>
          </div>

          {/* Ticker of recent events */}
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 min-h-[3.5rem]">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Live ticker</div>
            <div className="flex flex-wrap gap-2">
              {activeEvents.length === 0 ? (
                <span className="text-slate-600 text-sm italic">…</span>
              ) : (
                activeEvents.map((e, i) => <EventChip key={i} e={e} />)
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/leaderboard" className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm">
            View leaderboard
          </Link>
          <Link href="/play" className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm">
            Play endless
          </Link>
          <Link href="/daily" className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm">
            Play daily
          </Link>
        </div>
      </div>
    </div>
  );
}

function pathFrom(snaps: ReplaySnapshot[], project: (s: ReplaySnapshot) => [number, number]): string {
  if (snaps.length === 0) return "";
  return snaps
    .map((s, i) => {
      const [x, y] = project(s);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function markerColor(e: ReplayEvent): string {
  if (e.type === "wave") return "#a78bfa";
  if (e.type === "boss_spawn") return "#f97316";
  if (e.type === "boss_down") return "#fde047";
  if (e.type === "powerup") return "#22d3ee";
  return "#64748b";
}

function EventChip({ e }: { e: ReplayEvent }) {
  if (e.type === "wave") {
    return <span className="text-xs px-2 py-1 rounded bg-violet-500/20 text-violet-200">Wave {e.wave}</span>;
  }
  if (e.type === "boss_spawn") {
    return <span className="text-xs px-2 py-1 rounded bg-orange-500/20 text-orange-200">Boss spawned</span>;
  }
  if (e.type === "boss_hit") {
    return <span className="text-xs px-2 py-1 rounded bg-orange-500/10 text-orange-300">Boss hit</span>;
  }
  if (e.type === "boss_down") {
    return <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-200 font-bold">BOSS DOWN</span>;
  }
  if (e.type === "powerup") {
    return (
      <span className="text-xs px-2 py-1 rounded bg-cyan-500/20 text-cyan-200">
        {POWERUP_ICON[e.id] ?? "⚡"} {e.id}
      </span>
    );
  }
  if (e.type === "fix") {
    return <span className="text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-300">+{e.score}</span>;
  }
  if (e.type === "combo") {
    return <span className="text-xs px-2 py-1 rounded bg-pink-500/20 text-pink-200 font-bold">x{e.value} COMBO</span>;
  }
  return null;
}

function Stat({ label, value, color = "text-white" }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl p-3 text-center bg-slate-900/80 border border-slate-800">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">{label}</div>
      <div className={`font-mono font-black text-lg ${color}`}>{value}</div>
    </div>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-block w-3 h-3 rounded-sm" style={{ background: color }} />
      <span>{label}</span>
    </span>
  );
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}
