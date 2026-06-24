// Rate-limiting building blocks (NFR-DOM-003) and a trusted client-IP reader
// (NFR-DOM-002 / BACKLOG L1-T6).
//
// Two pieces:
//   - clientIpFromHeaders: resolve the real client IP from platform-verified
//     headers, NOT the spoofable first hop of x-forwarded-for.
//   - createRateLimiter: an in-memory fixed-window limiter for local/dev and
//     single-instance use, and as the reference logic. On serverless (Vercel)
//     in-memory state does not persist across invocations, so production limits
//     must be backed by a shared store - the BYO route's Mongo window
//     (countDocuments over a time window) is the durable reference pattern.

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Resolve the client IP from request headers.
 *
 * x-forwarded-for's leftmost entry is attacker-controlled unless every hop in
 * front of the app is trusted and overwrites it. So we prefer headers that the
 * hosting platform sets and a client cannot forge (Vercel / common proxies),
 * and only fall back to x-forwarded-for when the deploy explicitly opts in via
 * `trustForwardedFor` (set it true only when behind a proxy that sanitizes it).
 */
export function clientIpFromHeaders(
  get: (name: string) => string | null | undefined,
  opts: { trustForwardedFor?: boolean } = {}
): string {
  const vercel = get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0]!.trim();

  const realIp = get("x-real-ip");
  if (realIp) return realIp.trim();

  if (opts.trustForwardedFor) {
    const fwd = get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0]!.trim();
  }
  return "0.0.0.0";
}

/**
 * In-memory fixed-window rate limiter. Returns ok=false once `max` hits occur
 * within `windowMs`. `now` is injectable for tests.
 */
export function createRateLimiter(opts: { windowMs: number; max: number; now?: () => number }) {
  const { windowMs, max } = opts;
  const now = opts.now ?? (() => Date.now());
  const hits = new Map<string, number[]>();

  return {
    check(key: string): RateLimitResult {
      const t = now();
      const recent = (hits.get(key) ?? []).filter((ts) => t - ts < windowMs);
      if (recent.length >= max) {
        const oldest = recent[0]!;
        return { ok: false, remaining: 0, retryAfterMs: Math.max(0, windowMs - (t - oldest)) };
      }
      recent.push(t);
      hits.set(key, recent);
      return { ok: true, remaining: Math.max(0, max - recent.length), retryAfterMs: 0 };
    },
    reset(key?: string) {
      if (key) hits.delete(key);
      else hits.clear();
    },
  };
}
