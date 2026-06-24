import { describe, it, expect, beforeEach } from "vitest";
import { reportError } from "@/lib/observability";

// L1-T13: error reporting must be a safe no-op when unconfigured and must never
// throw into the request path.

describe("reportError", () => {
  beforeEach(() => {
    delete process.env.ERROR_WEBHOOK_URL;
  });

  it("never throws and resolves when no webhook is configured", async () => {
    await expect(reportError(new Error("boom"), { route: "POST /api/test" })).resolves.toBeUndefined();
  });

  it("handles non-Error values without throwing", async () => {
    await expect(reportError("a string error")).resolves.toBeUndefined();
    await expect(reportError(undefined)).resolves.toBeUndefined();
  });
});
