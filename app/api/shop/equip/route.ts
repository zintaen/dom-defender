import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getCosmetic } from "@/lib/game/cosmetics";

export const dynamic = "force-dynamic";

// POST /api/shop/equip { cosmeticId, slot: "trail" | "title" | "badge" | "sfxPack" }
// Sets the given slot to the given cosmetic (must be owned). Pass cosmeticId
// as null/empty string to clear the slot.
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const rawId: string | null = typeof body?.cosmeticId === "string" ? body.cosmeticId : null;
    const slot: "trail" | "title" | "badge" | "sfxPack" = body?.slot;
    if (!["trail", "title", "badge", "sfxPack"].includes(slot)) {
      return NextResponse.json({ error: "Unknown slot." }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById((session.user as any).id);
    if (!user) return NextResponse.json({ error: "User missing." }, { status: 404 });

    // Empty string -> clear the slot.
    if (!rawId) {
      switch (slot) {
        case "trail":
          user.selectedTrail = undefined;
          break;
        case "title":
          user.selectedTitle = undefined;
          break;
        case "badge":
          user.selectedBadge = undefined;
          break;
        case "sfxPack":
          user.selectedSfxPack = undefined;
          break;
      }
      await user.save();
      return NextResponse.json({ ok: true, cleared: true });
    }

    const cosmetic = getCosmetic(rawId);
    if (!cosmetic) return NextResponse.json({ error: "Unknown cosmetic." }, { status: 400 });

    // Check ownership.
    if (!user.ownedCosmetics.includes(cosmetic.id)) {
      return NextResponse.json({ error: "You don't own that cosmetic." }, { status: 403 });
    }
    // Category must match slot.
    const expectedCategory = slot === "sfxPack" ? "sfx_pack" : slot;
    if (cosmetic.category !== expectedCategory) {
      return NextResponse.json(
        { error: `That cosmetic can't be equipped in the ${slot} slot.` },
        { status: 400 }
      );
    }

    switch (slot) {
      case "trail":
        user.selectedTrail = cosmetic.id;
        break;
      case "title":
        user.selectedTitle = cosmetic.id;
        break;
      case "badge":
        user.selectedBadge = cosmetic.id;
        break;
      case "sfxPack":
        user.selectedSfxPack = cosmetic.id;
        break;
    }
    await user.save();

    return NextResponse.json({
      ok: true,
      slot,
      cosmeticId: cosmetic.id,
      selected: {
        trail: user.selectedTrail,
        title: user.selectedTitle,
        badge: user.selectedBadge,
        sfxPack: user.selectedSfxPack,
      },
    });
  } catch (e) {
    console.error("[shop/equip POST]", e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
