import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Replay from "@/models/Replay";
import { isValidShortId } from "@/lib/game/replay";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = (params.id ?? "").toLowerCase();
    if (!isValidShortId(id)) {
      return NextResponse.json({ error: "Invalid replay id." }, { status: 400 });
    }

    await connectDB();
    const r = await Replay.findOne({ shortId: id }).lean();
    if (!r) return NextResponse.json({ error: "Replay not found." }, { status: 404 });

    return NextResponse.json({
      shortId: r.shortId,
      username: r.username ?? null,
      mode: r.mode,
      seed: r.seed ?? null,
      dailyKey: r.dailyKey ?? null,
      skinId: r.skinId,
      durationSec: r.durationSec,
      score: r.score,
      wave: r.wave,
      bugsFixed: r.bugsFixed,
      bossesDefeated: r.bossesDefeated,
      maxCombo: r.maxCombo,
      events: r.events,
      snapshots: r.snapshots,
      createdAt: r.createdAt,
    });
  } catch (e: any) {
    console.error("[replays GET]", e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
