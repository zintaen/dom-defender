import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import AuthAttempt from "@/models/AuthAttempt";
import { clientIpFromHeaders } from "@/lib/rateLimit";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.username || !credentials.password) return null;
        await connectDB();

        // Per-IP login throttle (NFR-DOM-003 / L1-T3): block brute force after
        // too many attempts in a window. next-auth v4 passes the request here.
        const ip = clientIpFromHeaders(
          (n) => (req?.headers as Record<string, string | undefined> | undefined)?.[n] ?? null,
          { trustForwardedFor: process.env.TRUST_FORWARDED_FOR === "true" }
        );
        const ipHash = createHash("sha256").update(`login:${ip}`).digest("hex").slice(0, 16);
        const WINDOW_MS = 15 * 60 * 1000;
        const MAX_ATTEMPTS = 10;
        const recent = await AuthAttempt.countDocuments({
          ipHash,
          kind: "login",
          createdAt: { $gte: new Date(Date.now() - WINDOW_MS) },
        });
        if (recent >= MAX_ATTEMPTS) return null; // locked out for the window
        await AuthAttempt.create({
          ipHash,
          kind: "login",
          username: credentials.username.toLowerCase().trim(),
        });

        const u = await User.findOne({ username: credentials.username.toLowerCase().trim() }).lean();
        if (!u) return null;
        const ok = await bcrypt.compare(credentials.password, u.passwordHash);
        if (!ok) return null;
        return { id: String(u._id), username: u.username, email: u.email ?? null };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.username = (user as any).username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).username = token.username as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
