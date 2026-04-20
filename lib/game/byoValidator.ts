// URL validation + allow/deny lists for BYO-Website (bring your own) mode.
//
// Security posture:
// - The BYO iframe uses the `sandbox` attribute plus an `allow`-less policy,
//   so the embedded page can't read our cookies, can't navigate the top
//   frame, and can't trigger downloads. But the safest place to enforce
//   *what* URLs we'll even try to load is on the client *before* we hand
//   the URL to the iframe.
// - We reject anything that isn't https (no http, no file://, no javascript:).
// - We reject private/loopback IPs to avoid users pointing the game at their
//   own LAN router admin panel by mistake (a surprisingly common footgun).
// - Deny list is applied before allow list — explicit denies always win.
//
// This file is *client- and server-safe*. Do not add server-only imports.

export interface BYOValidationResult {
  ok: boolean;
  url?: string;     // normalized URL if ok
  reason?: string;  // human-readable error if not ok
}

// Known hosts we never want to embed — typically sites that would produce
// confusing UX (hosting platforms, redirect services, auth endpoints).
const DENY_HOSTS: RegExp[] = [
  /(^|\.)(localhost|local)$/i,
  /(^|\.)internal$/i,
  /\b(accounts|login|auth)\.google\.com$/i,  // auth prompts misfire inside iframes
  /(^|\.)facebook\.com$/i,                   // known to blow up in iframes
  /(^|\.)x\.com$/i,
  /(^|\.)twitter\.com$/i,
];

// If this is set and non-empty, only URLs whose hostnames match one of these
// will be allowed. We keep it empty by default (permissive) — admins can tune
// via NEXT_PUBLIC_BYO_ALLOW_LIST at build time. Comma-separated substrings.
function allowList(): string[] {
  const raw = (process.env.NEXT_PUBLIC_BYO_ALLOW_LIST ?? "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function isPrivateOrLoopbackHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "0.0.0.0") return true;
  // IPv4 in private ranges: 10/8, 172.16/12, 192.168/16, 169.254/16 (link-local).
  const ipv4 = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 127) return true;
    return false;
  }
  // Bare ".lan", ".local", ".internal", ".home" TLDs are for LANs.
  if (/\.(lan|local|internal|home|arpa)$/i.test(h)) return true;
  return false;
}

export function validateByoUrl(input: string): BYOValidationResult {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return { ok: false, reason: "Paste a URL to play on." };
  // Auto-prepend https:// if the user omitted a scheme but the host looks valid.
  const withScheme = /^[a-z][a-z0-9+\-.]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false, reason: "That doesn't look like a valid URL." };
  }

  if (url.protocol !== "https:") {
    return { ok: false, reason: "Only https:// URLs are allowed." };
  }
  if (!url.hostname) {
    return { ok: false, reason: "URL is missing a hostname." };
  }
  if (isPrivateOrLoopbackHost(url.hostname)) {
    return {
      ok: false,
      reason: "Private/loopback hosts aren't allowed (for your own safety).",
    };
  }
  for (const re of DENY_HOSTS) {
    if (re.test(url.hostname)) {
      return { ok: false, reason: `${url.hostname} can't be embedded — try a different site.` };
    }
  }

  const allow = allowList();
  if (allow.length > 0) {
    const host = url.hostname.toLowerCase();
    const matched = allow.some((a) => host === a || host.endsWith(`.${a}`));
    if (!matched) {
      return { ok: false, reason: "That site isn't on the allow list." };
    }
  }

  // Strip credentials / hash / trailing whitespace. Keep path + query.
  url.username = "";
  url.password = "";
  url.hash = "";

  return { ok: true, url: url.toString() };
}

// In-memory per-tab "rate limit" to stop accidental reload spamming. Real
// server-side rate limiting requires Redis/a KV store; this is a placeholder.
const lastAttemptKey = "dd.byo.lastAttempt.v1";
export function tryRecordByoAttempt(): { ok: boolean; retryInMs?: number } {
  if (typeof window === "undefined") return { ok: true };
  try {
    const now = Date.now();
    const last = Number(window.sessionStorage.getItem(lastAttemptKey) ?? 0);
    // Hard cap: 1 attempt per 3 seconds per tab.
    const MIN_INTERVAL = 3000;
    if (last && now - last < MIN_INTERVAL) {
      return { ok: false, retryInMs: MIN_INTERVAL - (now - last) };
    }
    window.sessionStorage.setItem(lastAttemptKey, String(now));
    return { ok: true };
  } catch {
    return { ok: true };
  }
}
