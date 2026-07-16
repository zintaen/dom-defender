import { ImageResponse } from "next/og";
import { parseOgParams } from "@/lib/og/ogParams";
import { runCard } from "@/lib/og/runCard";

// TASK-DD-SOC-002: server-rendered 1200x630 run card for link unfurls. Values come
// only from the query and are sanitized by parseOgParams (no PII reaches here).
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const params = parseOgParams(new URL(req.url).searchParams);
  return new ImageResponse(runCard(params), { width: 1200, height: 630 });
}
