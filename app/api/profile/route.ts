import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { SKINS } from "@/lib/game/skins";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    const userId = (session.user as { id: string }).id;
    const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const u = rows[0];
    if (!u) return NextResponse.json({ error: "User missing." }, { status: 404 });
    return NextResponse.json({
      username: u.username,
      email: u.email,
      profilePublic: u.profilePublic,
      displayName: u.displayName ?? null,
      selectedSkin: u.selectedSkin,
      unlockedSkins: u.unlockedSkins,
      unlockedAchievements: u.unlockedAchievements,
      ownedCosmetics: u.ownedCosmetics ?? [],
      selectedTrail: u.selectedTrail,
      selectedTitle: u.selectedTitle,
      selectedBadge: u.selectedBadge,
      selectedSfxPack: u.selectedSfxPack,
      isPro: Boolean(u.isPro),
      proTier: u.proTier,
      totalCoins: u.totalCoins,
      totalRuns: u.totalRuns,
      totalBugsFixed: u.totalBugsFixed,
      longestRunSeconds: u.longestRunSeconds,
      highScore: u.highScore,
    });
  } catch (e) {
    console.error("[profile GET]", e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    const userId = (session.user as { id: string }).id;
    const body = await req.json();

    const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const u = rows[0];
    if (!u) return NextResponse.json({ error: "User missing." }, { status: 404 });

    const updates: Partial<typeof users.$inferInsert> = {};

    if (typeof body.selectedSkin === "string") {
      const ok = SKINS.find((s) => s.id === body.selectedSkin);
      if (!ok) return NextResponse.json({ error: "Unknown skin." }, { status: 400 });
      if (!u.unlockedSkins.includes(body.selectedSkin)) {
        return NextResponse.json({ error: "Skin not unlocked." }, { status: 403 });
      }
      updates.selectedSkin = body.selectedSkin;
    }
    if (typeof body.profilePublic === "boolean") {
      updates.profilePublic = body.profilePublic;
    }
    if (typeof body.displayName === "string") {
      const dn = body.displayName.trim().slice(0, 32);
      updates.displayName = dn.length > 0 ? dn : null;
    }

    if (Object.keys(updates).length > 0) {
      await db.update(users).set(updates).where(eq(users.id, userId));
    }

    return NextResponse.json({
      ok: true,
      selectedSkin: updates.selectedSkin ?? u.selectedSkin,
      profilePublic: updates.profilePublic ?? u.profilePublic,
      displayName: (updates.displayName !== undefined ? updates.displayName : u.displayName) ?? null,
    });
  } catch (e) {
    console.error("[profile PATCH]", e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
