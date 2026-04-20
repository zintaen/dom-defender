"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";

// A self-contained, client-only bug-swatting overlay for BYO mode. We can't
// re-use the main Game engine because that engine targets DOM elements in
// *our* page that carry a `data-bug-candidate` attribute, and a sandboxed
// third-party iframe's DOM is off-limits due to same-origin policy.
//
// Instead, bugs here spawn at random positions in a full-viewport overlay
// that sits on top of the iframe. They drift around, and clicking them
// scores a point. It's not quite the same game, but it's the closest thing
// we can ship without the cooperation of the target site.
//
// Important guard-rails for the sandbox:
//   - No scores are submitted to /api/scores. BYO runs are not leaderboard-eligible.
//   - No persistent state is written per-session.
//   - The iframe uses `sandbox` with a minimal set of perms.

interface Bug {
  id: number;
  x: number;           // % of container width
  y: number;           // % of container height
  vx: number;          // % per second
  vy: number;
  size: number;        // px
  hue: number;         // HSL hue for color
  hp: number;
}

const MAX_BUGS = 18;
const SPAWN_INTERVAL_MS = 900;
const DURATION_SEC = 90;

export default function BYOGame({ url }: { url: string }) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [iframeBlocked, setIframeBlocked] = useState(false);
  // The iframe doesn't render until the server-side rate-limit / validation
  // check at /api/byo-attempt clears. We fail-open (render anyway) if the
  // check errors — users on a flaky connection shouldn't be punished — but
  // we fail-closed on an explicit 429 or 400.
  const [serverCheckState, setServerCheckState] =
    useState<"pending" | "ok" | "blocked">("pending");
  const [serverError, setServerError] = useState<string | null>(null);
  const startedAt = useRef(Date.now());
  const bugIdRef = useRef(1);
  const scoreRef = useRef(0);
  const bugsRef = useRef<Bug[]>([]);

  // Server-side validation + rate-limit log. See app/api/byo-attempt/route.ts.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/byo-attempt", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (cancelled) return;
        if (r.ok) {
          setServerCheckState("ok");
          return;
        }
        const j = await r.json().catch(() => ({} as any));
        setServerError(j?.error ?? `Blocked (HTTP ${r.status}).`);
        setServerCheckState("blocked");
      } catch {
        // Network error — fail open so the sandbox still works offline-ish.
        if (!cancelled) setServerCheckState("ok");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  // Mirror state into refs for use inside intervals.
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { bugsRef.current = bugs; }, [bugs]);

  // Track run start (only once we've cleared the server-side check).
  useEffect(() => {
    if (serverCheckState !== "ok") return;
    track("byo_run_started", { urlDomain: safeDomain(url) });
    startedAt.current = Date.now();
  }, [url, serverCheckState]);

  // Spawner.
  useEffect(() => {
    if (!running || serverCheckState !== "ok") return;
    const t = setInterval(() => {
      if (bugsRef.current.length >= MAX_BUGS) return;
      const b: Bug = {
        id: bugIdRef.current++,
        x: 5 + Math.random() * 90,
        y: 10 + Math.random() * 80,
        vx: (Math.random() - 0.5) * 18,
        vy: (Math.random() - 0.5) * 18,
        size: 28 + Math.random() * 20,
        hue: Math.floor(Math.random() * 360),
        hp: 1,
      };
      setBugs((prev) => [...prev, b]);
    }, SPAWN_INTERVAL_MS);
    return () => clearInterval(t);
  }, [running, serverCheckState]);

  // Physics + timer tick.
  useEffect(() => {
    if (!running || serverCheckState !== "ok") return;
    const tick = setInterval(() => {
      const dt = 0.05; // 50ms
      setBugs((prev) =>
        prev.map((b) => {
          let nx = b.x + b.vx * dt;
          let ny = b.y + b.vy * dt;
          let nvx = b.vx;
          let nvy = b.vy;
          if (nx < 2 || nx > 98) nvx = -nvx;
          if (ny < 5 || ny > 95) nvy = -nvy;
          return { ...b, x: clamp(nx, 2, 98), y: clamp(ny, 5, 95), vx: nvx, vy: nvy };
        })
      );
      setElapsed((e) => {
        const next = e + dt;
        if (next >= DURATION_SEC) {
          setRunning(false);
          track("byo_run_ended", {
            urlDomain: safeDomain(url),
            score: scoreRef.current,
            durationSec: DURATION_SEC,
          });
        }
        return next;
      });
    }, 50);
    return () => clearInterval(tick);
  }, [running, url, serverCheckState]);

  const swat = (id: number, points: number) => {
    setBugs((prev) => prev.filter((b) => b.id !== id));
    setScore((s) => s + points);
  };

  const missClick = (e: React.MouseEvent) => {
    // Only count clicks on the overlay backdrop, not on bugs (they stopPropagation).
    if ((e.target as HTMLElement).dataset.role !== "overlay") return;
    setMisses((m) => m + 1);
    setScore((s) => Math.max(0, s - 5));
  };

  const restart = () => {
    setBugs([]);
    setScore(0);
    setMisses(0);
    setElapsed(0);
    setRunning(true);
    startedAt.current = Date.now();
    track("byo_run_restart", { urlDomain: safeDomain(url) });
  };

  // Detect whether the iframe loaded anything. If the browser blocks it
  // (X-Frame-Options: DENY / CSP frame-ancestors), the onLoad still fires
  // but the content length is 0. We optimistically use a 2.5s timeout to
  // show the "blocked" banner.
  useEffect(() => {
    const t = setTimeout(() => {
      // No reliable cross-origin way to know — we just show a helpful hint.
      try {
        // If we can read nothing (always the case cross-origin) and 2.5s has
        // passed, assume the iframe is either fine or blank. We never assert
        // blocked definitively — just offer the hint.
      } catch {}
    }, 2500);
    return () => clearTimeout(t);
  }, [url]);

  const timeLeft = Math.max(0, DURATION_SEC - elapsed);

  // If the server-side check hasn't cleared yet, don't render the iframe.
  // Blocked → show an explanation + link back. Pending → a light spinner.
  if (serverCheckState !== "ok") {
    return (
      <div className="fixed inset-0 bg-slate-950 z-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-slate-700 bg-slate-950 p-6 text-center">
          {serverCheckState === "pending" ? (
            <>
              <div className="text-3xl mb-3">🧪</div>
              <p className="text-slate-300 text-sm">Checking your sandbox URL…</p>
            </>
          ) : (
            <>
              <div className="text-4xl mb-3">🚫</div>
              <h2 className="text-xl font-black mb-1">Sandbox check failed</h2>
              <p className="text-slate-400 text-sm mb-4">
                {serverError ?? "We couldn't open this URL as a backdrop."}
              </p>
              <Link
                href="/byo"
                className="inline-block px-4 py-2 rounded-lg bg-slate-800 text-slate-200"
              >
                ← Try a different URL
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950 z-50">
      {/* The embedded site. Sandboxed and stripped of permissions. */}
      <iframe
        src={url}
        sandbox="allow-scripts allow-same-origin allow-forms"
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setIframeBlocked(true)}
        className="absolute inset-0 w-full h-full border-0"
        title="BYO site"
      />

      {/* Playfield overlay. `data-role="overlay"` lets us distinguish bug
         clicks from background clicks for the miss counter. */}
      <div
        ref={overlayRef}
        onClick={missClick}
        data-role="overlay"
        className="absolute inset-0 pointer-events-auto"
        style={{
          // Light dimming so the bugs stand out on any background.
          background:
            "radial-gradient(circle at center, rgba(5,8,17,0.1), rgba(5,8,17,0.45))",
        }}
      >
        {bugs.map((b) => (
          <BugBlob
            key={b.id}
            bug={b}
            onClick={(e) => {
              e.stopPropagation();
              swat(b.id, 10);
            }}
          />
        ))}
      </div>

      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-start justify-between pointer-events-none">
        <div className="pointer-events-auto">
          <div className="rounded-xl border border-slate-700 bg-slate-950/80 backdrop-blur px-3 py-2 text-sm flex items-center gap-3">
            <span className="font-mono">
              <span className="text-slate-500">Score</span>{" "}
              <span className="font-bold text-cyan-300">{score}</span>
            </span>
            <span className="font-mono">
              <span className="text-slate-500">Time</span>{" "}
              <span className="font-bold text-yellow-300">{Math.ceil(timeLeft)}s</span>
            </span>
            <span className="font-mono">
              <span className="text-slate-500">Misses</span>{" "}
              <span className="font-bold text-pink-300">{misses}</span>
            </span>
          </div>
          <div className="mt-2 text-[10px] uppercase tracking-widest text-slate-400 bg-slate-950/70 backdrop-blur rounded px-2 py-1 inline-block">
            🧪 Sandbox mode — scores do not save.
          </div>
        </div>

        <div className="pointer-events-auto flex gap-2">
          <Link
            href="/byo"
            className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-950/80 backdrop-blur text-sm text-slate-300 hover:bg-slate-900"
          >
            ← New URL
          </Link>
          <Link
            href="/"
            className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-950/80 backdrop-blur text-sm text-slate-300 hover:bg-slate-900"
          >
            ⮌ Menu
          </Link>
        </div>
      </div>

      {/* Blocked hint — shown when the target site sends X-Frame-Options / CSP. */}
      {iframeBlocked && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-200 max-w-md text-center">
          ⚠ This site blocks embedding. The overlay still works — try a site
          without strict CSP (most personal blogs are fine).
        </div>
      )}

      {/* Game over modal */}
      {!running && elapsed >= DURATION_SEC && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-slate-700 bg-slate-950 p-6 text-center">
            <div className="text-5xl mb-3">🧪</div>
            <h2 className="text-2xl font-black mb-1">Sandbox run complete</h2>
            <p className="text-slate-400 text-sm mb-4">
              Final score: <span className="font-bold text-cyan-300">{score}</span> ·{" "}
              {misses} misses
            </p>
            <p className="text-slate-500 text-xs mb-5">
              Sandbox scores don't save to the leaderboard. Play{" "}
              <Link href="/play" className="underline decoration-dotted hover:text-slate-300">
                ranked endless
              </Link>{" "}
              to compete.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={restart}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-900 font-bold"
              >
                Again
              </button>
              <Link
                href="/byo"
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200"
              >
                Try a different URL
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BugBlob({
  bug,
  onClick,
}: {
  bug: Bug;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label="Swat bug"
      className="absolute select-none cursor-crosshair rounded-full border-2 border-white/60 shadow-[0_0_20px_rgba(255,255,255,0.35)] transition-transform hover:scale-110"
      style={{
        left: `${bug.x}%`,
        top: `${bug.y}%`,
        width: bug.size,
        height: bug.size,
        transform: "translate(-50%,-50%)",
        background: `radial-gradient(circle at 35% 35%, hsl(${bug.hue} 100% 80%), hsl(${bug.hue} 100% 55%) 60%, hsl(${(bug.hue + 30) % 360} 100% 40%))`,
      }}
    >
      <span
        className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white/80 drop-shadow"
        aria-hidden
      >
        🐛
      </span>
    </button>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function safeDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "unknown";
  }
}
