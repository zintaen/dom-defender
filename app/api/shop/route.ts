import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { COSMETICS } from "@/lib/game/cosmetics";
import { isProBillingEnabled } from "@/lib/pro";

export const dynamic = "force-dynamic";

// GET /api/shop — returns the full cosmetics catalogue + the user's owned set
// + their coin balance (if signed in) + feature-flag state.
export async function GET() {
  try {
    const session = await auth();
    let owned: string[] = [];
    let coins = 0;
    let isPro = false;
    let selectedTrail: string | undefined;
    let selectedTitle: string | undefined;
    let selectedBadge: string | undefined;
    let selectedSfxPack: string | undefined;

    if (session?.user) {
      await connectDB();
      const u = await User.findById((session.user as any).id).lean();
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
