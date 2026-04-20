import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

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
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    await connectDB();

    const exists = await User.findOne({ username });
    if (exists) return NextResponse.json({ error: "Username taken." }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 10);
    const u = await User.create({ username, email, passwordHash });

    return NextResponse.json({ ok: true, userId: String(u._id), username: u.username });
  } catch (e: any) {
    console.error("[register]", e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
