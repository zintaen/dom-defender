import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Score from "@/models/Score";
import { todaysDailyKey } from "@/lib/game/dailySeed";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") === "daily" ? "daily" : "endless";
    const limit = Math.min(50, Math.max(5, Number(searchParams.get("limit")) || 25));
    const dailyKey = mode === "daily" ? todaysDailyKey() : undefined;
    const seedRaw = searchParams.get("seed");
    const seed =
      seedRaw != null && seedRaw !== "" && Number.isFinite(Number(seedRaw))
        ? Math.floor(Number(seedRaw)) >>> 0
        : undefined;

    await connectDB();

    const match: any = { mode };
    if (mode === "daily") match.dailyKey = dailyKey;
    if (seed !== undefined) match.seed = seed;

    // Best score per user — group by user, keep top score then sort.
    const rows = await Score.aggregate([
      { $match: match },
      { $sort: { score: -1, createdAt: 1 } },
      {
        $group: {
          _id: "$userId",
          username: { $first: "$username" },
          score: { $first: "$score" },
          durationSec: { $first: "$durationSec" },
          wave: { $first: "$wave" },
          bugsFixed: { $first: "$bugsFixed" },
          bossesDefeated: { $first: "$bossesDefeated" },
          maxCombo: { $first: "$maxCombo" },
          skinUsed: { $first: "$skinUsed" },
          createdAt: { $first: "$createdAt" },
        },
      },
      { $sort: { score: -1, createdAt: 1 } },
      { $limit: limit },
    ]);

    return NextResponse.json({
      mode,
      dailyKey,
      seed,
      rows: rows.map((r, i) => ({
        rank: i + 1,
        username: r.username,
        score: r.score,
        durationSec: r.durationSec,
        wave: r.wave,
        bugsFixed: r.bugsFixed,
        bossesDefeated: r.bossesDefeated,
        maxCombo: r.maxCombo,
        skinUsed: r.skinUsed,
        createdAt: r.createdAt,
      })),
    });
  } catch (e: any) {
    console.error("[leaderboard]", e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
