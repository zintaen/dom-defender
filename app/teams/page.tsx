"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

// DOM Defender for teams (FR-DD-EDU-001): create a room or join one by code.
export default function TeamsLanding() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [timeBox, setTimeBox] = useState(15);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const post = async (action: string, payload: Record<string, unknown>) => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error ?? "Something went wrong.");
        return;
      }
      router.push(`/teams/${data.code}`);
    } catch {
      setErr("Network error.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="text-xs uppercase tracking-widest text-cyan-300 mb-1">DOM Defender for teams</div>
        <h1 className="text-3xl font-black mb-2">Run it with your team</h1>
        <p className="text-slate-400 mb-6">
          Everyone plays the same seeded run, a live board ranks you, and the recap maps each bug
          to the real web concept behind it. Great for onboarding, a workshop, or a hiring warmup.
        </p>

        {!session?.user ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center">
            <p className="text-slate-300 mb-4">Sign in to create or join a room.</p>
            <Link href="/login" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-900 font-bold">
              Sign in
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="font-bold mb-2">Create a room</div>
              <label className="text-sm text-slate-400">
                Time box
                <select
                  value={timeBox}
                  onChange={(e) => setTimeBox(Number(e.target.value))}
                  className="ml-2 bg-slate-800 rounded-lg px-2 py-1 text-slate-100"
                >
                  <option value={10}>10 min</option>
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={60}>60 min</option>
                </select>
              </label>
              <button
                onClick={() => post("create", { timeBoxMinutes: timeBox })}
                disabled={busy}
                className="mt-4 w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-900 font-bold disabled:opacity-60"
              >
                {busy ? "Creating…" : "Create room"}
              </button>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="font-bold mb-2">Join a room</div>
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ROOM CODE"
                  maxLength={12}
                  className="flex-1 bg-slate-800 rounded-lg px-3 py-2 font-mono tracking-widest text-slate-100"
                />
                <button
                  onClick={() => post("join", { code })}
                  disabled={busy || code.length < 4}
                  className="px-4 py-2 rounded-lg bg-slate-700 text-slate-100 font-semibold disabled:opacity-50"
                >
                  Join
                </button>
              </div>
            </div>

            {err && <div className="text-sm text-red-300">{err}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
