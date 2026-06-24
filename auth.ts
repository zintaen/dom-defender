import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { and, eq, gte, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, authAttempts } from "@/db/schema";
import { clientIpFromHeaders } from "@/lib/rateLimit";

// Auth.js v5 (NextAuth) configuration. Data layer is Supabase Postgres via
// Drizzle; auth itself is unchanged (Credentials + bcrypt + JWT sessions).
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
      // v5: the second argument is a standard Web Request, so the login throttle
      // reads headers via request.headers.get(...).
      authorize: async (credentials, request) => {
        const username = String(credentials?.username ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");
        if (!username || !password) return null;

        // Per-IP login throttle (NFR-DOM-003 / L1-T3): count recent rows in the
        // window (durable, serverless-safe).
        const ip = clientIpFromHeaders((n) => request?.headers?.get(n) ?? null, {
          trustForwardedFor: process.env.TRUST_FORWARDED_FOR === "true",
        });
        const ipHash = createHash("sha256").update(`login:${ip}`).digest("hex").slice(0, 16);
        const WINDOW_MS = 15 * 60 * 1000;
        const MAX_ATTEMPTS = 10;
        const since = new Date(Date.now() - WINDOW_MS);
        const [{ n }] = await db
          .select({ n: count() })
          .from(authAttempts)
          .where(
            and(
              eq(authAttempts.ipHash, ipHash),
              eq(authAttempts.kind, "login"),
              gte(authAttempts.createdAt, since)
            )
          );
        if ((n ?? 0) >= MAX_ATTEMPTS) return null; // locked out for the window
        await db.insert(authAttempts).values({ ipHash, kind: "login", username });

        const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
        const u = rows[0];
        if (!u) return null;
        const ok = await bcrypt.compare(password, u.passwordHash);
        if (!ok) return null;
        return { id: u.id, username: u.username, email: u.email ?? null };
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
