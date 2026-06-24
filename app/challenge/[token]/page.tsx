import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { decodeChallenge } from "@/lib/game/challenge";
import { buildOgQuery } from "@/lib/og/ogParams";

export const dynamic = "force-dynamic";

async function ogBase(): Promise<string> {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  return host ? `${proto}://${host}` : "";
}

// Friend challenge landing (FR-DD-SOC-001). Shows the target to beat, then sends
// the player into /play with the same seed. The embedded score is display only;
// the score they post is validated server-side (NFR-DOM-001).
export default async function ChallengePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const c = decodeChallenge(token);
  if (!c) notFound();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 px-6">
      <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center shadow-2xl">
        <div className="text-xs uppercase tracking-widest text-cyan-300 mb-2">DOM Defender challenge</div>
        <h1 className="text-2xl font-black mb-1">
          {c.name} dares you to beat
        </h1>
        <div className="text-5xl font-black tabular-nums my-4">{c.score.toLocaleString()}</div>
        <p className="text-slate-400 mb-6">
          Same seed, same bugs. Patch faster and outscore them.
        </p>
        <Link
          href={`/play?challenge=${encodeURIComponent(token)}`}
          className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-900 font-bold"
        >
          Take the challenge
        </Link>
        <div className="mt-4">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-300">
            or play the daily challenge
          </Link>
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const c = decodeChallenge(token);
  if (!c) return { title: "Challenge · DOM Defender" };
  const title = `${c.name} challenges you: beat ${c.score.toLocaleString()} · DOM Defender`;
  const description = `Same seed, same bugs. Can you beat ${c.score.toLocaleString()} in DOM Defender?`;
  const base = await ogBase();
  const ogUrl = `${base}/api/og?${buildOgQuery({
    name: c.name,
    score: c.score,
    mode: "challenge",
    cta: "Beat my seed",
  })}`;
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: ogUrl, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [ogUrl] },
  };
}
