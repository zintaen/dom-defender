import { notFound } from "next/navigation";
import { headers } from "next/headers";
import ReplayPlayer, { ReplayPayload } from "@/components/ReplayPlayer";
import { isValidShortId } from "@/lib/game/replay";
import { buildOgQuery } from "@/lib/og/ogParams";

export const dynamic = "force-dynamic";

async function fetchReplay(id: string): Promise<ReplayPayload | null> {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  const base = host ? `${proto}://${host}` : process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/replays/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as ReplayPayload;
  } catch {
    return null;
  }
}

export default async function ReplayPage({ params }: { params: Promise<{ id: string }> }) {
  const id = ((await params).id ?? "").toLowerCase();
  if (!isValidShortId(id)) notFound();
  const replay = await fetchReplay(id);
  if (!replay) notFound();
  return <ReplayPlayer replay={replay} />;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const id = ((await params).id ?? "").toLowerCase();
  if (!isValidShortId(id)) return { title: "Replay · DOM Defender" };
  const replay = await fetchReplay(id);
  if (!replay) return { title: "Replay · DOM Defender" };
  const who = replay.username ?? "Anonymous";
  const title = `${who}: ${replay.score.toLocaleString()} pts · Wave ${replay.wave} · DOM Defender`;
  const desc = `${replay.bugsFixed} bugs fixed, ${replay.bossesDefeated} bosses down, best combo x${replay.maxCombo}. Replay #${id}.`;
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  const base = host ? `${proto}://${host}` : "";
  const ogUrl = `${base}/api/og?${buildOgQuery({
    name: who,
    score: replay.score,
    wave: replay.wave,
    cta: "Beat this run",
  })}`;
  return {
    title,
    description: desc,
    openGraph: { title, description: desc, images: [{ url: ogUrl, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description: desc, images: [ogUrl] },
  };
}
