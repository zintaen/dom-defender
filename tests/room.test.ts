import { describe, it, expect } from "vitest";
import { makeRoomCode, isValidRoomCode, roomSeed, rankMembers } from "@/lib/game/room";

// TASK-DD-EDU-001 room logic: shareable code, deterministic seed, fair ranking.

describe("room code", () => {
  it("generates a valid code of the requested length", () => {
    const code = makeRoomCode(6);
    expect(code).toHaveLength(6);
    expect(isValidRoomCode(code)).toBe(true);
  });

  it("rejects malformed codes", () => {
    expect(isValidRoomCode("ab")).toBe(false); // too short + lowercase
    expect(isValidRoomCode("abcd")).toBe(false); // lowercase
    expect(isValidRoomCode("AB!@")).toBe(false); // symbols
    expect(isValidRoomCode("ABCD")).toBe(true);
  });
});

describe("roomSeed", () => {
  it("is deterministic per code and case-insensitive", () => {
    expect(roomSeed("ABC234")).toBe(roomSeed("ABC234"));
    expect(roomSeed("abc234")).toBe(roomSeed("ABC234"));
  });

  it("differs across codes and is an unsigned 32-bit int", () => {
    expect(roomSeed("ABC234")).not.toBe(roomSeed("XYZ789"));
    const s = roomSeed("ABC234");
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(0xffffffff);
  });
});

describe("rankMembers", () => {
  it("ranks by score descending", () => {
    const ranked = rankMembers([
      { userId: "a", username: "amy", score: 100 },
      { userId: "b", username: "bob", score: 300 },
      { userId: "c", username: "cleo", score: 200 },
    ]);
    expect(ranked.map((r) => r.username)).toEqual(["bob", "cleo", "amy"]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("uses standard competition ranking for ties (1,2,2,4)", () => {
    const ranked = rankMembers([
      { userId: "a", username: "amy", score: 500 },
      { userId: "b", username: "bob", score: 300 },
      { userId: "c", username: "cleo", score: 300 },
      { userId: "d", username: "dan", score: 100 },
    ]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 2, 4]);
  });
});
