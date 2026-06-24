import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { rooms, type RoomMember } from "@/db/schema";
import { makeRoomCode, isValidRoomCode, roomSeed, rankMembers } from "@/lib/game/room";
import { reportError } from "@/lib/observability";

export const dynamic = "force-dynamic";

// POST actions: create | join | submit | close
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    const userId = (session.user as { id: string }).id;
    const username = ((session.user as { username?: string }).username) ?? "player";

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === "create") {
      const timeBoxMinutes = Math.min(120, Math.max(5, Number(body.timeBoxMinutes) || 15));
      let code = makeRoomCode();
      for (let i = 0; i < 5; i++) {
        const ex = await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.code, code)).limit(1);
        if (ex.length === 0) break;
        code = makeRoomCode();
      }
      const members: RoomMember[] = [{ userId, username, score: 0 }];
      const inserted = await db
        .insert(rooms)
        .values({
          code,
          hostUserId: userId,
          hostUsername: username,
          seed: roomSeed(code),
          status: "open",
          timeBoxMinutes,
          members,
          closesAt: new Date(Date.now() + timeBoxMinutes * 60 * 1000),
        })
        .returning({ code: rooms.code, seed: rooms.seed });
      return NextResponse.json({ ok: true, code: inserted[0].code, seed: inserted[0].seed });
    }

    if (action === "join") {
      const code = String(body.code || "").toUpperCase();
      if (!isValidRoomCode(code)) return NextResponse.json({ error: "Invalid room code." }, { status: 400 });
      const rows = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
      const room = rows[0];
      if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });
      if (room.status !== "open") return NextResponse.json({ error: "Room is closed." }, { status: 409 });
      const members = room.members ?? [];
      if (!members.some((m) => m.userId === userId)) {
        await db
          .update(rooms)
          .set({ members: [...members, { userId, username, score: 0 }] })
          .where(eq(rooms.code, code));
      }
      return NextResponse.json({ ok: true, code: room.code, seed: room.seed });
    }

    if (action === "submit") {
      // v1: records the reported best score. HARDENING: route this through the
      // replay-validated score path (NFR-DOM-001) before counting it.
      const code = String(body.code || "").toUpperCase();
      const score = Math.max(0, Math.floor(Number(body.score) || 0));
      if (!isValidRoomCode(code)) return NextResponse.json({ error: "Invalid room code." }, { status: 400 });
      const rows = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
      const room = rows[0];
      if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });
      if (room.status !== "open") return NextResponse.json({ error: "Room is closed." }, { status: 409 });
      const members = room.members ?? [];
      const idx = members.findIndex((m) => m.userId === userId);
      if (idx < 0) return NextResponse.json({ error: "Join the room first." }, { status: 403 });
      let best = members[idx].score;
      if (score > best) {
        best = score;
        const next = members.map((m, i) => (i === idx ? { ...m, score } : m));
        await db.update(rooms).set({ members: next }).where(eq(rooms.code, code));
      }
      return NextResponse.json({ ok: true, score: best });
    }

    if (action === "close") {
      const code = String(body.code || "").toUpperCase();
      const rows = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
      const room = rows[0];
      if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });
      if (room.hostUserId !== userId) {
        return NextResponse.json({ error: "Only the host can close the room." }, { status: 403 });
      }
      await db.update(rooms).set({ status: "closed" }).where(eq(rooms.code, code));
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
    const rows = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
    const room = rows[0];
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
