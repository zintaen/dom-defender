import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { proWaitlist } from "@/db/schema";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/pro-waitlist { email, note?, source? }
// Collects Pro interest when billing is off. Idempotent - resubmitting the
// same email is a no-op, not an error.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const note = typeof body?.note === "string" ? body.note.slice(0, 500) : null;
    const source = typeof body?.source === "string" ? body.source.slice(0, 50) : "pro_page";

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
    }

    const session = await auth();
    const userId = session?.user ? (session.user as { id?: string }).id ?? null : null;
    const username = session?.user ? (session.user as { username?: string }).username ?? null : null;

    // Unique email -> a duplicate is a no-op (treated as success).
    await db.insert(proWaitlist).values({ email, note, source, userId, username }).onConflictDoNothing();

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[pro-waitlist POST]", e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
