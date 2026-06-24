import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { SKINS } from "@/lib/game/skins";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    await connectDB();
    const u = await User.findById((session.user as any).id).lean();
    if (!u) return NextResponse.json({ error: "User missing." }, { status: 404 });
    return NextResponse.json({
      username: u.username,
      email: u.email,
      profilePublic: u.profilePublic !== false,
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
    const body = await req.json();
    await connectDB();
    const u = await User.findById((session.user as any).id);
    if (!u) return NextResponse.json({ error: "User missing." }, { status: 404 });

    if (typeof body.selectedSkin === "string") {
      const ok = SKINS.find((s) => s.id === body.selectedSkin);
      if (!ok) return NextResponse.json({ error: "Unknown skin." }, { status: 400 });
      if (!u.unlockedSkins.includes(body.selectedSkin)) {
        return NextResponse.json({ error: "Skin not unlocked." }, { status: 403 });
      }
      u.selectedSkin = body.selectedSkin;
    }

    // Public profile controls (FR-DD-COMM-001).
    if (typeof body.profilePublic === "boolean") {
      u.profilePublic = body.profilePublic;
    }
    if (typeof body.displayName === "string") {
      const dn = body.displayName.trim().slice(0, 32);
      u.displayName = dn.length > 0 ? dn : undefined;
    }

    await u.save();
    return NextResponse.json({
      ok: true,
      selectedSkin: u.selectedSkin,
      profilePublic: u.profilePublic,
      displayName: u.displayName ?? null,
    });
  } catch (e) {
    console.error("[profile PATCH]", e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
