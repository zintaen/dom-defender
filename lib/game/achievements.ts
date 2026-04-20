// Achievements unlocked at end-of-run based on a RunSummary submitted to the API.

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string;
  rewardCoins: number;
  unlocksSkin?: string;
  predicate: (s: RunSummary) => boolean;
}

export interface RunSummary {
  score: number;
  durationSec: number;
  wave: number;
  bugsFixed: number;
  bossesDefeated: number;
  maxCombo: number;
  powerUpsUsed: number;
  skinUsed: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_blood",
    name: "First Patch",
    desc: "Fix your first bug.",
    icon: "🩹",
    rewardCoins: 10,
    predicate: (s) => s.bugsFixed >= 1,
  },
  {
    id: "survive_30",
    name: "Stayed Up Past Bedtime",
    desc: "Survive 30 seconds.",
    icon: "🌙",
    rewardCoins: 25,
    predicate: (s) => s.durationSec >= 30,
  },
  {
    id: "survive_60",
    name: "Marathon Maintainer",
    desc: "Survive 60 seconds.",
    icon: "⏱",
    rewardCoins: 50,
    unlocksSkin: "terminal",
    predicate: (s) => s.durationSec >= 60,
  },
  {
    id: "survive_120",
    name: "Iron Webmaster",
    desc: "Survive 2 minutes.",
    icon: "🛡",
    rewardCoins: 150,
    predicate: (s) => s.durationSec >= 120,
  },
  {
    id: "wave_3",
    name: "Wave Rider",
    desc: "Reach wave 3.",
    icon: "🌊",
    rewardCoins: 30,
    predicate: (s) => s.wave >= 3,
  },
  {
    id: "wave_6",
    name: "Outage Outlaw",
    desc: "Reach wave 6.",
    icon: "⚡",
    rewardCoins: 100,
    unlocksSkin: "synthwave",
    predicate: (s) => s.wave >= 6,
  },
  {
    id: "combo_5",
    name: "Combo Engineer",
    desc: "Hit a 5x combo.",
    icon: "🔥",
    rewardCoins: 25,
    predicate: (s) => s.maxCombo >= 5,
  },
  {
    id: "combo_10",
    name: "Refactor Frenzy",
    desc: "Hit a 10x combo.",
    icon: "💫",
    rewardCoins: 75,
    predicate: (s) => s.maxCombo >= 10,
  },
  {
    id: "first_boss",
    name: "Bug Buster",
    desc: "Defeat your first boss bug.",
    icon: "👾",
    rewardCoins: 100,
    unlocksSkin: "cyberpunk",
    predicate: (s) => s.bossesDefeated >= 1,
  },
  {
    id: "boss_3",
    name: "Triple Threat",
    desc: "Defeat 3 boss bugs in one run.",
    icon: "🏆",
    rewardCoins: 250,
    predicate: (s) => s.bossesDefeated >= 3,
  },
  {
    id: "score_5k",
    name: "Five-Digit Dev",
    desc: "Score 5,000 in a single run.",
    icon: "💎",
    rewardCoins: 50,
    predicate: (s) => s.score >= 5000,
  },
  {
    id: "score_15k",
    name: "Production Ready",
    desc: "Score 15,000 in a single run.",
    icon: "🚀",
    rewardCoins: 200,
    predicate: (s) => s.score >= 15000,
  },
  {
    id: "fix_100",
    name: "Centurion",
    desc: "Fix 100 bugs in a single run.",
    icon: "💯",
    rewardCoins: 100,
    predicate: (s) => s.bugsFixed >= 100,
  },
  {
    id: "no_powerups",
    name: "Bare Hands",
    desc: "Survive 60 seconds without using any power-ups.",
    icon: "👊",
    rewardCoins: 75,
    predicate: (s) => s.durationSec >= 60 && s.powerUpsUsed === 0,
  },
];

export function evaluateAchievements(s: RunSummary, alreadyUnlocked: string[]): Achievement[] {
  const set = new Set(alreadyUnlocked);
  return ACHIEVEMENTS.filter((a) => !set.has(a.id) && a.predicate(s));
}

export function totalCoinsForAchievements(ids: string[]): number {
  return ACHIEVEMENTS.filter((a) => ids.includes(a.id)).reduce((sum, a) => sum + a.rewardCoins, 0);
}
