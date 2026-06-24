// Pro tier gating. Two layers of truth:
//   1) The PRO_BILLING_ENABLED env var controls whether billing flows are
//      *plugged in at all* — during Q1 we ship the UI with this flag OFF.
//   2) Each user has `isPro` in their User doc. This is granted via a webhook
//      from Stripe or manually by admin, and persists across sessions.
//
// For gating features we combine both: a user only gets Pro perks if billing
// is enabled AND their account is marked Pro. This keeps us from accidentally
// giving out paid perks while the product is still in Q1 preview.
//
// Waitlist: when billing is off, /pro collects emails via a POST to
// /api/pro-waitlist so we know who to ping when we flip the flag.

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/db/schema";

export function isProBillingEnabled(): boolean {
  return process.env.PRO_BILLING_ENABLED === "true" || process.env.PRO_BILLING_ENABLED === "1";
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

// Client-exposed feature flags. Safe to serialize.
export function publicProConfig(): {
  billingEnabled: boolean;
  stripeReady: boolean;
} {
  return {
    billingEnabled: isProBillingEnabled(),
    stripeReady: isProBillingEnabled() && stripeConfigured(),
  };
}

// Server-side guard used in API routes.
// Usage:
//   const gate = await requirePro();
//   if (gate.response) return gate.response;
//   // gate.user is now a Pro user document.
export async function requirePro(): Promise<
  | { response: NextResponse; user?: undefined }
  | { response?: undefined; user: any }
> {
  const session = await auth();
  if (!session?.user) {
    return { response: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  }
  if (!isProBillingEnabled()) {
    return {
      response: NextResponse.json(
        { error: "Pro is not yet available. Join the waitlist at /pro." },
        { status: 403 }
      ),
    };
  }
  const rows = await db.select().from(users).where(eq(users.id, (session.user as any).id)).limit(1);
  const u = rows[0];
  if (!u) {
    return { response: NextResponse.json({ error: "User missing." }, { status: 404 }) };
  }
  if (!u.isPro) {
    return {
      response: NextResponse.json(
        { error: "Pro required.", upgradeUrl: "/pro" },
        { status: 402 }
      ),
    };
  }
  return { user: u };
}
