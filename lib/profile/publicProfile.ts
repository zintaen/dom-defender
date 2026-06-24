// FR-DD-COMM-001 public profile projection.
//
// The public profile endpoint must expose only safe, display-facing fields. This
// module is the projection boundary: it builds the public object field by field,
// so email, passwordHash, and internal ids can never leak even if the caller
// passes a full Mongo document. It imports nothing app-specific so it stays
// unit-testable.

export interface PublicProfile {
  username: string;
  displayName: string;
  isPro: boolean;
  cosmetics: {
    skin: string;
    title?: string;
    trail?: string;
    badge?: string;
  };
  stats: {
    highScore: number;
    totalRuns: number;
    totalBugsFixed: number;
    longestRunSeconds: number;
  };
  achievements: string[];
  memberSince: string | null; // ISO date
}

// A loose shape covering what a lean User document gives us. Everything optional
// so the projection is defensive against partial inputs.
export interface UserLike {
  username?: string;
  displayName?: string | null;
  profilePublic?: boolean;
  isPro?: boolean;
  selectedSkin?: string | null;
  selectedTitle?: string | null;
  selectedTrail?: string | null;
  selectedBadge?: string | null;
  unlockedAchievements?: string[];
  highScore?: number;
  totalRuns?: number;
  totalBugsFixed?: number;
  longestRunSeconds?: number;
  createdAt?: Date | string | null;
}

// Privacy is opt-out: a profile counts as public unless profilePublic is
// explicitly false. Legacy users with no flag stay public (the account toggle
// ships in the same slice so they can opt out).
export function isProfilePublic(u: { profilePublic?: boolean } | null | undefined): boolean {
  return !!u && u.profilePublic !== false;
}

function num(v: number | undefined, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function trimmed(v: string | null | undefined): string | undefined {
  const s = (v ?? "").trim();
  return s.length > 0 ? s : undefined;
}

export function projectPublicProfile(u: UserLike): PublicProfile {
  const username = (u.username ?? "").trim();
  return {
    username,
    displayName: trimmed(u.displayName) ?? username,
    isPro: !!u.isPro,
    cosmetics: {
      skin: trimmed(u.selectedSkin) ?? "default",
      title: trimmed(u.selectedTitle),
      trail: trimmed(u.selectedTrail),
      badge: trimmed(u.selectedBadge),
    },
    stats: {
      highScore: num(u.highScore),
      totalRuns: num(u.totalRuns),
      totalBugsFixed: num(u.totalBugsFixed),
      longestRunSeconds: num(u.longestRunSeconds),
    },
    achievements: Array.isArray(u.unlockedAchievements) ? u.unlockedAchievements.slice(0, 100) : [],
    memberSince: u.createdAt ? new Date(u.createdAt).toISOString() : null,
  };
}

// Username lookups are case-insensitive; store/compare on the normalized form.
export function normalizeUsername(s: string): string {
  return String(s ?? "").trim().toLowerCase();
}

export function isValidUsernameParam(s: string): boolean {
  const n = String(s ?? "").trim();
  return n.length >= 2 && n.length <= 24;
}
