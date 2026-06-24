// Drizzle schema for DOM Defender on Supabase Postgres.
//
// Replaces the Mongoose models one-to-one. JS keys stay camelCase (so the route
// code and the pure helpers read the same field names as before); the actual
// columns are snake_case Postgres idiomatic. ObjectId ids become uuid. The 24h
// TTL collections (rooms, auth_attempts) keep a created_at/closes_at column and
// are filtered by time in queries (Postgres has no native TTL; an optional
// pg_cron job can prune old rows later).
import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---- users -------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Plain unique matches the old Mongoose `unique: true` (case-sensitive).
  // Case-insensitive lookups are done with lower(username) in the queries.
  username: text("username").notNull().unique(),
  email: text("email"),
  passwordHash: text("password_hash").notNull(),
  // Public profile (FR-DD-COMM-001). Opt-out: public unless explicitly false.
  profilePublic: boolean("profile_public").notNull().default(true),
  displayName: text("display_name"),
  selectedSkin: text("selected_skin").notNull().default("default"),
  unlockedSkins: text("unlocked_skins").array().notNull().default(sql`ARRAY['default']::text[]`),
  unlockedAchievements: text("unlocked_achievements").array().notNull().default(sql`'{}'::text[]`),
  ownedCosmetics: text("owned_cosmetics").array().notNull().default(sql`'{}'::text[]`),
  selectedTitle: text("selected_title"),
  selectedTrail: text("selected_trail"),
  selectedBadge: text("selected_badge"),
  selectedSfxPack: text("selected_sfx_pack"),
  isPro: boolean("is_pro").notNull().default(false),
  proTier: text("pro_tier"), // "supporter" | "patron"
  proSince: timestamp("pro_since", { withTimezone: true }),
  totalCoins: integer("total_coins").notNull().default(0),
  totalRuns: integer("total_runs").notNull().default(0),
  totalBugsFixed: integer("total_bugs_fixed").notNull().default(0),
  longestRunSeconds: integer("longest_run_seconds").notNull().default(0),
  highScore: integer("high_score").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- scores ------------------------------------------------------------
export const scores = pgTable(
  "scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    username: text("username").notNull(), // denormalized for fast board reads
    mode: text("mode").notNull(), // "endless" | "daily" | "tournament"
    dailyKey: text("daily_key"), // YYYY-MM-DD (daily) or ISO week YYYY-Www (tournament)
    seed: bigint("seed", { mode: "number" }), // unsigned 32-bit, fits in a JS number
    score: integer("score").notNull(),
    durationSec: integer("duration_sec").notNull(),
    wave: integer("wave").notNull(),
    bugsFixed: integer("bugs_fixed").notNull().default(0),
    bossesDefeated: integer("bosses_defeated").notNull().default(0),
    maxCombo: integer("max_combo").notNull().default(0),
    skinUsed: text("skin_used").notNull().default("default"),
    verified: boolean("verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("scores_mode_score_idx").on(t.mode, t.score.desc(), t.createdAt.desc()),
    index("scores_mode_daily_idx").on(t.mode, t.dailyKey, t.score.desc()),
    index("scores_user_idx").on(t.userId, t.createdAt.desc()),
    index("scores_seed_idx").on(t.seed),
  ]
);

// ---- replays -----------------------------------------------------------
export const replays = pgTable(
  "replays",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shortId: text("short_id").notNull().unique(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    username: text("username"),
    mode: text("mode").notNull(), // "endless" | "daily"
    seed: bigint("seed", { mode: "number" }),
    dailyKey: text("daily_key"),
    skinId: text("skin_id").notNull().default("default"),
    durationSec: integer("duration_sec").notNull(),
    score: integer("score").notNull(),
    wave: integer("wave").notNull(),
    bugsFixed: integer("bugs_fixed").notNull(),
    bossesDefeated: integer("bosses_defeated").notNull(),
    maxCombo: integer("max_combo").notNull(),
    events: jsonb("events").notNull().default(sql`'[]'::jsonb`),
    snapshots: jsonb("snapshots").notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("replays_user_idx").on(t.userId, t.createdAt.desc())]
);

// ---- auth_attempts (login/register throttle, NFR-DOM-003) --------------
export const authAttempts = pgTable(
  "auth_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ipHash: text("ip_hash").notNull(),
    kind: text("kind").notNull(), // "login" | "register"
    username: text("username"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("auth_attempts_ip_kind_idx").on(t.ipHash, t.kind, t.createdAt.desc())]
);

// ---- pro_waitlist ------------------------------------------------------
export const proWaitlist = pgTable("pro_waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  username: text("username"),
  source: text("source").notNull().default("pro_page"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---- rooms (FR-DD-EDU-001 teams) ---------------------------------------
export interface RoomMember {
  userId: string;
  username: string;
  score: number;
}

export const rooms = pgTable("rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  hostUserId: uuid("host_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  hostUsername: text("host_username").notNull(),
  seed: bigint("seed", { mode: "number" }).notNull(),
  status: text("status").notNull().default("open"), // "open" | "closed"
  timeBoxMinutes: integer("time_box_minutes").notNull().default(15),
  members: jsonb("members").$type<RoomMember[]>().notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),
});

// ---- follows (FR-DD-COMM-002) ------------------------------------------
export const follows = pgTable(
  "follows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    follower: uuid("follower").notNull().references(() => users.id, { onDelete: "cascade" }),
    following: uuid("following").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("follows_pair_unq").on(t.follower, t.following),
    index("follows_follower_idx").on(t.follower),
    index("follows_following_idx").on(t.following),
  ]
);

// ---- byo_attempts (BYO URL load log + rate limit) ----------------------
export const byoAttempts = pgTable(
  "byo_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ipHash: text("ip_hash").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    domain: text("domain").notNull(),
    blocked: boolean("blocked").notNull().default(false),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("byo_attempts_ip_idx").on(t.ipHash, t.createdAt.desc())]
);
