// Skin = a visual theme for the landing page + bugs + cursors. All cosmetic.

export interface Skin {
  id: string;
  name: string;
  tagline: string;
  unlockMethod: "default" | "achievement" | "purchase";
  unlockHint: string;            // human-readable
  pageBgClass: string;           // tailwind classes for the landing page background
  textClass: string;             // primary text color
  accent: string;                // hex
  accent2: string;               // hex
  surface: string;               // glass/card bg color (hex w/ alpha)
  brandName: string;             // shown as the fake company in the game
  brandTagline: string;
  bugColors: { drift: string; comic: string; invert: string; chromatic: string };
}

export const SKINS: Skin[] = [
  {
    id: "default",
    name: "Nebula",
    tagline: "The default modern SaaS look.",
    unlockMethod: "default",
    unlockHint: "Available from the start.",
    pageBgClass: "bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.30),transparent_40%),radial-gradient(circle_at_80%_60%,rgba(6,182,212,0.25),transparent_40%),linear-gradient(180deg,#0b0f1a_0%,#111827_100%)]",
    textClass: "text-slate-200",
    accent: "#7c3aed",
    accent2: "#06b6d4",
    surface: "rgba(255,255,255,0.04)",
    brandName: "Nebula.io",
    brandTagline: "The internet runs on beautiful websites.",
    bugColors: { drift: "#fde047", comic: "#f472b6", invert: "#a78bfa", chromatic: "#06b6d4" },
  },
  {
    id: "terminal",
    name: "Terminal Green",
    tagline: "1980s mainframe energy.",
    unlockMethod: "achievement",
    unlockHint: "Unlock by surviving 60 seconds.",
    pageBgClass: "bg-[linear-gradient(180deg,#000_0%,#021b08_100%)]",
    textClass: "text-emerald-300",
    accent: "#22c55e",
    accent2: "#86efac",
    surface: "rgba(34,197,94,0.05)",
    brandName: "BBS-NET 2400",
    brandTagline: "Welcome to the network. Press any key to continue.",
    bugColors: { drift: "#86efac", comic: "#bbf7d0", invert: "#16a34a", chromatic: "#4ade80" },
  },
  {
    id: "synthwave",
    name: "Synthwave",
    tagline: "Neon, palm trees, infinite grid.",
    unlockMethod: "achievement",
    unlockHint: "Unlock by reaching wave 6.",
    pageBgClass: "bg-[linear-gradient(180deg,#1a0033_0%,#3d0066_50%,#ff006e_100%)]",
    textClass: "text-pink-100",
    accent: "#ff006e",
    accent2: "#3a86ff",
    surface: "rgba(255,0,110,0.08)",
    brandName: "VOID//RUNNER",
    brandTagline: "The grid is alive. Don't let it crash.",
    bugColors: { drift: "#ffd60a", comic: "#ff006e", invert: "#3a86ff", chromatic: "#fb5607" },
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    tagline: "Yellow / black, ultra-warning palette.",
    unlockMethod: "achievement",
    unlockHint: "Unlock by defeating your first boss bug.",
    pageBgClass: "bg-[linear-gradient(135deg,#0a0a0a_0%,#1a1a00_50%,#000_100%)]",
    textClass: "text-yellow-200",
    accent: "#fcee0a",
    accent2: "#ff003c",
    surface: "rgba(252,238,10,0.05)",
    brandName: "MEGACORP-7",
    brandTagline: "Trust the system. The system is you.",
    bugColors: { drift: "#fcee0a", comic: "#ff003c", invert: "#00ffe1", chromatic: "#ff8c00" },
  },
];

export function getSkin(id: string): Skin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}
