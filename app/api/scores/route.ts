import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Score from "@/models/Score";
import { evaluateAchievements, totalCoinsForAchievements, RunSummary } from "@/lib/game/achievements";
import { todaysDailyKey } from "@/lib/game/dailySeed";

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

    await connectDB();

    const userId = (session.user as any).id;
    const username = (session.user as any).username as string;

    const dailyKey = mode === "daily" ? todaysDailyKey() : undefined;
    const seed =
      typeof body.seed === "number" && Number.isFinite(body.seed)
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
    console.error("[scores POST]", e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

function clampInt(v: any, min: number, max: number) {
  const n = Math.floor(Number(v) || 0);
  return Math.max(min, Math.min(max, n));
}
