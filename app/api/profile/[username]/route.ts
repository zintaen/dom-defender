import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Score from "@/models/Score";
import Replay from "@/models/Replay";
import {
  projectPublicProfile,
  isProfilePublic,
  isValidUsernameParam,
} from "@/lib/profile/publicProfile";
import { reportError } from "@/lib/observability";

export const dynamic = "force-dynamic";

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /api/profile/[username] -> public projection (FR-DD-COMM-001). Never
// returns email, passwordHash, or internal ids; honors the opt-out flag.
export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await params;
    if (!isValidUsernameParam(username)) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    await connectDB();

    const user = await User.findOne({
      username: new RegExp(`^${escapeRegex(username.trim())}$`, "i"),
    }).lean();
    if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (!isProfilePublic(user)) {
      // Private: the user exists but is hidden. Report a private state rather
      // than a 404 so the page can say so, but emit nothing about the player.
      return NextResponse.json({ private: true });
    }

    const userId = user._id;
    const [bestEndless, bestDaily, replays] = await Promise.all([
      Score.findOne({ userId, mode: "endless" }).sort({ score: -1 }).lean(),
      Score.findOne({ userId, mode: "daily" }).sort({ score: -1 }).lean(),
      Replay.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    return NextResponse.json({
      profile: projectPublicProfile(user),
      bestEndless: bestEndless ? { score: bestEndless.score, wave: bestEndless.wave } : null,
      bestDaily: bestDaily ? { score: bestDaily.score, wave: bestDaily.wave } : null,
      recentReplays: (replays ?? []).map((r) => ({
        shortId: r.shortId,
        score: r.score,
        wave: r.wave,
        mode: r.mode,
        createdAt: r.createdAt,
      })),
    });
  } catch (e) {
    await reportError(e, { route: "GET /api/profile/[username]" });
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
