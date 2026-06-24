import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import Room from "@/models/Room";
import { makeRoomCode, isValidRoomCode, roomSeed, rankMembers } from "@/lib/game/room";
import { reportError } from "@/lib/observability";

export const dynamic = "force-dynamic";

// POST actions: create | join | submit | close
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    const userId = (session.user as any).id as string;
    const username = ((session.user as any).username as string) ?? "player";

    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    await connectDB();

    if (action === "create") {
      const timeBoxMinutes = Math.min(120, Math.max(5, Number(body.timeBoxMinutes) || 15));
      let code = makeRoomCode();
      for (let i = 0; i < 5; i++) {
        if (!(await Room.exists({ code }))) break;
        code = makeRoomCode();
      }
      const room = await Room.create({
        code,
        hostUserId: userId,
        hostUsername: username,
        seed: roomSeed(code),
        status: "open",
        timeBoxMinutes,
        members: [{ userId, username, score: 0 }],
        closesAt: new Date(Date.now() + timeBoxMinutes * 60 * 1000),
      });
      return NextResponse.json({ ok: true, code: room.code, seed: room.seed });
    }

    if (action === "join") {
      const code = String(body.code || "").toUpperCase();
      if (!isValidRoomCode(code)) return NextResponse.json({ error: "Invalid room code." }, { status: 400 });
      const room = await Room.findOne({ code });
      if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });
      if (room.status !== "open") return NextResponse.json({ error: "Room is closed." }, { status: 409 });
      if (!room.members.some((m) => m.userId === userId)) {
        room.members.push({ userId, username, score: 0 });
        await room.save();
      }
      return NextResponse.json({ ok: true, code: room.code, seed: room.seed });
    }

    if (action === "submit") {
      // v1: records the reported best score. HARDENING: route this through the
      // replay-validated score path (NFR-DOM-001) before counting it, the same
      // way /api/scores validates a run.
      const code = String(body.code || "").toUpperCase();
      const score = Math.max(0, Math.floor(Number(body.score) || 0));
      if (!isValidRoomCode(code)) return NextResponse.json({ error: "Invalid room code." }, { status: 400 });
      const room = await Room.findOne({ code });
      if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });
      if (room.status !== "open") return NextResponse.json({ error: "Room is closed." }, { status: 409 });
      const member = room.members.find((m) => m.userId === userId);
      if (!member) return NextResponse.json({ error: "Join the room first." }, { status: 403 });
      if (score > member.score) member.score = score; // keep best
      await room.save();
      return NextResponse.json({ ok: true, score: member.score });
    }

    if (action === "close") {
      const code = String(body.code || "").toUpperCase();
      const room = await Room.findOne({ code });
      if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });
      if (room.hostUserId !== userId) return NextResponse.json({ error: "Only the host can close the room." }, { status: 403 });
      room.status = "closed";
      await room.save();
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (e) {
    await reportError(e, { route: "POST /api/teams" });
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

// GET /api/teams?code=XXXX -> room status + ranked standings
export async function GET(req: Request) {
  try {
    const code = (new URL(req.url).searchParams.get("code") || "").toUpperCase();
    if (!isValidRoomCode(code)) return NextResponse.json({ error: "Invalid room code." }, { status: 400 });
    await connectDB();
    const room = await Room.findOne({ code }).lean();
    if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });
    return NextResponse.json({
      code: room.code,
      seed: room.seed,
      status: room.status,
      hostUsername: room.hostUsername,
      timeBoxMinutes: room.timeBoxMinutes,
      closesAt: room.closesAt,
      standings: rankMembers(
        (room.members ?? []).map((m) => ({ userId: m.userId, username: m.username, score: m.score }))
      ),
    });
  } catch (e) {
    await reportError(e, { route: "GET /api/teams" });
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
