// TASK-DD-SOC-002 Open Graph image inputs.
//
// The OG endpoint draws a run card purely from display values in the query. This
// module is the trust boundary: it accepts only the known display keys, clamps
// the numbers, and never lets an email or any internal id reach the image or its
// URL. It imports nothing from next/og so it stays unit-testable.

export type OgMode = "endless" | "daily" | "tournament" | "challenge";

export interface OgParams {
  name: string; // display name only, <= 24 chars, never email-like
  score: number; // 0 .. 10,000,000
  wave: number; // 0 .. 99 (0 means "hide the wave")
  skin: string; // a known skin id, else "default"
  mode: OgMode;
  cta: string; // short call to action, <= 40 chars
}

const KNOWN_SKINS = new Set(["default", "terminal", "synthwave", "cyberpunk"]);
const KNOWN_MODES = new Set<OgMode>(["endless", "daily", "tournament", "challenge"]);

type Queryish = URLSearchParams | Record<string, string | number | null | undefined>;

// Drop control characters (code point < 32 or DEL) without using a regex literal
// that would contain control bytes in source.
function stripControl(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 32 && code !== 127) out += ch;
  }
  return out;
}

function read(q: Queryish, key: string): string | undefined {
  if (typeof (q as URLSearchParams).get === "function") {
    const v = (q as URLSearchParams).get(key);
    return v == null ? undefined : v;
  }
  const v = (q as Record<string, string | number | null | undefined>)[key];
  return v == null ? undefined : String(v);
}

function clampInt(v: string | undefined, min: number, max: number): number {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function safeName(raw: string | undefined): string {
  if (!raw) return "A player";
  const s = stripControl(String(raw)).trim();
  // Never echo an email-like value into a public image or URL.
  if (s.length === 0 || s.includes("@")) return "A player";
  return s.slice(0, 24);
}

function defaultCta(mode: OgMode): string {
  switch (mode) {
    case "challenge":
      return "Beat my seed";
    case "tournament":
      return "Top the weekly board";
    case "daily":
      return "Beat today's run";
    default:
      return "Play DOM Defender";
  }
}

export function parseOgParams(q: Queryish): OgParams {
  const name = safeName(read(q, "name"));
  const score = clampInt(read(q, "score"), 0, 10_000_000);
  const wave = clampInt(read(q, "wave"), 0, 99);

  const skinRaw = (read(q, "skin") ?? "default").toLowerCase();
  const skin = KNOWN_SKINS.has(skinRaw) ? skinRaw : "default";

  const modeRaw = (read(q, "mode") ?? "endless").toLowerCase() as OgMode;
  const mode: OgMode = KNOWN_MODES.has(modeRaw) ? modeRaw : "endless";

  const ctaRaw = read(q, "cta");
  const cta = ctaRaw
    ? stripControl(ctaRaw).trim().slice(0, 40) || defaultCta(mode)
    : defaultCta(mode);

  return { name, score, wave, skin, mode, cta };
}

// Build the query string for an /api/og link from typed display values. Runs the
// values back through the sanitizer so a caller can never smuggle an email or a
// control character into the URL.
export function buildOgQuery(p: {
  name?: string;
  score?: number;
  wave?: number;
  skin?: string;
  mode?: OgMode;
  cta?: string;
}): string {
  const parsed = parseOgParams({
    name: p.name,
    score: p.score,
    wave: p.wave,
    skin: p.skin,
    mode: p.mode,
    cta: p.cta,
  });
  const usp = new URLSearchParams();
  usp.set("name", parsed.name);
  usp.set("score", String(parsed.score));
  usp.set("wave", String(parsed.wave));
  usp.set("skin", parsed.skin);
  usp.set("mode", parsed.mode);
  usp.set("cta", parsed.cta);
  return usp.toString();
}
