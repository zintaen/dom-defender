import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Score from "@/models/Score";
import { evaluateAchievements, totalCoinsForAchievements, RunSummary } from "@/lib/game/achievements";
import { todaysDailyKey, seedFromDateKey } from "@/lib/game/dailySeed";
import { validateRunAgainstReplay } from "@/lib/game/scoreValidator";
import type { ReplayLog } from "@/lib/game/replay";
import { reportError } from "@/lib/observability";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const body = await req.json();
    const mode = body.mode === "daily" ? "daily" : "endless";
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

    // Light sanity check — at most ~100 score per second on average
    if (summary.score > Math.max(500, summary.durationSec * 200)) {
      return NextResponse.json({ error: "Score failed sanity check." }, { status: 400 });
    }

    // Server-authoritative validation against the recorded replay (NFR-DOM-001).
    // When a replay is supplied we validate the claimed run against it and mark
    // the score verified. REQUIRE_VERIFIED_SCORES=true makes the replay mandatory
    // (fail closed) once the client is confirmed sending it.
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

    await connectDB();

    const userId = (session.user as any).id;
    const username = (session.user as any).username as string;

    // Per-user submission rate limit (L1-T7): cap ranked submissions per minute
    // so the collection cannot be flooded. Durable (counts stored Score docs).
    const SUBMIT_WINDOW_MS = 60 * 1000;
    const SUBMIT_MAX = 20;
    const recentSubmissions = await Score.countDocuments({
      userId,
      createdAt: { $gte: new Date(Date.now() - SUBMIT_WINDOW_MS) },
    });
    if (recentSubmissions >= SUBMIT_MAX) {
      return NextResponse.json(
        { error: "Too many submissions in a short time - slow down and try again shortly." },
        { status: 429 }
      );
    }

    const dailyKey = mode === "daily" ? todaysDailyKey() : undefined;
    // For daily runs the seed is derived server-side from the date key, so a
    // client cannot submit a daily score under a forged seed (L1-T8). Endless /
    // private-seed runs keep their client-supplied seed.
    const seed =
      mode === "daily"
        ? seedFromDateKey(dailyKey!)
        : typeof body.seed === "number" && Number.isFinite(body.seed)
        ? Math.floor(body.seed) >>> 0
        : undefined;

    const score = await Score.create({
      userId,
      username,
      mode,
      dailyKey,
      seed,
      score: summary.score,
      durationSec: summary.durationSec,
      wave: summary.wave,
      bugsFixed: summary.bugsFixed,
      bossesDefeated: summary.bossesDefeated,
      maxCombo: summary.maxCombo,
      skinUsed: summary.skinUsed,
      verified,
    });

    // Update user aggregates and evaluate achievements
    const u = await User.findById(userId);
    if (!u) return NextResponse.json({ error: "User missing." }, { status: 404 });

    u.totalRuns += 1;
    u.totalBugsFixed += summary.bugsFixed;
    if (summary.score > u.highScore) u.highScore = summary.score;
    if (summary.durationSec > u.longestRunSeconds) u.longestRunSeconds = summary.durationSec;

    const newlyUnlocked = evaluateAchievements(summary, u.unlockedAchievements);
    const newAchievementIds = newlyUnlocked.map((a) => a.id);
    u.unlockedAchievements = Array.from(new Set([...u.unlockedAchievements, ...newAchievementIds]));

    const skinsToUnlock = newlyUnlocked.filter((a) => a.unlocksSkin).map((a) => a.unlocksSkin!) as string[];
    u.unlockedSkins = Array.from(new Set([...u.unlockedSkins, ...skinsToUnlock]));

    const coinsEarned = totalCoinsForAchievements(newAchievementIds);
    u.totalCoins += coinsEarned;

    await u.save();

    return NextResponse.json({
      ok: true,
      scoreId: String(score._id),
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
