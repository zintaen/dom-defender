import { describe, it, expect } from "vitest";
import {
  evaluateAchievements,
  totalCoinsForAchievements,
  RunSummary,
} from "@/lib/game/achievements";

// The achievement engine drives coin and skin awards (server-side in /api/scores).
// These pin the award logic so it cannot drift when new achievements are added.

const base: RunSummary = {
  score: 0,
  durationSec: 0,
  wave: 1,
  bugsFixed: 0,
  bossesDefeated: 0,
  maxCombo: 0,
  powerUpsUsed: 0,
  skinUsed: "default",
};

describe("evaluateAchievements", () => {
  it("unlocks first_blood when a bug is fixed", () => {
    const got = evaluateAchievements({ ...base, bugsFixed: 1 }, []);
    expect(got.map((a) => a.id)).toContain("first_blood");
  });

  it("does not re-award an already-unlocked achievement", () => {
    const got = evaluateAchievements({ ...base, bugsFixed: 1 }, ["first_blood"]);
    expect(got.map((a) => a.id)).not.toContain("first_blood");
  });

  it("unlocks skins via the survival and wave milestones", () => {
    const got = evaluateAchievements({ ...base, durationSec: 65, wave: 6 }, []);
    const skins = got.filter((a) => a.unlocksSkin).map((a) => a.unlocksSkin);
    expect(skins).toContain("terminal"); // survive_60
    expect(skins).toContain("synthwave"); // wave_6
  });

  it("honors the no-powerups condition", () => {
    const withPowerUps = evaluateAchievements(
      { ...base, durationSec: 65, powerUpsUsed: 2 },
      []
    );
    expect(withPowerUps.map((a) => a.id)).not.toContain("no_powerups");

    const without = evaluateAchievements(
      { ...base, durationSec: 65, powerUpsUsed: 0 },
      []
    );
    expect(without.map((a) => a.id)).toContain("no_powerups");
  });
});

describe("totalCoinsForAchievements", () => {
  it("sums reward coins for the given ids", () => {
    expect(totalCoinsForAchievements(["first_blood", "survive_30"])).toBe(35);
  });

  it("ignores unknown ids", () => {
    expect(totalCoinsForAchievements(["does_not_exist"])).toBe(0);
  });
});
