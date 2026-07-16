import PlayShell from "@/components/PlayShell";
import { decodeChallenge } from "@/lib/game/challenge";

export const dynamic = "force-dynamic";

// searchParams is async in Next 16. A challenge link (?challenge=) carries the
// seed to replay; a ?seed= link is the existing private-seed path; otherwise we
// generate a random seed so every endless run is reproducible and challengeable.
export default async function PlayPage({
  searchParams,
}: {
  searchParams?: Promise<{ seed?: string; challenge?: string }>;
}) {
  const sp = (await searchParams) ?? {};

  let seed: number | undefined;

  const challenge = typeof sp.challenge === "string" ? decodeChallenge(sp.challenge) : null;
  if (challenge) {
    seed = challenge.seed;
  } else {
    const raw = sp.seed;
    if (raw && /^\d+$/.test(raw)) {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0 && n <= 0xffffffff) seed = n >>> 0;
    }
  }

  // Free endless (no seed) stays random so the adaptive director (TASK-DD-AI-001)
  // can vary difficulty per player. Seeded runs (?seed= / ?challenge=) are
  // deterministic and the director stays off, so a challenge remains a fair
  // same-bugs comparison. So `seed` is left undefined for free endless.
  return <PlayShell mode="endless" initialSeed={seed} />;
}
