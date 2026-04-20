"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

interface Row {
  rank: number;
  username: string;
  score: number;
  durationSec: number;
  wave: number;
  bugsFixed: number;
  bossesDefeated: number;
  maxCombo: number;
  skinUsed: string;
  createdAt: string;
}

export default function LeaderboardPageWrapper() {
  return (
    <Suspense fallback={<main className="max-w-4xl mx-auto px-6 py-10 text-slate-400">Loading…</main>}>
      <LeaderboardPage />
    </Suspense>
  );
}

function LeaderboardPage() {
  const params = useSearchParams();
  const router = useRouter();
  const initialMode = params?.get("mode") === "daily" ? "daily" : "endless";
  const initialSeedRaw = params?.get("seed") ?? "";
  const [mode, setMode] = useState<"endless" | "daily">(initialMode);
  const [seedInput, setSeedInput] = useState(initialSeedRaw);
  const [seed, setSeed] = useState<string>(initialSeedRaw);
  const [rows, setRows] = useState<Row[]>([]);
  const [dailyKey, setDailyKey] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ mode, limit: "50" });
    if (seed && /^\d+$/.test(seed)) qs.set("seed", seed);
    fetch(`/api/leaderboard?${qs.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.error) {
          setError(data.error);
          setRows([]);
        } else {
          setRows(data.rows ?? []);
          setDailyKey(data.dailyKey);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Network error");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [mode, seed]);

  const pushUrl = (nextMode: "endless" | "daily", nextSeed: string) => {
    const qs = new URLSearchParams({ mode: nextMode });
    if (nextSeed && /^\d+$/.test(nextSeed)) qs.set("seed", nextSeed);
    router.replace(`/leaderboard?${qs.toString()}`);
  };

  const switchMode = (m: "endless" | "daily") => {
    setMode(m);
    pushUrl(m, seed);
  };

  const applySeed = () => {
    const clean = seedInput.trim();
    setSeed(clean);
    pushUrl(mode, clean);
  };
  const clearSeed = () => {
    setSeedInput("");
    setSeed("");
    pushUrl(mode, "");
  };

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-4xl font-black tracking-tight">🏆 Leaderboard</h1>
          {mode === "daily" && dailyKey && (
            <p className="text-slate-400 text-sm mt-1">
              Daily challenge for <span className="text-yellow-300 font-mono">{dailyKey}</span>{" "}
              — same seed for every player.
            </p>
          )}
          {mode === "endless" && !seed && (
            <p className="text-slate-400 text-sm mt-1">All-time best scores in endless mode.</p>
          )}
          {seed && /^\d+$/.test(seed) && (
            <p className="text-slate-400 text-sm mt-1">
              Filtered to seed{" "}
              <span className="text-violet-300 font-mono">{seed}</span> —{" "}
              <Link
                href={`/play?seed=${seed}`}
                className="underline decoration-dotted hover:text-violet-200"
              >
                play this seed
              </Link>
              .{" "}
              <button onClick={clearSeed} className="ml-2 underline decoration-dotted text-slate-500 hover:text-slate-300">
                clear
              </button>
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
            <ModeBtn active={mode === "endless"} onClick={() => switchMode("endless")}>
              Endless
            </ModeBtn>
            <ModeBtn active={mode === "daily"} onClick={() => switchMode("daily")}>
              Daily
            </ModeBtn>
          </div>
          {mode === "endless" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                applySeed();
              }}
              className="flex items-center gap-1"
            >
              <input
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value.replace(/\D/g, ""))}
                placeholder="Filter by seed…"
                inputMode="numeric"
                className="w-36 px-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-800 font-mono text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!seedInput || !/^\d+$/.test(seedInput)}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-50"
              >
                Apply
              </button>
            </form>
          )}
        </div>
      </div>

      {loading && <div className="text-slate-400">Loading…</div>}
      {error && <div className="text-red-400">⚠ {error}</div>}

      {!loading && !error && rows.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-10 text-center">
          <div className="text-4xl mb-3">🦗</div>
          <p className="text-slate-300 font-semibold mb-1">No scores yet.</p>
          <p className="text-slate-500 text-sm mb-5">
            {mode === "daily"
              ? "Be the first to play today's daily challenge."
              : "Be the first to drop a score on the board."}
          </p>
          <Link
            href={mode === "daily" ? "/daily" : "/play"}
            className="inline-block px-5 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-900 font-bold"
          >
            Play now →
          </Link>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="text-left px-4 py-3 w-12">#</th>
                <th className="text-left px-4 py-3">Player</th>
                <th className="text-right px-4 py-3">Score</th>
                <th className="text-right px-4 py-3 hidden sm:table-cell">Time</th>
                <th className="text-right px-4 py-3 hidden md:table-cell">Wave</th>
                <th className="text-right px-4 py-3 hidden md:table-cell">Combo</th>
                <th className="text-right px-4 py-3 hidden lg:table-cell">Bosses</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.rank} className="border-t border-slate-800/60 hover:bg-slate-900/40">
                  <td className="px-4 py-3 font-mono text-slate-500">
                    {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : r.rank}
                  </td>
                  <td className="px-4 py-3 font-semibold">{r.username}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-cyan-300">
                    {r.score.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-400 hidden sm:table-cell font-mono">
                    {r.durationSec}s
                  </td>
                  <td className="px-4 py-3 text-right text-violet-300 hidden md:table-cell font-mono">
                    {r.wave}
                  </td>
                  <td className="px-4 py-3 text-right text-pink-300 hidden md:table-cell font-mono">
                    x{r.maxCombo}
                  </td>
                  <td className="px-4 py-3 text-right text-orange-300 hidden lg:table-cell font-mono">
                    {r.bossesDefeated}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function ModeBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
        active
          ? "bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-900"
          : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
