"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { SKINS } from "@/lib/game/skins";

interface Profile {
  username: string;
  email?: string | null;
  profilePublic?: boolean;
  displayName?: string | null;
  selectedSkin: string;
  unlockedSkins: string[];
  unlockedAchievements: string[];
  totalCoins: number;
  totalRuns: number;
  totalBugsFixed: number;
  longestRunSeconds: number;
  highScore: number;
}

export default function AccountPage() {
  const { status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/account");
      return;
    }
    if (status !== "authenticated") return;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data?.error) setError(data.error);
        else setProfile(data);
      })
      .catch((e) => setError(e?.message ?? "Network error"));
  }, [status, router]);

  const selectSkin = async (skinId: string) => {
    if (!profile) return;
    setSaving(skinId);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedSkin: skinId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Could not save");
      } else {
        setProfile({ ...profile, selectedSkin: data.selectedSkin });
        setError(null);
      }
    } catch (e: any) {
      setError(e?.message ?? "Network error");
    } finally {
      setSaving(null);
    }
  };

  const savePrivacy = async (patch: { profilePublic?: boolean; displayName?: string }) => {
    if (!profile) return;
    setSaving("privacy");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Could not save");
      } else {
        setProfile({ ...profile, profilePublic: data.profilePublic, displayName: data.displayName });
        setError(null);
      }
    } catch (e: any) {
      setError(e?.message ?? "Network error");
    } finally {
      setSaving(null);
    }
  };

  if (status === "loading" || !profile) {
    return <main className="max-w-3xl mx-auto px-6 py-10 text-slate-400">Loading…</main>;
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-4xl font-black tracking-tight mb-2">
        👋 {profile.username}
      </h1>
      <p className="text-slate-400 mb-8">Your stats, skins, and progress.</p>

      {error && (
        <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-6">
          {error}
        </div>
      )}

      {/* Stats grid */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10">
        <StatCard label="Coins" value={profile.totalCoins.toLocaleString()} color="text-yellow-300" />
        <StatCard label="High Score" value={profile.highScore.toLocaleString()} color="text-cyan-300" />
        <StatCard label="Runs" value={String(profile.totalRuns)} color="text-violet-300" />
        <StatCard label="Bugs Fixed" value={profile.totalBugsFixed.toLocaleString()} color="text-emerald-300" />
        <StatCard label="Longest Run" value={`${profile.longestRunSeconds}s`} color="text-pink-300" />
      </section>

      {/* Public profile */}
      <section className="mb-10">
        <h2 className="text-2xl font-black mb-1">🌐 Public profile</h2>
        <p className="text-sm text-slate-400 mb-4">
          Your profile is shareable at{" "}
          <Link href={`/u/${profile.username}`} className="text-cyan-300 underline">
            /u/{profile.username}
          </Link>
          . Turn it off to hide it.
        </p>
        <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-5 space-y-4">
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="font-semibold block">Show my profile publicly</span>
              <span className="text-sm text-slate-400">
                When off, /u/{profile.username} shows a private notice and your data is not returned.
              </span>
            </span>
            <input
              type="checkbox"
              checked={profile.profilePublic !== false}
              disabled={saving === "privacy"}
              onChange={(e) => savePrivacy({ profilePublic: e.target.checked })}
              className="w-5 h-5 accent-cyan-400 shrink-0"
            />
          </label>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Display name (optional)</label>
            <div className="flex gap-2">
              <input
                defaultValue={profile.displayName ?? ""}
                maxLength={32}
                placeholder={profile.username}
                id="displayName"
                className="flex-1 bg-slate-800 rounded-lg px-3 py-2 text-slate-100"
              />
              <button
                onClick={() => {
                  const el = document.getElementById("displayName") as HTMLInputElement | null;
                  savePrivacy({ displayName: el?.value ?? "" });
                }}
                disabled={saving === "privacy"}
                className="px-4 py-2 rounded-lg bg-slate-700 font-semibold disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Skins */}
      <section className="mb-10">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-2xl font-black">🎨 Skins</h2>
            <p className="text-sm text-slate-400">
              The skin changes the page background, brand, and bug colors.
            </p>
          </div>
          <span className="text-xs text-slate-500">
            {profile.unlockedSkins.length} / {SKINS.length} unlocked
          </span>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {SKINS.map((skin) => {
            const unlocked = profile.unlockedSkins.includes(skin.id);
            const selected = profile.selectedSkin === skin.id;
            return (
              <div
                key={skin.id}
                className={`rounded-2xl p-5 border transition-colors ${
                  selected
                    ? "border-cyan-400 bg-cyan-400/10"
                    : unlocked
                    ? "border-slate-700 bg-slate-900/50 hover:border-slate-500"
                    : "border-slate-800 bg-slate-900/30 opacity-60"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center font-black text-slate-900"
                    style={{ background: `linear-gradient(135deg, ${skin.accent}, ${skin.accent2})` }}
                  >
                    {skin.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg">{skin.name}</h3>
                      {selected && (
                        <span className="text-[10px] uppercase tracking-widest bg-cyan-400/20 text-cyan-300 px-2 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mb-3">{skin.tagline}</p>
                    {unlocked ? (
                      <button
                        onClick={() => selectSkin(skin.id)}
                        disabled={selected || saving === skin.id}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${
                          selected
                            ? "bg-slate-800 text-slate-500 cursor-default"
                            : "bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-900 hover:scale-[1.02] transition-transform"
                        }`}
                      >
                        {selected ? "Selected" : saving === skin.id ? "Saving…" : "Select"}
                      </button>
                    ) : (
                      <div className="text-xs text-slate-500 italic">🔒 {skin.unlockHint}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-bold mb-1">Want more achievements?</h3>
          <p className="text-sm text-slate-400">
            See everything you&apos;ve unlocked and what&apos;s still out there.
          </p>
        </div>
        <Link
          href="/achievements"
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-900 font-bold"
        >
          View achievements →
        </Link>
      </section>
    </main>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">{label}</div>
      <div className={`font-mono font-black text-2xl ${color}`}>{value}</div>
    </div>
  );
}
