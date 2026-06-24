"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface FeedItem {
  username: string;
  score: number;
  wave: number;
  mode: string;
  createdAt: string;
}

function ago(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function FeedPage() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/feed", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.error) setErr(d.error);
        else setItems(d.items ?? []);
      })
      .catch(() => setErr("Network error."));
  }, [status]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-black mb-1">Following</h1>
        <p className="text-slate-400 mb-6">Recent runs from the players you follow.</p>

        {status === "unauthenticated" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center">
            <p className="text-slate-300 mb-4">Sign in to see your following feed.</p>
            <Link href="/login" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-900 font-bold">
              Sign in
            </Link>
          </div>
        )}

        {status === "authenticated" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            {err && <p className="text-sm text-red-300">{err}</p>}
            {!err && items === null && <p className="text-slate-400 text-sm">Loading...</p>}
            {!err && items && items.length === 0 && (
              <p className="text-slate-400 text-sm">
                Nothing yet. Follow some players from the{" "}
                <Link href="/leaderboard" className="text-cyan-300 underline">leaderboard</Link> to fill this in.
              </p>
            )}
            {items && items.length > 0 && (
              <ul className="space-y-1.5">
                {items.map((it, i) => (
                  <li
                    key={`${it.username}-${it.createdAt}-${i}`}
                    className="flex items-center justify-between rounded-lg px-3 py-2 bg-slate-800/50"
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Link href={`/u/${it.username}`} className="font-medium text-cyan-300 hover:underline truncate">
                        {it.username}
                      </Link>
                      <span className="text-xs uppercase tracking-widest text-slate-500">{it.mode}</span>
                      <span className="text-xs text-slate-500">wave {it.wave}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="font-mono">{it.score.toLocaleString()}</span>
                      <span className="text-xs text-slate-500 whitespace-nowrap">{ago(it.createdAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
