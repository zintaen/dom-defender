import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
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

    // Best score per user: DISTINCT ON (user_id) ordered by score, then re-sort
    // the winners by score and cap. Postgres equivalent of the old aggregation.
    const conds = [sql`mode = ${mode}`];
    if (mode === "daily") conds.push(sql`daily_key = ${dailyKey}`);
    if (seed !== undefined) conds.push(sql`seed = ${seed}`);
    const where = sql.join(conds, sql` and `);

    const rows = (await db.execute(sql`
      select username, score, duration_sec, wave, bugs_fixed, bosses_defeated, max_combo, skin_used, created_at
      from (
        select distinct on (user_id)
          user_id, username, score, duration_sec, wave, bugs_fixed, bosses_defeated, max_combo, skin_used, created_at
        from scores
        where ${where}
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
      mode,
      dailyKey,
      seed,
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
  } catch (e: any) {
    console.error("[leaderboard]", e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
