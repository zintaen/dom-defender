import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Score from "@/models/Score";
import { weekKey, tournamentSeed, weekStart, weekEnd, msUntilRollover } from "@/lib/game/tournament";
import { reportError } from "@/lib/observability";

export const dynamic = "force-dynamic";

// GET /api/tournament -> current week key, server-derived seed, countdown, and
// the ranked board (best score per user) for this week (FR-DD-SOC-003).
export async function GET(req: Request) {
  try {
    const limit = Math.min(50, Math.max(5, Number(new URL(req.url).searchParams.get("limit")) || 25));
    const key = weekKey();
    const seed = tournamentSeed();

    await connectDB();

    const rows = await Score.aggregate([
      { $match: { mode: "tournament", dailyKey: key } },
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
      weekKey: key,
      seed,
      startsAt: weekStart().toISOString(),
      endsAt: weekEnd().toISOString(),
      msUntilRollover: msUntilRollover(),
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
  } catch (e) {
    await reportError(e, { route: "GET /api/tournament" });
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
