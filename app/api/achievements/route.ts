import { NextResponse } from "next/server";
import { ACHIEVEMENTS } from "@/lib/game/achievements";

export async function GET() {
  return NextResponse.json({
    achievements: ACHIEVEMENTS.map((a) => ({
      id: a.id,
      name: a.name,
      desc: a.desc,
      icon: a.icon,
      rewardCoins: a.rewardCoins,
      unlocksSkin: a.unlocksSkin ?? null,
    })),
  });
}
