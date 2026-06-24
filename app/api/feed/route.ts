import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Score from "@/models/Score";
import Follow from "@/models/Follow";
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

    await connectDB();

    const followingIds = await Follow.find({ follower: me }).distinct("following");
    if (followingIds.length === 0) return NextResponse.json({ items: [] });

    // Only public followed players appear in the feed.
    const publicIds = await User.find({
      _id: { $in: followingIds },
      profilePublic: { $ne: false },
    }).distinct("_id");
    if (publicIds.length === 0) return NextResponse.json({ items: [] });

    const rows = await Score.find({ userId: { $in: publicIds } })
      .sort({ createdAt: -1 })
      .limit(60)
      .select("username score wave mode createdAt")
      .lean();

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
