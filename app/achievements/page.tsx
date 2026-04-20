"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string;
  rewardCoins: number;
  unlocksSkin: string | null;
}

export default function AchievementsPage() {
  const { status } = useSession();
  const [list, setList] = useState<Achievement[]>([]);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/achievements").then((r) => r.json()),
      status === "authenticated"
        ? fetch("/api/profile")
            .then((r) => r.json())
            .catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([ach, profile]) => {
        if (cancelled) return;
        setList(ach?.achievements ?? []);
        if (profile?.unlockedAchievements) setUnlocked(profile.unlockedAchievements);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [status]);

  const unlockedCount = unlocked.length;

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-4xl font-black tracking-tight mb-1">🏅 Achievements</h1>
          <p className="text-slate-400 text-sm">
            {status === "authenticated"
              ? `You've unlocked ${unlockedCount} of ${list.length}.`
              : "Sign in to track your progress."}
          </p>
        </div>
        {status !== "authenticated" && (
          <Link
            href="/login?callbackUrl=/achievements"
            className="text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-900 font-bold"
          >
            Sign in
          </Link>
        )}
      </div>

      {loading && <div className="text-slate-400">Loading…</div>}

      {!loading && (
        <div className="grid sm:grid-cols-2 gap-3">
          {list.map((a) => {
            const got = unlocked.includes(a.id);
            return (
              <div
                key={a.id}
                className={`rounded-2xl border p-4 transition-colors ${
                  got
                    ? "border-yellow-500/40 bg-yellow-500/5"
                    : "border-slate-800 bg-slate-900/30"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center text-2xl ${
                      got ? "bg-yellow-400/20" : "bg-slate-800/60 grayscale opacity-50"
                    }`}
                  >
                    {a.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold">{a.name}</h3>
                      {got && (
                        <span className="text-[10px] uppercase tracking-widest text-yellow-300">
                          ✓ Unlocked
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mb-2">{a.desc}</p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-yellow-300">+{a.rewardCoins} coins</span>
                      {a.unlocksSkin && (
                        <span className="text-cyan-300">🎨 unlocks {a.unlocksSkin} skin</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
