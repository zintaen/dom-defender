import PlayShell from "@/components/PlayShell";
import { todaysDailyKey, seedFromDateKey } from "@/lib/game/dailySeed";

export const dynamic = "force-dynamic";

export default function DailyPage() {
  const dailyKey = todaysDailyKey();
  const seed = seedFromDateKey(dailyKey);
  return <PlayShell mode="daily" initialSeed={seed} dailyKey={dailyKey} />;
}
