import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { getCosmetic } from "@/lib/game/cosmetics";

export const dynamic = "force-dynamic";

type Slot = "trail" | "title" | "badge" | "sfxPack";
const SLOT_COLUMN: Record<Slot, "selectedTrail" | "selectedTitle" | "selectedBadge" | "selectedSfxPack"> = {
  trail: "selectedTrail",
  title: "selectedTitle",
  badge: "selectedBadge",
  sfxPack: "selectedSfxPack",
};

// POST /api/shop/equip { cosmeticId, slot }. Pass cosmeticId null/empty to clear.
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;

    const body = await req.json().catch(() => ({}));
    const rawId: string | null = typeof body?.cosmeticId === "string" ? body.cosmeticId : null;
    const slot: Slot = body?.slot;
    if (!["trail", "title", "badge", "sfxPack"].includes(slot)) {
      return NextResponse.json({ error: "Unknown slot." }, { status: 400 });
    }

    const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const user = rows[0];
    if (!user) return NextResponse.json({ error: "User missing." }, { status: 404 });

    // Empty -> clear the slot.
    if (!rawId) {
      await db.update(users).set({ [SLOT_COLUMN[slot]]: null }).where(eq(users.id, userId));
      return NextResponse.json({ ok: true, cleared: true });
    }

    const cosmetic = getCosmetic(rawId);
    if (!cosmetic) return NextResponse.json({ error: "Unknown cosmetic." }, { status: 400 });

    if (!user.ownedCosmetics.includes(cosmetic.id)) {
      return NextResponse.json({ error: "You don't own that cosmetic." }, { status: 403 });
    }
    const expectedCategory = slot === "sfxPack" ? "sfx_pack" : slot;
    if (cosmetic.category !== expectedCategory) {
      return NextResponse.json(
        { error: `That cosmetic can't be equipped in the ${slot} slot.` },
        { status: 400 }
      );
    }

    await db.update(users).set({ [SLOT_COLUMN[slot]]: cosmetic.id }).where(eq(users.id, userId));

    const after = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const u = after[0]!;
    return NextResponse.json({
      ok: true,
      slot,
      cosmeticId: cosmetic.id,
      selected: {
        trail: u.selectedTrail,
        title: u.selectedTitle,
        badge: u.selectedBadge,
        sfxPack: u.selectedSfxPack,
      },
    });
  } catch (e) {
    console.error("[shop/equip POST]", e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
