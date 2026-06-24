import { NextResponse } from "next/server";
import { and, eq, gte, count } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users, scores } from "@/db/schema";
import { evaluateAchievements, totalCoinsForAchievements, RunSummary } from "@/lib/game/achievements";
import { todaysDailyKey, seedFromDateKey } from "@/lib/game/dailySeed";
import { weekKey, tournamentSeed } from "@/lib/game/tournament";
import { validateRunAgainstReplay } from "@/lib/game/scoreValidator";
import type { ReplayLog } from "@/lib/game/replay";
import { reportError } from "@/lib/observability";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const body = await req.json();
    const mode: "endless" | "daily" | "tournament" =
      body.mode === "daily" ? "daily" : body.mode === "tournament" ? "tournament" : "endless";
    const summary: RunSummary = {
      score: clampInt(body.score, 0, 10_000_000),
      durationSec: clampInt(body.durationSec, 0, 60 * 60),
      wave: clampInt(body.wave, 1, 99),
      bugsFixed: clampInt(body.bugsFixed, 0, 100_000),
      bossesDefeated: clampInt(body.bossesDefeated, 0, 100),
      maxCombo: clampInt(body.maxCombo, 0, 1000),
      powerUpsUsed: clampInt(body.powerUpsUsed, 0, 1000),
      skinUsed: typeof body.skinUsed === "string" ? body.skinUsed : "default",
    };

    // Light sanity check - at most ~100 score per second on average
    if (summary.score > Math.max(500, summary.durationSec * 200)) {
      return NextResponse.json({ error: "Score failed sanity check." }, { status: 400 });
    }

    // Server-authoritative validation against the recorded replay (NFR-DOM-001).
    const replay =
      body.replay && typeof body.replay === "object" ? (body.replay as ReplayLog) : undefined;
    const requireVerified = process.env.REQUIRE_VERIFIED_SCORES === "true";
    let verified = false;
    if (replay) {
      const v = validateRunAgainstReplay(summary, replay);
      if (!v.ok) {
        return NextResponse.json(
          { error: v.reason ?? "Score failed replay validation." },
          { status: 400 }
        );
      }
      verified = true;
    } else if (requireVerified) {
      return NextResponse.json(
        { error: "A replay is required to record a ranked score." },
        { status: 400 }
      );
    }

    const userId = (session.user as { id: string }).id;
    const username = (session.user as { username: string }).username;

    // Per-user submission rate limit (L1-T7): cap ranked submissions per minute.
    const SUBMIT_WINDOW_MS = 60 * 1000;
    const SUBMIT_MAX = 20;
    const [{ n: recentSubmissions }] = await db
      .select({ n: count() })
      .from(scores)
      .where(and(eq(scores.userId, userId), gte(scores.createdAt, new Date(Date.now() - SUBMIT_WINDOW_MS))));
    if ((recentSubmissions ?? 0) >= SUBMIT_MAX) {
      return NextResponse.json(
        { error: "Too many submissions in a short time - slow down and try again shortly." },
        { status: 429 }
      );
    }

    // Competitive buckets are derived server-side so a client cannot submit
    // under a forged seed. Daily uses the date key (L1-T8); the weekly tournament
    // uses the ISO-week key (FR-DD-SOC-003). Endless keeps its client seed.
    let dailyKey: string | undefined;
    let seed: number | undefined;
    if (mode === "daily") {
      dailyKey = todaysDailyKey();
      seed = seedFromDateKey(dailyKey);
    } else if (mode === "tournament") {
      dailyKey = weekKey();
      seed = tournamentSeed();
    } else {
      seed =
        typeof body.seed === "number" && Number.isFinite(body.seed)
          ? Math.floor(body.seed) >>> 0
          : undefined;
    }

    // Bind a tournament run to this week's seed.
    if (
      mode === "tournament" &&
      replay &&
      typeof replay.seed === "number" &&
      Number.isFinite(replay.seed) &&
      (Math.floor(replay.seed) >>> 0) !== seed
    ) {
      return NextResponse.json(
        { error: "Replay seed does not match this week's tournament." },
        { status: 400 }
      );
    }

    const inserted = await db
      .insert(scores)
      .values({
        userId,
        username,
        mode,
        dailyKey: dailyKey ?? null,
        seed: seed ?? null,
        score: summary.score,
        durationSec: summary.durationSec,
        wave: summary.wave,
        bugsFixed: summary.bugsFixed,
        bossesDefeated: summary.bossesDefeated,
        maxCombo: summary.maxCombo,
        skinUsed: summary.skinUsed,
        verified,
      })
      .returning({ id: scores.id });

    // Update user aggregates and evaluate achievements (read-modify-write, same
    // as before; the only atomic path is the shop coin spend).
    const urows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const u = urows[0];
    if (!u) return NextResponse.json({ error: "User missing." }, { status: 404 });

    const newlyUnlocked = evaluateAchievements(summary, u.unlockedAchievements);
    const newAchievementIds = newlyUnlocked.map((a) => a.id);
    const mergedAchievements = Array.from(new Set([...u.unlockedAchievements, ...newAchievementIds]));
    const skinsToUnlock = newlyUnlocked.filter((a) => a.unlocksSkin).map((a) => a.unlocksSkin!) as string[];
    const mergedSkins = Array.from(new Set([...u.unlockedSkins, ...skinsToUnlock]));
    const coinsEarned = totalCoinsForAchievements(newAchievementIds);

    await db
      .update(users)
      .set({
        totalRuns: u.totalRuns + 1,
        totalBugsFixed: u.totalBugsFixed + summary.bugsFixed,
        highScore: summary.score > u.highScore ? summary.score : u.highScore,
        longestRunSeconds: summary.durationSec > u.longestRunSeconds ? summary.durationSec : u.longestRunSeconds,
        unlockedAchievements: mergedAchievements,
        unlockedSkins: mergedSkins,
        totalCoins: u.totalCoins + coinsEarned,
      })
      .where(eq(users.id, userId));

    return NextResponse.json({
      ok: true,
      scoreId: inserted[0].id,
      newAchievements: newlyUnlocked.map((a) => ({ id: a.id, name: a.name, icon: a.icon, rewardCoins: a.rewardCoins })),
      coinsEarned,
      unlockedSkins: skinsToUnlock,
    });
  } catch (e: any) {
    await reportError(e, { route: "POST /api/scores" });
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

function clampInt(v: any, min: number, max: number) {
  const n = Math.floor(Number(v) || 0);
  return Math.max(min, Math.min(max, n));
}
