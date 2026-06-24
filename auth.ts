import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import AuthAttempt from "@/models/AuthAttempt";
import { clientIpFromHeaders } from "@/lib/rateLimit";

// Auth.js v5 (NextAuth) configuration. Ported from the v4 lib/auth.ts.
// Consumers read session.user.id and session.user.username (set in the callbacks
// below and accessed with an `as any` cast at the call sites).
export const authConfig = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      // v5: the second argument is a standard Web Request (was a plain object in v4),
      // so the login throttle reads headers via request.headers.get(...).
      authorize: async (credentials, request) => {
        const username = String(credentials?.username ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");
        if (!username || !password) return null;

        await connectDB();

        // Per-IP login throttle (NFR-DOM-003 / L1-T3).
        const ip = clientIpFromHeaders((n) => request?.headers?.get(n) ?? null, {
          trustForwardedFor: process.env.TRUST_FORWARDED_FOR === "true",
        });
        const ipHash = createHash("sha256").update(`login:${ip}`).digest("hex").slice(0, 16);
        const WINDOW_MS = 15 * 60 * 1000;
        const MAX_ATTEMPTS = 10;
        const recent = await AuthAttempt.countDocuments({
          ipHash,
          kind: "login",
          createdAt: { $gte: new Date(Date.now() - WINDOW_MS) },
        });
        if (recent >= MAX_ATTEMPTS) return null; // locked out for the window
        await AuthAttempt.create({ ipHash, kind: "login", username });

        const u = await User.findOne({ username }).lean();
        if (!u) return null;
        const ok = await bcrypt.compare(password, (u as any).passwordHash);
        if (!ok) return null;
        return {
          id: String((u as any)._id),
          username: (u as any).username,
          email: (u as any).email ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as any).id = (user as any).id;
        (token as any).username = (user as any).username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).id;
        (session.user as any).username = (token as any).username;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);
