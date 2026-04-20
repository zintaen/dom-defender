import PlayShell from "@/components/PlayShell";

export const dynamic = "force-dynamic";

export default function PlayPage({
  searchParams,
}: {
  searchParams?: { seed?: string };
}) {
  const raw = searchParams?.seed;
  let seed: number | undefined;
  if (raw && /^\d+$/.test(raw)) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0 && n <= 0xffffffff) {
      seed = n >>> 0;
    }
  }
  return <PlayShell mode="endless" initialSeed={seed} />;
}
