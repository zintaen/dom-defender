import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { replays } from "@/db/schema";
import {
  makeShortId,
  REPLAY_MAX_EVENTS,
  REPLAY_MAX_SNAPSHOTS,
  ReplayLog,
} from "@/lib/game/replay";

export const dynamic = "force-dynamic";

const ALLOWED_EVENT_TYPES = new Set([
  "tool",
  "powerup",
  "fix",
  "wave",
  "boss_spawn",
  "boss_hit",
  "boss_down",
  "combo",
]);

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const body = (await req.json()) as Partial<ReplayLog>;

    const mode = body.mode === "daily" ? "daily" : "endless";
    const durationSec = clampInt(body.durationSec, 0, 60 * 60);
    const summary = body.summary ?? ({} as any);
    const score = clampInt(summary.score, 0, 10_000_000);
    const wave = clampInt(summary.wave, 1, 99);
    const bugsFixed = clampInt(summary.bugsFixed, 0, 100_000);
    const bossesDefeated = clampInt(summary.bossesDefeated, 0, 100);
    const maxCombo = clampInt(summary.maxCombo, 0, 1000);

    // Size caps - match the client limits in lib/game/replay.ts.
    const events = Array.isArray(body.events)
      ? body.events
          .slice(0, REPLAY_MAX_EVENTS)
          .filter((e: any) => e && typeof e === "object" && ALLOWED_EVENT_TYPES.has(e.type))
      : [];
    const snapshots = Array.isArray(body.snapshots)
      ? body.snapshots.slice(0, REPLAY_MAX_SNAPSHOTS).filter((s: any) => s && typeof s.t === "number")
      : [];

    const userId = (session.user as { id?: string }).id ?? null;
    const username = (session.user as { username?: string }).username ?? null;

    // Collision chance is astronomical, but retry a few times to avoid a 500.
    let shortId = makeShortId();
    for (let i = 0; i < 4; i++) {
      const exists = await db.select({ id: replays.id }).from(replays).where(eq(replays.shortId, shortId)).limit(1);
      if (exists.length === 0) break;
      shortId = makeShortId();
    }

    const inserted = await db
      .insert(replays)
      .values({
        shortId,
        userId,
        username,
        mode,
        seed: typeof body.seed === "number" ? body.seed : null,
        dailyKey: typeof body.dailyKey === "string" ? body.dailyKey : null,
        skinId: typeof body.skinId === "string" ? body.skinId : "default",
        durationSec,
        score,
        wave,
        bugsFixed,
        bossesDefeated,
        maxCombo,
        events,
        snapshots,
      })
      .returning({ shortId: replays.shortId });

    return NextResponse.json({
      ok: true,
      shortId: inserted[0].shortId,
      url: `/replay/${inserted[0].shortId}`,
    });
  } catch (e: any) {
    console.error("[replays POST]", e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

function clampInt(v: any, min: number, max: number) {
  const n = Math.floor(Number(v) || 0);
  return Math.max(min, Math.min(max, n));
}
