import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import ByoAttempt from "@/models/ByoAttempt";
import { validateByoUrl } from "@/lib/game/byoValidator";
import { clientIpFromHeaders } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// Rate-limit: max 30 BYO attempts per IP per 10 minutes. Not defended against
// IP rotation — this is just a polite "don't hammer us" guard. Replace with
// Redis / edge-based rate limiter when scale warrants.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 30;

function hashIp(ip: string): string {
  const salt = process.env.BYO_IP_HASH_SALT ?? "dom-defender-byo";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 16);
}

function getIp(req: Request): string {
  // Use platform-verified headers, not the spoofable x-forwarded-for first hop
  // (NFR-DOM-002 / L1-T6). Set TRUST_FORWARDED_FOR=true only behind a proxy that
  // sanitizes that header (e.g. when self-hosting behind your own nginx).
  return clientIpFromHeaders((n) => req.headers.get(n), {
    trustForwardedFor: process.env.TRUST_FORWARDED_FOR === "true",
  });
}

// POST /api/byo-attempt { url }
// Validates the URL server-side, logs the attempt, enforces rate limits.
// Client calls this *before* loading the iframe. If it 429s, we refuse to
// render the iframe in the UI.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const urlInput = typeof body?.url === "string" ? body.url : "";

    const v = validateByoUrl(urlInput);
    if (!v.ok) {
      // Still log the blocked attempt so we can see abuse patterns.
      const ip = getIp(req);
      try {
        await connectDB();
        await ByoAttempt.create({
          ipHash: hashIp(ip),
          domain: safeDomain(urlInput),
          blocked: true,
          reason: v.reason,
        });
      } catch {}
      return NextResponse.json({ error: v.reason ?? "Invalid URL." }, { status: 400 });
    }

    const ip = getIp(req);
    const ipHash = hashIp(ip);

    await connectDB();
    const recentCount = await ByoAttempt.countDocuments({
      ipHash,
      createdAt: { $gte: new Date(Date.now() - WINDOW_MS) },
    });
    if (recentCount >= MAX_PER_WINDOW) {
      return NextResponse.json(
        { error: "Rate limit hit — slow down and try again in a few minutes." },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    const userId = session?.user ? (session.user as any).id : undefined;

    await ByoAttempt.create({
      ipHash,
      userId,
      domain: new URL(v.url!).hostname,
      blocked: false,
    });

    return NextResponse.json({ ok: true, url: v.url });
  } catch (e) {
    console.error("[byo-attempt POST]", e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

function safeDomain(raw: string): string {
  try {
    const u = /^https?:\/\//.test(raw) ? new URL(raw) : new URL(`https://${raw}`);
    return u.hostname.slice(0, 200);
  } catch {
    return "invalid";
  }
}
