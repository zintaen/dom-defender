import { describe, it, expect } from "vitest";
import { clientIpFromHeaders, createRateLimiter } from "@/lib/rateLimit";

// NFR-DOM-002 (trusted IP) and NFR-DOM-003 (rate limiting).

describe("clientIpFromHeaders", () => {
  const h = (m: Record<string, string>) => (name: string) => m[name] ?? null;

  it("prefers the platform-verified header", () => {
    expect(
      clientIpFromHeaders(h({ "x-vercel-forwarded-for": "9.9.9.9", "x-forwarded-for": "1.1.1.1" }))
    ).toBe("9.9.9.9");
  });

  it("uses x-real-ip when no platform header is present", () => {
    expect(clientIpFromHeaders(h({ "x-real-ip": "8.8.8.8", "x-forwarded-for": "1.1.1.1" }))).toBe("8.8.8.8");
  });

  it("ignores spoofable x-forwarded-for by default", () => {
    expect(clientIpFromHeaders(h({ "x-forwarded-for": "1.1.1.1" }))).toBe("0.0.0.0");
  });

  it("uses x-forwarded-for only when the deploy opts in", () => {
    expect(
      clientIpFromHeaders(h({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" }), { trustForwardedFor: true })
    ).toBe("1.1.1.1");
  });
});

describe("createRateLimiter", () => {
  it("allows up to max then denies within the window", () => {
    let t = 1000;
    const rl = createRateLimiter({ windowMs: 1000, max: 3, now: () => t });
    expect(rl.check("a").ok).toBe(true);
    expect(rl.check("a").ok).toBe(true);
    expect(rl.check("a").ok).toBe(true);
    const denied = rl.check("a");
    expect(denied.ok).toBe(false);
    expect(denied.retryAfterMs).toBeGreaterThan(0);
  });

  it("recovers after the window passes", () => {
    let t = 0;
    const rl = createRateLimiter({ windowMs: 1000, max: 1, now: () => t });
    expect(rl.check("a").ok).toBe(true);
    expect(rl.check("a").ok).toBe(false);
    t = 1001;
    expect(rl.check("a").ok).toBe(true);
  });

  it("tracks keys independently and supports reset", () => {
    let t = 0;
    const rl = createRateLimiter({ windowMs: 1000, max: 1, now: () => t });
    expect(rl.check("a").ok).toBe(true);
    expect(rl.check("b").ok).toBe(true); // different key, own budget
    rl.reset("a");
    expect(rl.check("a").ok).toBe(true); // reset cleared a
  });
});
