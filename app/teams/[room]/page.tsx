"use client";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { allConcepts } from "@/lib/game/conceptMap";

interface Standing {
  rank: number;
  userId: string;
  username: string;
  score: number;
}
interface RoomView {
  code: string;
  seed: number;
  status: "open" | "closed";
  hostUsername: string;
  timeBoxMinutes: number;
  closesAt: string | null;
  standings: Standing[];
}

function timeLeft(closesAt: string | null): string {
  if (!closesAt) return "";
  const ms = new Date(closesAt).getTime() - Date.now();
  if (ms <= 0) return "time up";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${String(s).padStart(2, "0")}s left`;
}

export default function RoomPage() {
  const params = useParams<{ room: string }>();
  const code = String(params?.room ?? "").toUpperCase();
  const { data: session } = useSession();

  const [room, setRoom] = useState<RoomView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [scoreInput, setScoreInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/teams?code=${encodeURIComponent(code)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error ?? "Could not load room.");
        return;
      }
      setRoom(data);
      setErr(null);
    } catch {
      setErr("Network error.");
    }
  }, [code]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, code, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) setErr(data?.error ?? "Action failed.");
      else await load();
    } catch {
      setErr("Network error.");
    } finally {
      setBusy(false);
    }
  };

  const joinUrl = useMemo(
    () => (typeof window !== "undefined" ? `${window.location.origin}/teams/${code}` : `/teams/${code}`),
    [code]
  );
  const meId = (session?.user as { id?: string } | undefined)?.id;
  const isHost = !!room && !!session?.user && room.standings.length > 0 && room.hostUsername === (session?.user as { username?: string }).username;
  const isMember = !!room && !!meId && room.standings.some((s) => s.userId === meId);

  if (err && !room) {
    return (
      <Shell>
        <p className="text-red-300">{err}</p>
        <Link href="/teams" className="text-cyan-300 underline">Back to rooms</Link>
      </Shell>
    );
  }
  if (!room) return <Shell><p className="text-slate-400">Loading room {code}…</p></Shell>;

  const closed = room.status === "closed";

  return (
    <Shell>
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="text-xs uppercase tracking-widest text-cyan-300">Room</div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${closed ? "bg-slate-700 text-slate-300" : "bg-emerald-500/20 text-emerald-300"}`}>
          {closed ? "closed" : timeLeft(room.closesAt) || "open"}
        </span>
      </div>
      <h1 className="text-3xl font-black font-mono tracking-widest mb-3">{room.code}</h1>

      {!isMember && !closed && session?.user && (
        <button onClick={() => act("join")} disabled={busy} className="mb-4 w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-900 font-bold">
          Join this room
        </button>
      )}

      {!closed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <Link href={`/play?seed=${room.seed}`} className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-center font-semibold">
            Play this room
          </Link>
          <button
            onClick={() => { navigator.clipboard?.writeText(joinUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold"
          >
            {copied ? "Link copied" : "Copy join link"}
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 mb-5">
        <div className="font-bold mb-3">Standings</div>
        {room.standings.length === 0 ? (
          <p className="text-slate-400 text-sm">No players yet.</p>
        ) : (
          <ol className="space-y-1.5">
            {room.standings.map((s) => (
              <li key={s.userId} className={`flex items-center justify-between rounded-lg px-3 py-2 ${s.userId === meId ? "bg-cyan-500/10 border border-cyan-500/30" : "bg-slate-800/50"}`}>
                <span className="flex items-center gap-3">
                  <span className="text-slate-400 w-6 text-right">{s.rank}</span>
                  <span className="font-medium">{s.username}</span>
                </span>
                <span className="font-mono">{s.score.toLocaleString()}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {isMember && !closed && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 mb-5">
          <div className="font-bold mb-2">Submit your score</div>
          <p className="text-xs text-slate-500 mb-3">
            Manual entry for now. A later pass routes this through the replay-validated
            score path so the board cannot be gamed.
          </p>
          <div className="flex gap-2">
            <input
              value={scoreInput}
              onChange={(e) => setScoreInput(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Your score"
              inputMode="numeric"
              className="flex-1 bg-slate-800 rounded-lg px-3 py-2 font-mono text-slate-100"
            />
            <button
              onClick={() => { if (scoreInput) { act("submit", { score: Number(scoreInput) }); setScoreInput(""); } }}
              disabled={busy || !scoreInput}
              className="px-4 py-2 rounded-lg bg-slate-700 font-semibold disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {isHost && !closed && (
        <button onClick={() => act("close")} disabled={busy} className="w-full px-4 py-2.5 rounded-xl border border-red-500/40 text-red-300 font-semibold mb-5">
          Close room and reveal recap
        </button>
      )}

      {closed && (
        <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-5">
          <div className="font-bold mb-1">Recap: what each bug was really teaching</div>
          <p className="text-sm text-slate-400 mb-4">
            DOM Defender bugs map to real web engineering concepts. Here is the cheat sheet
            for your team.
          </p>
          <ul className="space-y-3">
            {allConcepts().map((c) => (
              <li key={c.bugType}>
                <div className="font-semibold text-cyan-300">{c.label}</div>
                <div className="text-sm text-slate-300">{c.concept}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {err && <div className="text-sm text-red-300 mt-3">{err}</div>}
      <div className="mt-6"><Link href="/teams" className="text-slate-400 hover:text-slate-200 text-sm">Back to rooms</Link></div>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
      <div className="max-w-lg mx-auto">{children}</div>
    </div>
  );
}
