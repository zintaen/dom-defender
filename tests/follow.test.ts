import { describe, it, expect } from "vitest";
import { canFollow, sortFeedNewestFirst, dedupeIds } from "@/lib/social/follow";

// TASK-DD-COMM-002: follow-edge invariants and feed ordering.

describe("canFollow", () => {
  it("allows following a different user", () => {
    expect(canFollow("a", "b").ok).toBe(true);
  });
  it("rejects self-follow", () => {
    const r = canFollow("a", "a");
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/yourself/i);
  });
  it("rejects missing ids", () => {
    expect(canFollow("", "b").ok).toBe(false);
    expect(canFollow("a", "  ").ok).toBe(false);
  });
});

describe("sortFeedNewestFirst", () => {
  const rows = [
    { username: "old", score: 1, wave: 1, mode: "endless", createdAt: "2026-06-01T00:00:00Z" },
    { username: "new", score: 2, wave: 2, mode: "daily", createdAt: "2026-06-20T00:00:00Z" },
    { username: "mid", score: 3, wave: 3, mode: "endless", createdAt: "2026-06-10T00:00:00Z" },
  ];

  it("orders newest first", () => {
    expect(sortFeedNewestFirst(rows).map((r) => r.username)).toEqual(["new", "mid", "old"]);
  });
  it("caps to the limit", () => {
    expect(sortFeedNewestFirst(rows, 2)).toHaveLength(2);
  });
  it("emits ISO timestamps and keeps the safe fields", () => {
    const item = sortFeedNewestFirst(rows, 1)[0];
    expect(item).toEqual({
      username: "new",
      score: 2,
      wave: 2,
      mode: "daily",
      createdAt: "2026-06-20T00:00:00.000Z",
    });
  });
});

describe("dedupeIds", () => {
  it("removes duplicates and empties", () => {
    expect(dedupeIds(["a", "a", "", "  ", "b", null, undefined])).toEqual(["a", "b"]);
  });
});
