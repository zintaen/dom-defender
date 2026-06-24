import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import AuthAttempt from "@/models/AuthAttempt";
import { clientIpFromHeaders } from "@/lib/rateLimit";
import { reportError } from "@/lib/observability";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = String(body.username ?? "").toLowerCase().trim();
    const password = String(body.password ?? "");
    const email = body.email ? String(body.email).toLowerCase().trim() : undefined;

    if (!/^[a-z0-9_]{2,24}$/.test(username)) {
      return NextResponse.json(
        { error: "Username must be 2-24 chars, lowercase letters, numbers, or underscore." },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }
    // Reject the most common passwords (NFR-DOM-003 / L1-T11). A hosted breach
    // check (k-anonymity) is the stronger form; this denylist is the v1 floor.
    const COMMON_PASSWORDS = new Set([
      "password", "password1", "12345678", "123456789", "qwertyui",
      "11111111", "iloveyou", "abc12345", "football", "letmein1",
    ]);
    if (COMMON_PASSWORDS.has(password.toLowerCase())) {
      return NextResponse.json({ error: "That password is too common — please choose another." }, { status: 400 });
    }

    await connectDB();

    // Per-IP registration throttle (NFR-DOM-003 / L1-T3): cap new accounts per
    // network per hour to stop account-creation spam.
    const ip = clientIpFromHeaders((n) => req.headers.get(n), {
      trustForwardedFor: process.env.TRUST_FORWARDED_FOR === "true",
    });
    const ipHash = createHash("sha256").update(`register:${ip}`).digest("hex").slice(0, 16);
    const REG_WINDOW_MS = 60 * 60 * 1000;
    const REG_MAX = 10;
    const recentRegs = await AuthAttempt.countDocuments({
      ipHash,
      kind: "register",
      createdAt: { $gte: new Date(Date.now() - REG_WINDOW_MS) },
    });
    if (recentRegs >= REG_MAX) {
      return NextResponse.json({ error: "Too many sign-ups from this network. Try again later." }, { status: 429 });
    }
    await AuthAttempt.create({ ipHash, kind: "register" });

    const exists = await User.findOne({ username });
    if (exists) return NextResponse.json({ error: "Username taken." }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 10);
    const u = await User.create({ username, email, passwordHash });

    return NextResponse.json({ ok: true, userId: String(u._id), username: u.username });
  } catch (e: any) {
    await reportError(e, { route: "POST /api/auth/register" });
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
