import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { and, eq, gte, count } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { byoAttempts } from "@/db/schema";
import { validateByoUrl } from "@/lib/game/byoValidator";
import { clientIpFromHeaders } from "@/lib/rateLimit";
import { reportError } from "@/lib/observability";

export const dynamic = "force-dynamic";

// Rate-limit: max 30 BYO attempts per IP per 10 minutes.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 30;

function hashIp(ip: string): string {
  const salt = process.env.BYO_IP_HASH_SALT ?? "dom-defender-byo";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 16);
}

function getIp(req: Request): string {
  return clientIpFromHeaders((n) => req.headers.get(n), {
    trustForwardedFor: process.env.TRUST_FORWARDED_FOR === "true",
  });
}

// POST /api/byo-attempt { url }
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const urlInput = typeof body?.url === "string" ? body.url : "";

    const v = validateByoUrl(urlInput);
    if (!v.ok) {
      const ip = getIp(req);
      try {
        await db.insert(byoAttempts).values({
          ipHash: hashIp(ip),
          domain: safeDomain(urlInput),
          blocked: true,
          reason: v.reason ?? null,
        });
      } catch {}
      return NextResponse.json({ error: v.reason ?? "Invalid URL." }, { status: 400 });
    }

    const ip = getIp(req);
    const ipHash = hashIp(ip);

    const [{ n: recentCount }] = await db
      .select({ n: count() })
      .from(byoAttempts)
      .where(and(eq(byoAttempts.ipHash, ipHash), gte(byoAttempts.createdAt, new Date(Date.now() - WINDOW_MS))));
    if ((recentCount ?? 0) >= MAX_PER_WINDOW) {
      return NextResponse.json(
        { error: "Rate limit hit - slow down and try again in a few minutes." },
        { status: 429 }
      );
    }

    const session = await auth();
    const userId = session?.user ? (session.user as { id?: string }).id ?? null : null;

    await db.insert(byoAttempts).values({
      ipHash,
      userId,
      domain: new URL(v.url!).hostname,
      blocked: false,
    });

    return NextResponse.json({ ok: true, url: v.url });
  } catch (e) {
    await reportError(e, { route: "POST /api/byo-attempt" });
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
