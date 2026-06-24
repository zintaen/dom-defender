import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { buildOgQuery } from "@/lib/og/ogParams";
import FollowButton from "@/components/FollowButton";

export const dynamic = "force-dynamic";

interface PublicProfile {
  username: string;
  displayName: string;
  isPro: boolean;
  cosmetics: { skin: string; title?: string; trail?: string; badge?: string };
  stats: { highScore: number; totalRuns: number; totalBugsFixed: number; longestRunSeconds: number };
  achievements: string[];
  memberSince: string | null;
}
interface ProfileResponse {
  private?: boolean;
  error?: string;
  profile?: PublicProfile;
  bestEndless?: { score: number; wave: number } | null;
  bestDaily?: { score: number; wave: number } | null;
  recentReplays?: { shortId: string; score: number; wave: number; mode: string; createdAt: string }[];
}

async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  return host ? `${proto}://${host}` : process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

async function fetchProfile(username: string): Promise<ProfileResponse | null> {
  try {
    const res = await fetch(`${await baseUrl()}/api/profile/${encodeURIComponent(username)}`, {
      cache: "no-store",
    });
    if (res.status === 404) return { error: "not_found" };
    if (!res.ok) return null;
    return (await res.json()) as ProfileResponse;
  } catch {
    return null;
  }
}

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const data = await fetchProfile(username);
  if (!data || data.error === "not_found") notFound();

  if (data.private || !data.profile) {
    return (
      <Shell>
        <div className="text-center">
          <div className="text-5xl mb-3">🔒</div>
          <h1 className="text-2xl font-black mb-1">This profile is private</h1>
          <p className="text-slate-400">This player has chosen not to share their profile.</p>
          <div className="mt-6">
            <Link href="/leaderboard" className="text-cyan-300 underline">Back to the leaderboard</Link>
          </div>
        </div>
      </Shell>
    );
  }

  const p = data.profile;
  return (
    <Shell>
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center text-3xl font-black text-slate-900">
          {p.displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black">{p.displayName}</h1>
            {p.isPro && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                Pro
              </span>
            )}
          </div>
          <div className="text-slate-500 text-sm">
            @{p.username}
            {p.cosmetics.title ? ` · ${p.cosmetics.title}` : ""}
            {p.memberSince ? ` · since ${new Date(p.memberSince).toLocaleDateString()}` : ""}
          </div>
          <FollowButton username={p.username} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="High score" value={p.stats.highScore.toLocaleString()} />
        <Stat label="Runs" value={p.stats.totalRuns.toLocaleString()} />
        <Stat label="Bugs fixed" value={p.stats.totalBugsFixed.toLocaleString()} />
        <Stat label="Longest run" value={fmtDuration(p.stats.longestRunSeconds)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <Best label="Best endless" run={data.bestEndless} />
        <Best label="Best daily" run={data.bestDaily} />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 mb-6">
        <div className="font-bold mb-2">Achievements</div>
        {p.achievements.length === 0 ? (
          <p className="text-slate-400 text-sm">No achievements yet.</p>
        ) : (
          <div className="text-slate-300 text-sm">{p.achievements.length} unlocked</div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="font-bold mb-3">Recent replays</div>
        {!data.recentReplays || data.recentReplays.length === 0 ? (
          <p className="text-slate-400 text-sm">No public replays yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {data.recentReplays.map((r) => (
              <li key={r.shortId}>
                <Link
                  href={`/replay/${r.shortId}`}
                  className="flex items-center justify-between rounded-lg px-3 py-2 bg-slate-800/50 hover:bg-slate-800"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xs uppercase tracking-widest text-slate-500">{r.mode}</span>
                    <span className="text-xs text-slate-500">wave {r.wave}</span>
                  </span>
                  <span className="font-mono">{r.score.toLocaleString()}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Shell>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const data = await fetchProfile(username);
  if (!data || data.error === "not_found" || data.private || !data.profile) {
    return { title: "Profile · DOM Defender" };
  }
  const p = data.profile;
  const title = `${p.displayName} · DOM Defender`;
  const description = `${p.displayName} has fixed ${p.stats.totalBugsFixed.toLocaleString()} bugs across ${p.stats.totalRuns.toLocaleString()} runs. High score ${p.stats.highScore.toLocaleString()}.`;
  const base = await baseUrl();
  const ogUrl = `${base}/api/og?${buildOgQuery({
    name: p.displayName,
    score: p.stats.highScore,
    skin: p.cosmetics.skin,
    mode: "endless",
    cta: "View profile",
  })}`;
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: ogUrl, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [ogUrl] },
  };
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
      <div className="max-w-2xl mx-auto">{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center">
      <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className="font-mono font-bold text-lg">{value}</div>
    </div>
  );
}

function Best({ label, run }: { label: string; run?: { score: number; wave: number } | null }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">{label}</div>
      {run ? (
        <div className="flex items-baseline gap-2">
          <span className="font-mono font-bold text-2xl">{run.score.toLocaleString()}</span>
          <span className="text-sm text-slate-500">wave {run.wave}</span>
        </div>
      ) : (
        <div className="text-slate-500 text-sm">No run yet</div>
      )}
    </div>
  );
}
