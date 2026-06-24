import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
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

    const rows = (await db.execute(sql`
      select username, score, duration_sec, wave, bugs_fixed, bosses_defeated, max_combo, skin_used, created_at
      from (
        select distinct on (user_id)
          user_id, username, score, duration_sec, wave, bugs_fixed, bosses_defeated, max_combo, skin_used, created_at
        from scores
        where mode = 'tournament' and daily_key = ${key}
        order by user_id, score desc, created_at asc
      ) t
      order by score desc, created_at asc
      limit ${limit}
    `)) as unknown as Array<{
      username: string;
      score: number;
      duration_sec: number;
      wave: number;
      bugs_fixed: number;
      bosses_defeated: number;
      max_combo: number;
      skin_used: string;
      created_at: string;
    }>;

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
        durationSec: r.duration_sec,
        wave: r.wave,
        bugsFixed: r.bugs_fixed,
        bossesDefeated: r.bosses_defeated,
        maxCombo: r.max_combo,
        skinUsed: r.skin_used,
        createdAt: r.created_at,
      })),
    });
  } catch (e) {
    await reportError(e, { route: "GET /api/tournament" });
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
