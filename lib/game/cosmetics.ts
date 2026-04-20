// Cosmetics — a catalogue of non-skin visual flourishes the player can unlock
// or buy with coins. Skins live in `lib/game/skins.ts` and are granted via
// achievements; cosmetics here are purchased with coins or (if PRO_BILLING_ENABLED)
// with real money via Stripe.
//
// Design goals:
// - Cosmetics are additive and reversible. Nothing here touches gameplay balance.
// - The catalogue is static/hardcoded for now — no DB table needed until SKUs
//   start changing per-user. We keep purchase records on the User doc.
// - Stripe is behind a feature flag so we can ship the data layer and /shop UI
//   without having to set up a real billing account yet.

export type CosmeticCategory = "trail" | "title" | "badge" | "sfx_pack";

export interface Cosmetic {
  id: string;                // globally unique, e.g. "trail_sparkle"
  name: string;
  description: string;
  category: CosmeticCategory;
  icon: string;              // single emoji used in the shop grid

  // Pricing. At least one of the three is present.
  coinPrice?: number;        // payable with in-game coins
  usdPrice?: number;         // payable with Stripe (gated by PRO_BILLING_ENABLED)
  proOnly?: boolean;         // only shown/purchasable for Pro users

  // Opaque config payload — each category interprets this differently.
  // Trails consume `trail.color`, titles consume `title.text`, etc.
  config?: Record<string, any>;

  // Optional: this cosmetic requires these cosmetics to be owned first,
  // e.g. a badge that unlocks after the whole SFX pack is owned.
  requires?: string[];
}

// Minimal starter catalogue. Intentionally small — we can expand later without
// breaking the shape.
export const COSMETICS: Cosmetic[] = [
  // --- Cursor trails ---
  {
    id: "trail_sparkle",
    name: "Sparkle Trail",
    description: "Glittery particles behind your cursor. Mostly harmless.",
    category: "trail",
    icon: "✨",
    coinPrice: 200,
    config: { color: "#fde047", intensity: 0.6 },
  },
  {
    id: "trail_comet",
    name: "Comet Trail",
    description: "A long neon-pink streak. Leaves a mark wherever you fix.",
    category: "trail",
    icon: "☄️",
    coinPrice: 500,
    config: { color: "#ec4899", intensity: 0.9 },
  },
  {
    id: "trail_ghost",
    name: "Ghost Trail",
    description: "A ghostly afterimage of every cursor position.",
    category: "trail",
    icon: "👻",
    coinPrice: 1500,
    proOnly: true,
    usdPrice: 2.99,
    config: { color: "#a78bfa", intensity: 1.0 },
  },

  // --- Titles ---
  {
    id: "title_nightowl",
    name: "Night Owl",
    description: "A title shown on your leaderboard rows.",
    category: "title",
    icon: "🦉",
    coinPrice: 300,
    config: { text: "Night Owl" },
  },
  {
    id: "title_refactor_gremlin",
    name: "Refactor Gremlin",
    description: "For the ones who can't leave a codebase alone.",
    category: "title",
    icon: "🧌",
    coinPrice: 600,
    config: { text: "Refactor Gremlin" },
  },
  {
    id: "title_patron",
    name: "Patron of the Pixel",
    description: "Pro-only vanity title. Flex responsibly.",
    category: "title",
    icon: "🎨",
    proOnly: true,
    usdPrice: 4.99,
    config: { text: "Patron of the Pixel" },
  },

  // --- Profile badges ---
  {
    id: "badge_beta",
    name: "Beta Tester Badge",
    description: "For players who showed up during the early access window.",
    category: "badge",
    icon: "🧪",
    coinPrice: 100,
  },
  {
    id: "badge_contributor",
    name: "Contributor Badge",
    description: "Donors only — lives on Pro.",
    category: "badge",
    icon: "💖",
    proOnly: true,
    usdPrice: 9.99,
  },

  // --- SFX packs ---
  {
    id: "sfx_arcade",
    name: "Arcade SFX Pack",
    description: "Replaces fix/boss sound effects with 8-bit arcade blips.",
    category: "sfx_pack",
    icon: "🕹️",
    coinPrice: 750,
    config: { variant: "arcade" },
  },
  {
    id: "sfx_lofi",
    name: "Lofi SFX Pack",
    description: "A chill, mellow sound set. Great for long sessions.",
    category: "sfx_pack",
    icon: "🎧",
    coinPrice: 1000,
    config: { variant: "lofi" },
  },
];

export function getCosmetic(id: string): Cosmetic | undefined {
  return COSMETICS.find((c) => c.id === id);
}

export function cosmeticsByCategory(cat: CosmeticCategory): Cosmetic[] {
  return COSMETICS.filter((c) => c.category === cat);
}

// A purchase is payable with coins when coinPrice is set and the item is not
// proOnly. Pro-only items must be routed through billing (feature-flagged).
export function isCoinPurchasable(c: Cosmetic): boolean {
  return typeof c.coinPrice === "number" && c.coinPrice > 0 && !c.proOnly;
}

export function isUsdPurchasable(c: Cosmetic): boolean {
  return typeof c.usdPrice === "number" && c.usdPrice > 0;
}

// Helper for the shop UI to know whether prerequisites are met.
export function hasPrerequisites(c: Cosmetic, ownedIds: string[]): boolean {
  if (!c.requires || c.requires.length === 0) return true;
  const owned = new Set(ownedIds);
  return c.requires.every((r) => owned.has(r));
}
