import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Follow from "@/models/Follow";
import { canFollow } from "@/lib/social/follow";
import { isValidUsernameParam } from "@/lib/profile/publicProfile";
import { reportError } from "@/lib/observability";

export const dynamic = "force-dynamic";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function findByUsername(username: string) {
  return User.findOne({ username: new RegExp(`^${escapeRegex(username.trim())}$`, "i") })
    .select("_id username profilePublic")
    .lean();
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

    await connectDB();
    const target = await findByUsername(username);
    if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
    const targetId = String(target._id);

    const chk = canFollow(me, targetId);
    if (!chk.ok) return NextResponse.json({ error: chk.reason }, { status: 400 });

    if (action === "follow") {
      // Upsert => duplicate follow is a no-op (also guarded by the unique index).
      await Follow.updateOne(
        { follower: me, following: targetId },
        { $setOnInsert: { follower: me, following: targetId } },
        { upsert: true }
      );
    } else {
      await Follow.deleteOne({ follower: me, following: targetId });
    }

    const [followers, viewerFollows] = await Promise.all([
      Follow.countDocuments({ following: targetId }),
      Follow.exists({ follower: me, following: targetId }),
    ]);
    return NextResponse.json({ ok: true, viewerFollows: !!viewerFollows, followers });
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
    await connectDB();
    const target = await findByUsername(username);
    if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const targetId = String(target._id);

    const session = await auth();
    const me = session?.user ? (session.user as { id?: string }).id ?? null : null;
    const isSelf = me ? me === targetId : false;

    const [followers, following, viewerFollows] = await Promise.all([
      Follow.countDocuments({ following: targetId }),
      Follow.countDocuments({ follower: targetId }),
      me && !isSelf ? Follow.exists({ follower: me, following: targetId }) : Promise.resolve(null),
    ]);

    return NextResponse.json({
      followers,
      following,
      viewerFollows: !!viewerFollows,
      isSelf,
      canFollow: !!me && !isSelf,
    });
  } catch (e) {
    await reportError(e, { route: "GET /api/follow" });
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
