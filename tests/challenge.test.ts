import { describe, it, expect } from "vitest";
import { encodeChallenge, decodeChallenge, type ChallengePayload } from "@/lib/game/challenge";

// FR-DD-SOC-001: the challenge token must round-trip and must fail closed on
// tampering. The embedded score is display-only; ranking still goes through the
// validated /api/scores path.

const sample: ChallengePayload = { seed: 123456789, score: 4200, name: "stephen", mode: "endless" };

describe("challenge token", () => {
  it("round-trips", () => {
    const decoded = decodeChallenge(encodeChallenge(sample));
    expect(decoded).toEqual(sample);
  });

  it("returns null on garbage or tampered tokens", () => {
    expect(decodeChallenge("")).toBeNull();
    expect(decodeChallenge("not-a-real-token")).toBeNull();
    const t = encodeChallenge(sample);
    expect(decodeChallenge(t.slice(0, -3) + "zzz")).toBeNull();
  });

  it("caps the name length", () => {
    const long = "x".repeat(100);
    const decoded = decodeChallenge(encodeChallenge({ ...sample, name: long }));
    expect(decoded?.name.length).toBeLessThanOrEqual(24);
  });

  it("normalizes the seed to an unsigned int and keeps the mode", () => {
    const d = decodeChallenge(encodeChallenge({ ...sample, seed: 7.9, mode: "daily" }));
    expect(d?.seed).toBe(7);
    expect(d?.mode).toBe("daily");
  });

  it("rejects a payload with a bad mode", () => {
    // hand-craft a token with an invalid mode
    const bad = Buffer.from(JSON.stringify({ s: 1, sc: 1, n: "a", m: "blitz" }), "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(decodeChallenge(bad)).toBeNull();
  });
});
