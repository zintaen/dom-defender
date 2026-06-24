import { NextResponse } from "next/server";
import { and, eq, count, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users, follows } from "@/db/schema";
import { canFollow } from "@/lib/social/follow";
import { isValidUsernameParam } from "@/lib/profile/publicProfile";
import { reportError } from "@/lib/observability";

export const dynamic = "force-dynamic";

async function findIdByUsername(username: string): Promise<string | null> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.username}) = ${username.trim().toLowerCase()}`)
    .limit(1);
  return rows[0]?.id ?? null;
}

// POST { action: "follow" | "unfollow", username } - idempotent.
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    const me = (session.user as { id?: string }).id ?? "";

    const body = await req.json().catch(() => ({}));
    const action = body?.action === "unfollow" ? "unfollow" : "follow";
    const username = String(body?.username ?? "");
    if (!isValidUsernameParam(username)) {
      return NextResponse.json({ error: "Invalid username." }, { status: 400 });
    }

    const targetId = await findIdByUsername(username);
    if (!targetId) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const chk = canFollow(me, targetId);
    if (!chk.ok) return NextResponse.json({ error: chk.reason }, { status: 400 });

    if (action === "follow") {
      // Unique index makes a duplicate follow a no-op.
      await db.insert(follows).values({ follower: me, following: targetId }).onConflictDoNothing();
    } else {
      await db.delete(follows).where(and(eq(follows.follower, me), eq(follows.following, targetId)));
    }

    const [{ n: followers }] = await db
      .select({ n: count() })
      .from(follows)
      .where(eq(follows.following, targetId));
    const viewerRows = await db
      .select({ id: follows.id })
      .from(follows)
      .where(and(eq(follows.follower, me), eq(follows.following, targetId)))
      .limit(1);

    return NextResponse.json({ ok: true, viewerFollows: viewerRows.length > 0, followers });
  } catch (e) {
    await reportError(e, { route: "POST /api/follow" });
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

// GET ?username= -> follower/following counts and the viewer's follow state.
export async function GET(req: Request) {
  try {
    const username = new URL(req.url).searchParams.get("username") ?? "";
    if (!isValidUsernameParam(username)) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const targetId = await findIdByUsername(username);
    if (!targetId) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const session = await auth();
    const me = session?.user ? (session.user as { id?: string }).id ?? null : null;
    const isSelf = me ? me === targetId : false;

    const [[{ n: followers }], [{ n: following }], viewerRows] = await Promise.all([
      db.select({ n: count() }).from(follows).where(eq(follows.following, targetId)),
      db.select({ n: count() }).from(follows).where(eq(follows.follower, targetId)),
      me && !isSelf
        ? db
            .select({ id: follows.id })
            .from(follows)
            .where(and(eq(follows.follower, me), eq(follows.following, targetId)))
            .limit(1)
        : Promise.resolve([] as { id: string }[]),
    ]);

    return NextResponse.json({
      followers,
      following,
      viewerFollows: viewerRows.length > 0,
      isSelf,
      canFollow: !!me && !isSelf,
    });
  } catch (e) {
    await reportError(e, { route: "GET /api/follow" });
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
