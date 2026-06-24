import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { COSMETICS } from "@/lib/game/cosmetics";
import { isProBillingEnabled } from "@/lib/pro";

export const dynamic = "force-dynamic";

// GET /api/shop - cosmetics catalogue + the user's owned set + coin balance.
export async function GET() {
  try {
    const session = await auth();
    let owned: string[] = [];
    let coins = 0;
    let isPro = false;
    let selectedTrail: string | null | undefined;
    let selectedTitle: string | null | undefined;
    let selectedBadge: string | null | undefined;
    let selectedSfxPack: string | null | undefined;

    if (session?.user) {
      const rows = await db.select().from(users).where(eq(users.id, (session.user as { id: string }).id)).limit(1);
      const u = rows[0];
      if (u) {
        owned = u.ownedCosmetics ?? [];
        coins = u.totalCoins ?? 0;
        isPro = Boolean(u.isPro);
        selectedTrail = u.selectedTrail;
        selectedTitle = u.selectedTitle;
        selectedBadge = u.selectedBadge;
        selectedSfxPack = u.selectedSfxPack;
      }
    }

    return NextResponse.json({
      cosmetics: COSMETICS,
      owned,
      coins,
      isPro,
      selected: {
        trail: selectedTrail,
        title: selectedTitle,
        badge: selectedBadge,
        sfxPack: selectedSfxPack,
      },
      billingEnabled: isProBillingEnabled(),
    });
  } catch (e) {
    console.error("[shop GET]", e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
