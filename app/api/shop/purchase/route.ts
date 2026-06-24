import { NextResponse } from "next/server";
import { and, eq, gte, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { getCosmetic, isCoinPurchasable, hasPrerequisites, isUsdPurchasable } from "@/lib/game/cosmetics";
import { isProBillingEnabled } from "@/lib/pro";
import { reportError } from "@/lib/observability";

export const dynamic = "force-dynamic";

// POST /api/shop/purchase { cosmeticId, method?: "coins" | "usd" }
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    const userId = (session.user as { id: string }).id;

    const body = await req.json().catch(() => ({}));
    const cosmeticId = typeof body?.cosmeticId === "string" ? body.cosmeticId : "";
    const method: "coins" | "usd" = body?.method === "usd" ? "usd" : "coins";

    const cosmetic = getCosmetic(cosmeticId);
    if (!cosmetic) {
      return NextResponse.json({ error: "Unknown cosmetic." }, { status: 400 });
    }

    const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const user = rows[0];
    if (!user) return NextResponse.json({ error: "User missing." }, { status: 404 });

    if (user.ownedCosmetics.includes(cosmeticId)) {
      return NextResponse.json({ error: "Already owned." }, { status: 409 });
    }
    if (!hasPrerequisites(cosmetic, user.ownedCosmetics)) {
      return NextResponse.json({ error: "Locked - unlock prerequisite cosmetics first." }, { status: 403 });
    }

    // --- Stripe path (usd) ---
    if (method === "usd") {
      if (!isUsdPurchasable(cosmetic)) {
        return NextResponse.json({ error: "This item can't be bought with real money." }, { status: 400 });
      }
      if (!isProBillingEnabled()) {
        return NextResponse.json(
          {
            error: "Billing is not enabled yet. Join the waitlist at /pro and we'll email you when it opens.",
            waitlistUrl: "/pro",
          },
          { status: 503 }
        );
      }
      if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json({ error: "Billing is enabled but not configured. Try again later." }, { status: 503 });
      }
      return NextResponse.json({
        ok: false,
        stub: true,
        message: "Stripe checkout would open here. Implement with the Stripe SDK once billing is enabled.",
      });
    }

    // --- Coin path ---
    if (!isCoinPurchasable(cosmetic)) {
      return NextResponse.json({ error: "This item isn't available for coin purchase." }, { status: 400 });
    }
    const price = cosmetic.coinPrice ?? Number.MAX_SAFE_INTEGER;
    if (user.totalCoins < price) {
      return NextResponse.json({ error: `Need ${price} coins - you have ${user.totalCoins}.` }, { status: 402 });
    }

    // Atomic, race-safe deduction (L1-T9): a single UPDATE that only applies when
    // the balance still covers the price AND the item is not already owned, so two
    // concurrent purchases cannot double-spend.
    const updated = await db
      .update(users)
      .set({
        totalCoins: sql`${users.totalCoins} - ${price}`,
        ownedCosmetics: sql`array_append(${users.ownedCosmetics}, ${cosmetic.id})`,
      })
      .where(
        and(
          eq(users.id, userId),
          gte(users.totalCoins, price),
          sql`not (${cosmetic.id} = any(${users.ownedCosmetics}))`
        )
      )
      .returning({ totalCoins: users.totalCoins, ownedCosmetics: users.ownedCosmetics });

    if (updated.length === 0) {
      return NextResponse.json(
        { error: "Purchase could not be completed - your coins changed or you already own this item." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      cosmeticId: cosmetic.id,
      coins: updated[0].totalCoins,
      ownedCosmetics: updated[0].ownedCosmetics,
    });
  } catch (e: any) {
    await reportError(e, { route: "POST /api/shop/purchase" });
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
