import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import ProWaitlist from "@/models/ProWaitlist";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/pro-waitlist { email, note?, source? }
// Collects Pro interest when billing is off. Idempotent — resubmitting the
// same email is a no-op, not an error.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const note = typeof body?.note === "string" ? body.note.slice(0, 500) : undefined;
    const source = typeof body?.source === "string" ? body.source.slice(0, 50) : "pro_page";

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
    }

    const session = await auth();
    const userId = session?.user ? (session.user as any).id : undefined;
    const username = session?.user ? ((session.user as any).username as string | undefined) : undefined;

    await connectDB();
    try {
      await ProWaitlist.create({ email, note, source, userId, username });
    } catch (e: any) {
      // Duplicate email — treat as success.
      if (e?.code !== 11000) throw e;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[pro-waitlist POST]", e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
