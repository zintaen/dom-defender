import { NextResponse } from "next/server";
import { todaysDailyKey, seedFromDateKey } from "@/lib/game/dailySeed";

export const dynamic = "force-dynamic";

export async function GET() {
  const key = todaysDailyKey();
  const seed = seedFromDateKey(key);
  return NextResponse.json({ dailyKey: key, seed });
}
