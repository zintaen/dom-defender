import { describe, it, expect } from "vitest";
import { explainBug, allConcepts, CONCEPT_MAP } from "@/lib/game/conceptMap";

// TASK-DD-EDU-001 teaching layer.

describe("conceptMap", () => {
  it("explains each known bug family with a real web concept", () => {
    for (const key of ["drift", "error", "leak", "boss"]) {
      const c = explainBug(key);
      expect(c.bugType).toBe(key);
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.concept.length).toBeGreaterThan(10);
    }
  });

  it("falls back gracefully for an unknown bug type", () => {
    const c = explainBug("mystery");
    expect(c.bugType).toBe("mystery");
    expect(c.concept.length).toBeGreaterThan(0);
  });

  it("allConcepts returns the full map", () => {
    expect(allConcepts().length).toBe(Object.keys(CONCEPT_MAP).length);
  });
});
