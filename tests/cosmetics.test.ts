import { describe, it, expect } from "vitest";
import {
  getCosmetic,
  isCoinPurchasable,
  isUsdPurchasable,
  hasPrerequisites,
} from "@/lib/game/cosmetics";

// The shop economy is server-authoritative. These pin the purchase-eligibility rules
// the /api/shop/purchase route depends on.

describe("cosmetics catalogue", () => {
  it("looks up a known cosmetic and misses cleanly", () => {
    expect(getCosmetic("trail_sparkle")?.name).toBe("Sparkle Trail");
    expect(getCosmetic("nope")).toBeUndefined();
  });

  it("coin-purchasable means a coin price and not pro-only", () => {
    expect(isCoinPurchasable(getCosmetic("trail_sparkle")!)).toBe(true);
    expect(isCoinPurchasable(getCosmetic("trail_ghost")!)).toBe(false); // proOnly
  });

  it("usd-purchasable means a usd price is set", () => {
    expect(isUsdPurchasable(getCosmetic("trail_ghost")!)).toBe(true);
    expect(isUsdPurchasable(getCosmetic("trail_sparkle")!)).toBe(false);
  });

  it("prerequisites pass when none, gate when unmet, clear when owned", () => {
    expect(hasPrerequisites(getCosmetic("trail_sparkle")!, [])).toBe(true);
    const gated = { ...getCosmetic("trail_sparkle")!, requires: ["sfx_arcade"] };
    expect(hasPrerequisites(gated, [])).toBe(false);
    expect(hasPrerequisites(gated, ["sfx_arcade"])).toBe(true);
  });
});
