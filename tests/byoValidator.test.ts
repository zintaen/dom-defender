import { describe, it, expect } from "vitest";
import { validateByoUrl } from "@/lib/game/byoValidator";

// BYO safety surface (NFR-DOM-002). These lock the allow/deny posture so a refactor
// cannot quietly start accepting loopback, private, or non-https targets.

describe("validateByoUrl", () => {
  it("rejects empty input", () => {
    expect(validateByoUrl("").ok).toBe(false);
  });

  it("rejects non-https schemes", () => {
    expect(validateByoUrl("http://example.com").ok).toBe(false);
    expect(validateByoUrl("file:///etc/passwd").ok).toBe(false);
    expect(validateByoUrl("javascript:alert(1)").ok).toBe(false);
  });

  it("accepts a public https URL and keeps the path and query", () => {
    const r = validateByoUrl("https://example.com/path?q=1");
    expect(r.ok).toBe(true);
    expect(r.url).toContain("https://example.com/path");
  });

  it("auto-prepends https for a bare host", () => {
    const r = validateByoUrl("example.com");
    expect(r.ok).toBe(true);
    expect(r.url?.startsWith("https://")).toBe(true);
  });

  it("rejects private and loopback hosts", () => {
    const hosts = [
      "https://localhost",
      "https://127.0.0.1",
      "https://10.0.0.1",
      "https://192.168.1.1",
      "https://172.16.0.1",
      "https://169.254.1.1",
    ];
    for (const h of hosts) {
      expect(validateByoUrl(h).ok, h).toBe(false);
    }
  });

  it("rejects deny-listed hosts", () => {
    expect(validateByoUrl("https://facebook.com").ok).toBe(false);
    expect(validateByoUrl("https://x.com").ok).toBe(false);
  });

  it("strips embedded credentials", () => {
    const r = validateByoUrl("https://user:pass@example.com/");
    expect(r.ok).toBe(true);
    expect(r.url).not.toContain("user");
    expect(r.url).not.toContain("pass");
  });
});
