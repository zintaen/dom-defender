import { describe, it, expect } from "vitest";
import { parseOgParams, buildOgQuery } from "@/lib/og/ogParams";

// FR-DD-SOC-002: the OG endpoint must render only sanitized display values and
// never leak PII into the image or its URL.

describe("parseOgParams", () => {
  it("clamps score and wave into range", () => {
    const p = parseOgParams({ score: "99999999999", wave: "500" });
    expect(p.score).toBe(10_000_000);
    expect(p.wave).toBe(99);
  });

  it("defaults non-numeric score/wave to the floor", () => {
    const p = parseOgParams({ score: "abc", wave: "" });
    expect(p.score).toBe(0);
    expect(p.wave).toBe(0);
  });

  it("falls back to a known skin and mode", () => {
    expect(parseOgParams({ skin: "rainbow" }).skin).toBe("default");
    expect(parseOgParams({ mode: "hacker" }).mode).toBe("endless");
    expect(parseOgParams({ skin: "synthwave", mode: "tournament" })).toMatchObject({
      skin: "synthwave",
      mode: "tournament",
    });
  });

  it("never echoes an email-like name (PII guard)", () => {
    const p = parseOgParams({ name: "attacker@example.com" });
    expect(p.name).not.toContain("@");
    expect(p.name).toBe("A player");
  });

  it("caps the name length", () => {
    const p = parseOgParams({ name: "x".repeat(100) });
    expect(p.name.length).toBeLessThanOrEqual(24);
  });

  it("uses a mode-appropriate default CTA", () => {
    expect(parseOgParams({ mode: "challenge" }).cta).toBe("Beat my seed");
    expect(parseOgParams({ mode: "tournament" }).cta).toBe("Top the weekly board");
  });
});

describe("buildOgQuery", () => {
  it("round-trips clean values through the sanitizer", () => {
    const qs = buildOgQuery({ name: "Mai", score: 1234, wave: 7, skin: "terminal", mode: "challenge" });
    const p = parseOgParams(new URLSearchParams(qs));
    expect(p).toMatchObject({ name: "Mai", score: 1234, wave: 7, skin: "terminal", mode: "challenge" });
  });

  it("strips PII before it can reach the URL", () => {
    const qs = buildOgQuery({ name: "leak@corp.com", score: 10 });
    expect(qs).not.toContain("@");
    expect(qs.toLowerCase()).not.toContain("email");
  });
});
