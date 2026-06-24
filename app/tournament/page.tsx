"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import PlayShell from "@/components/PlayShell";

// FR-DD-SOC-003 weekly tournament: one server-seeded run for the whole week,
// a live ranked board, and a countdown to rollover. Entry drops into a seeded
// PlayShell run submitted as mode "tournament".

interface Row {
  rank: number;
  username: string;
  score: number;
  wave: number;
  bugsFixed: number;
  durationSec: number;
}
interface TournamentData {
  weekKey: string;
  seed: number;
  startsAt: string;
  endsAt: string;
  msUntilRollover: number;
  rows: Row[];
}

function fmtCountdown(ms: number): string {
  if (ms <= 0) return "rolling over...";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${String(sec).padStart(2, "0")}s`;
  return `${m}m ${String(sec).padStart(2, "0")}s`;
}

export default function TournamentPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<TournamentData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [playing, setPlaying] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tournament", { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) {
        setErr(d?.error ?? "Could not load the tournament.");
        return;
      }
      setData(d);
      setErr(null);
    } catch {
      setErr("Network error.");
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (playing && data) {
    return <PlayShell mode="tournament" initialSeed={data.seed} dailyKey={data.weekKey} />;
  }

  const remaining = data ? new Date(data.endsAt).getTime() - now : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="text-xs uppercase tracking-widest text-cyan-300 mb-1">Weekly tournament</div>
        <h1 className="text-3xl font-black mb-2">One seed. One week. One board.</h1>
        <p className="text-slate-400 mb-6">
          Everyone plays the same bug pattern this week. The seed is set by the server, so no one
          can practice it early. Top the board before it freezes.
        </p>

        {data && (
          <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-5 mb-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-500">This week</div>
              <div className="font-mono font-bold text-lg">{data.weekKey}</div>
              <div className="text-sm text-slate-400 mt-1">Closes in {fmtCountdown(remaining)}</div>
            </div>
            <button
              onClick={() => setPlaying(true)}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-900 font-bold"
            >
              Play this week
            </button>
          </div>
        )}

        {!session?.user && (
          <p className="text-sm text-slate-500 mb-5">
            You can play as a guest, but{" "}
            <Link href="/login" className="text-cyan-300 underline">sign in</Link> to land on the board.
          </p>
        )}

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="font-bold mb-3">Standings</div>
          {err && <p className="text-sm text-red-300">{err}</p>}
          {!err && data && data.rows.length === 0 && (
            <p className="text-slate-400 text-sm">No scores yet this week. Be the first.</p>
          )}
          {data && data.rows.length > 0 && (
            <ol className="space-y-1.5">
              {data.rows.map((r) => {
                const mine = r.username === (session?.user as { username?: string } | undefined)?.username;
                return (
                  <li
                    key={`${r.rank}-${r.username}`}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 ${mine ? "bg-cyan-500/10 border border-cyan-500/30" : "bg-slate-800/50"}`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-slate-400 w-6 text-right">{r.rank}</span>
                      <Link href={`/u/${r.username}`} className="font-medium hover:text-cyan-300 hover:underline">
                        {r.username}
                      </Link>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">wave {r.wave}</span>
                      <span className="font-mono">{r.score.toLocaleString()}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="mt-6">
          <Link href="/leaderboard" className="text-slate-400 hover:text-slate-200 text-sm">
            All-time and daily boards
          </Link>
        </div>
      </div>
    </div>
  );
}
