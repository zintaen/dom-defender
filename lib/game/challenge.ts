// Friend challenge links (TASK-DD-SOC-001).
//
// A challenge token encodes the run's seed, the challenger's score, their name,
// and the mode, so a friend can replay the identical seeded bug pattern and see
// the target to beat. The embedded score is DISPLAY ONLY - any score that
// affects the real leaderboard still goes through /api/scores and is validated
// server-side (NFR-DOM-001), so a forged token cannot inject a fake rank.
//
// Isomorphic: the codec runs in the browser (ShareCard) and on the server
// (the challenge page), so it avoids Node-only or browser-only APIs at the edges.

export interface ChallengePayload {
  seed: number;
  score: number;
  name: string;
  mode: "endless" | "daily";
}

const NAME_MAX = 24;

function b64urlEncode(input: string): string {
  const b64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(input, "utf8").toString("base64")
      : btoa(unescape(encodeURIComponent(input)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(input: string): string {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  return typeof Buffer !== "undefined"
    ? Buffer.from(b64, "base64").toString("utf8")
    : decodeURIComponent(escape(atob(b64)));
}

export function encodeChallenge(p: ChallengePayload): string {
  const compact = {
    s: Math.floor(Number(p.seed) || 0) >>> 0,
    sc: Math.max(0, Math.floor(Number(p.score) || 0)),
    n: String(p.name ?? "").slice(0, NAME_MAX),
    m: p.mode === "daily" ? "daily" : "endless",
  };
  return b64urlEncode(JSON.stringify(compact));
}

export function decodeChallenge(token: string): ChallengePayload | null {
  if (typeof token !== "string" || token.length === 0 || token.length > 512) return null;
  let obj: any;
  try {
    obj = JSON.parse(b64urlDecode(token));
  } catch {
    return null;
  }
  if (!obj || typeof obj !== "object") return null;
  const seed = Number(obj.s);
  const score = Number(obj.sc);
  const name = obj.n;
  const mode = obj.m;
  if (!Number.isFinite(seed) || !Number.isFinite(score) || score < 0) return null;
  if (typeof name !== "string") return null;
  if (mode !== "endless" && mode !== "daily") return null;
  return {
    seed: Math.floor(seed) >>> 0,
    score: Math.floor(score),
    name: name.slice(0, NAME_MAX),
    mode,
  };
}
