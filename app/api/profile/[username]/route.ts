import { NextResponse } from "next/server";
import { and, eq, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, scores, replays } from "@/db/schema";
import {
  projectPublicProfile,
  isProfilePublic,
  isValidUsernameParam,
} from "@/lib/profile/publicProfile";
import { reportError } from "@/lib/observability";

export const dynamic = "force-dynamic";

// GET /api/profile/[username] -> public projection (TASK-DD-COMM-001). Never
// returns email, passwordHash, or internal ids; honors the opt-out flag.
export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await params;
    if (!isValidUsernameParam(username)) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const urows = await db
      .select()
      .from(users)
      .where(sql`lower(${users.username}) = ${username.trim().toLowerCase()}`)
      .limit(1);
    const user = urows[0];
    if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (!isProfilePublic(user)) {
      return NextResponse.json({ private: true });
    }

    const userId = user.id;
    const [bestEndless, bestDaily, recent] = await Promise.all([
      db
        .select({ score: scores.score, wave: scores.wave })
        .from(scores)
        .where(and(eq(scores.userId, userId), eq(scores.mode, "endless")))
        .orderBy(desc(scores.score))
        .limit(1),
      db
        .select({ score: scores.score, wave: scores.wave })
        .from(scores)
        .where(and(eq(scores.userId, userId), eq(scores.mode, "daily")))
        .orderBy(desc(scores.score))
        .limit(1),
      db
        .select({
          shortId: replays.shortId,
          score: replays.score,
          wave: replays.wave,
          mode: replays.mode,
          createdAt: replays.createdAt,
        })
        .from(replays)
        .where(eq(replays.userId, userId))
        .orderBy(desc(replays.createdAt))
        .limit(5),
    ]);

    return NextResponse.json({
      profile: projectPublicProfile(user),
      bestEndless: bestEndless[0] ?? null,
      bestDaily: bestDaily[0] ?? null,
      recentReplays: recent,
    });
  } catch (e) {
    await reportError(e, { route: "GET /api/profile/[username]" });
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
