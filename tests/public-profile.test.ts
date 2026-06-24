import { describe, it, expect } from "vitest";
import {
  projectPublicProfile,
  isProfilePublic,
  normalizeUsername,
  isValidUsernameParam,
} from "@/lib/profile/publicProfile";

// FR-DD-COMM-001: the public projection must never leak sensitive fields, and
// privacy is opt-out.

describe("projectPublicProfile", () => {
  // A full "document" including fields that must never be exposed.
  const fullUser = {
    _id: "65a1f2c3d4e5f6a7b8c9d0e1",
    username: "Mai",
    email: "mai@example.com",
    passwordHash: "$2a$10$abcdefghijklmnopqrstuv",
    profilePublic: true,
    isPro: true,
    selectedSkin: "synthwave",
    selectedTitle: "Bug Slayer",
    unlockedAchievements: ["first_fix", "combo_master"],
    highScore: 42000,
    totalRuns: 17,
    totalBugsFixed: 900,
    longestRunSeconds: 610,
    createdAt: "2026-01-02T00:00:00.000Z",
  };

  it("never exposes email, passwordHash, or internal id", () => {
    const out = projectPublicProfile(fullUser);
    const json = JSON.stringify(out).toLowerCase();
    expect(json).not.toContain("@example.com");
    expect(json).not.toContain("passwordhash");
    expect(json).not.toContain("$2a$");
    expect(json).not.toContain("_id");
    expect(json).not.toContain("d4e5f6a7"); // fragment of the internal id
  });

  it("surfaces the safe display fields", () => {
    const out = projectPublicProfile(fullUser);
    expect(out.username).toBe("Mai");
    expect(out.displayName).toBe("Mai");
    expect(out.isPro).toBe(true);
    expect(out.cosmetics.skin).toBe("synthwave");
    expect(out.cosmetics.title).toBe("Bug Slayer");
    expect(out.stats.highScore).toBe(42000);
    expect(out.achievements).toEqual(["first_fix", "combo_master"]);
    expect(out.memberSince).toBe("2026-01-02T00:00:00.000Z");
  });

  it("prefers displayName when set", () => {
    expect(projectPublicProfile({ username: "mai", displayName: "Mai T." }).displayName).toBe("Mai T.");
  });

  it("is defensive about missing fields", () => {
    const out = projectPublicProfile({ username: "solo" });
    expect(out.stats).toEqual({ highScore: 0, totalRuns: 0, totalBugsFixed: 0, longestRunSeconds: 0 });
    expect(out.achievements).toEqual([]);
    expect(out.memberSince).toBeNull();
    expect(out.cosmetics.skin).toBe("default");
  });
});

describe("isProfilePublic (opt-out)", () => {
  it("treats a missing flag as public", () => {
    expect(isProfilePublic({})).toBe(true);
  });
  it("honors an explicit private flag", () => {
    expect(isProfilePublic({ profilePublic: false })).toBe(false);
  });
  it("is false for a missing user", () => {
    expect(isProfilePublic(null)).toBe(false);
    expect(isProfilePublic(undefined)).toBe(false);
  });
});

describe("username helpers", () => {
  it("normalizes case and whitespace", () => {
    expect(normalizeUsername("  MaI  ")).toBe("mai");
  });
  it("validates length bounds", () => {
    expect(isValidUsernameParam("a")).toBe(false);
    expect(isValidUsernameParam("ab")).toBe(true);
    expect(isValidUsernameParam("x".repeat(25))).toBe(false);
  });
});
