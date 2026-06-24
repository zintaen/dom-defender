import { NextResponse } from "next/server";
import { and, eq, inArray, desc } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users, scores, follows } from "@/db/schema";
import { sortFeedNewestFirst } from "@/lib/social/follow";
import { reportError } from "@/lib/observability";

export const dynamic = "force-dynamic";

// GET /api/feed -> recent public activity from the players the viewer follows,
// newest first. A followed player who is private contributes nothing.
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    const me = (session.user as { id?: string }).id ?? "";

    const followingRows = await db
      .select({ id: follows.following })
      .from(follows)
      .where(eq(follows.follower, me));
    const followingIds = followingRows.map((r) => r.id);
    if (followingIds.length === 0) return NextResponse.json({ items: [] });

    // Only public followed players appear in the feed.
    const publicRows = await db
      .select({ id: users.id })
      .from(users)
      .where(and(inArray(users.id, followingIds), eq(users.profilePublic, true)));
    const publicIds = publicRows.map((r) => r.id);
    if (publicIds.length === 0) return NextResponse.json({ items: [] });

    const rows = await db
      .select({
        username: scores.username,
        score: scores.score,
        wave: scores.wave,
        mode: scores.mode,
        createdAt: scores.createdAt,
      })
      .from(scores)
      .where(inArray(scores.userId, publicIds))
      .orderBy(desc(scores.createdAt))
      .limit(60);

    const items = sortFeedNewestFirst(
      rows.map((r) => ({
        username: r.username,
        score: r.score,
        wave: r.wave,
        mode: r.mode,
        createdAt: r.createdAt,
      })),
      30
    );
    return NextResponse.json({ items });
  } catch (e) {
    await reportError(e, { route: "GET /api/feed" });
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
