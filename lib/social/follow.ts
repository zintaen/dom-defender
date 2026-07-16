// TASK-DD-COMM-002 follow graph helpers.
//
// The follow edge is a simple (follower -> following) pair. The database
// enforces uniqueness and these helpers enforce the rules that are easy to get
// wrong: no self-follow, no empty ids, and a feed that is always newest-first
// and bounded. Pure and unit-testable; imports nothing app-specific.

export interface FollowCheck {
  ok: boolean;
  reason?: string;
}

// A follow is valid only between two distinct, present users.
export function canFollow(followerId: string, followingId: string): FollowCheck {
  const a = String(followerId ?? "").trim();
  const b = String(followingId ?? "").trim();
  if (!a || !b) return { ok: false, reason: "Missing user." };
  if (a === b) return { ok: false, reason: "You cannot follow yourself." };
  return { ok: true };
}

export interface FeedRow {
  username: string;
  score: number;
  wave: number;
  mode: string;
  createdAt: string | Date;
}
export interface FeedItem {
  username: string;
  score: number;
  wave: number;
  mode: string;
  createdAt: string; // ISO
}

// Newest first, bounded. Used after the feed query has already filtered to
// public followed players.
export function sortFeedNewestFirst(rows: FeedRow[], limit = 30): FeedItem[] {
  const safeLimit = Math.max(0, Math.floor(limit));
  return [...rows]
    .sort((x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime())
    .slice(0, safeLimit)
    .map((r) => ({
      username: r.username,
      score: r.score,
      wave: r.wave,
      mode: r.mode,
      createdAt: new Date(r.createdAt).toISOString(),
    }));
}

// De-duplicate a list of id strings, dropping empties. Used to build the set of
// followed user ids before querying their activity.
export function dedupeIds(ids: Array<string | null | undefined>): string[] {
  return Array.from(new Set(ids.map((s) => String(s ?? "").trim()))).filter((s) => s.length > 0);
}
