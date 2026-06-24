import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getCosmetic, isCoinPurchasable, hasPrerequisites, isUsdPurchasable } from "@/lib/game/cosmetics";
import { isProBillingEnabled } from "@/lib/pro";
import { reportError } from "@/lib/observability";

export const dynamic = "force-dynamic";

// POST /api/shop/purchase { cosmeticId, method?: "coins" | "usd" }
// - method=coins: deducts coins immediately and credits the item.
// - method=usd: returns a stub Stripe checkout URL. Only available when
//   PRO_BILLING_ENABLED is true AND STRIPE_SECRET_KEY is configured. Otherwise
//   we return 503 and the UI points users to the waitlist.
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const cosmeticId = typeof body?.cosmeticId === "string" ? body.cosmeticId : "";
    const method: "coins" | "usd" =
      body?.method === "usd" ? "usd" : "coins";

    const cosmetic = getCosmetic(cosmeticId);
    if (!cosmetic) {
      return NextResponse.json({ error: "Unknown cosmetic." }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById((session.user as any).id);
    if (!user) return NextResponse.json({ error: "User missing." }, { status: 404 });

    if (user.ownedCosmetics.includes(cosmeticId)) {
      return NextResponse.json({ error: "Already owned." }, { status: 409 });
    }

    if (!hasPrerequisites(cosmetic, user.ownedCosmetics)) {
      return NextResponse.json(
        { error: "Locked — unlock prerequisite cosmetics first." },
        { status: 403 }
      );
    }

    // --- Stripe path (usd) ---
    if (method === "usd") {
      if (!isUsdPurchasable(cosmetic)) {
        return NextResponse.json(
          { error: "This item can't be bought with real money." },
          { status: 400 }
        );
      }
      if (!isProBillingEnabled()) {
        return NextResponse.json(
          {
            error:
              "Billing is not enabled yet. Join the waitlist at /pro and we'll email you when it opens.",
            waitlistUrl: "/pro",
          },
          { status: 503 }
        );
      }
      if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json(
          { error: "Billing is enabled but not configured. Try again later." },
          { status: 503 }
        );
      }
      // Placeholder — real implementation would call Stripe here and return
      // a Checkout Session URL. We don't want to pull in the Stripe SDK in
      // the Q1 no-external-deps slice, so we return a stub.
      return NextResponse.json({
        ok: false,
        stub: true,
        message:
          "Stripe checkout would open here. Implement with the Stripe SDK once billing is enabled.",
      });
    }

    // --- Coin path ---
    if (!isCoinPurchasable(cosmetic)) {
      return NextResponse.json(
        { error: "This item isn't available for coin purchase." },
        { status: 400 }
      );
    }
    const price = cosmetic.coinPrice ?? Infinity;
    if (user.totalCoins < price) {
      return NextResponse.json(
        { error: `Need ${price} coins — you have ${user.totalCoins}.` },
        { status: 402 }
      );
    }

    // Atomic, race-safe deduction (L1-T9): the update only applies if the balance
    // still covers the price AND the item is not already owned. Two concurrent
    // purchases can no longer both pass the earlier check and double-spend.
    const updated = await User.findOneAndUpdate(
      { _id: user._id, totalCoins: { $gte: price }, ownedCosmetics: { $ne: cosmetic.id } },
      { $inc: { totalCoins: -price }, $addToSet: { ownedCosmetics: cosmetic.id } },
      { new: true }
    );
    if (!updated) {
      return NextResponse.json(
        { error: "Purchase could not be completed — your coins changed or you already own this item." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      cosmeticId: cosmetic.id,
      coins: updated.totalCoins,
      ownedCosmetics: updated.ownedCosmetics,
    });
  } catch (e: any) {
    await reportError(e, { route: "POST /api/shop/purchase" });
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
