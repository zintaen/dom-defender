// Power-ups granted at run start. Each has a cooldown and a hotkey.

export interface PowerUpDef {
  id: string;
  key: string;        // hotkey
  name: string;
  desc: string;
  icon: string;
  cooldownSec: number;
  durationSec?: number; // for buffs that last
}

export const POWER_UPS: PowerUpDef[] = [
  {
    id: "freeze",
    key: "Q",
    name: "Time Freeze",
    desc: "Freeze new bug spawns for 4s.",
    icon: "❄",
    cooldownSec: 25,
    durationSec: 4,
  },
  {
    id: "autofix",
    key: "W",
    name: "Auto-Fix",
    desc: "Instantly clears all CSS bugs on screen.",
    icon: "✨",
    cooldownSec: 35,
  },
  {
    id: "magnet",
    key: "E",
    name: "Bug Magnet",
    desc: "All console errors and memory leaks float toward your cursor for 5s.",
    icon: "🧲",
    cooldownSec: 30,
    durationSec: 5,
  },
  {
    id: "shield",
    key: "R",
    name: "Server Shield",
    desc: "Crash meter pauses for 6s.",
    icon: "🛡",
    cooldownSec: 40,
    durationSec: 6,
  },
];

export function getPowerUp(id: string) {
  return POWER_UPS.find((p) => p.id === id);
}
