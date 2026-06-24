// Team-room logic for DOM Defender for teams (FR-DD-EDU-001).
//
// Pure helpers: a shareable room code, a deterministic seed derived from that code
// (so every member plays the identical bug sequence, like the daily), and member
// ranking for the live team board. Reuses the FNV seed hash from dailySeed.

import { seedFromDateKey } from "./dailySeed";

// Unambiguous uppercase alphabet (no I, L, O, 0, 1) for human-readable codes.
const CODE_ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function makeRoomCode(len = 6): string {
  let s = "";
  for (let i = 0; i < len; i++) {
    s += CODE_ALPHA[Math.floor(Math.random() * CODE_ALPHA.length)];
  }
  return s;
}

export function isValidRoomCode(code: string): boolean {
  return typeof code === "string" && /^[A-Z2-9]{4,12}$/.test(code);
}

// Deterministic 32-bit seed from the room code, so all members get the same run.
export function roomSeed(code: string): number {
  return seedFromDateKey(`room:${String(code).toUpperCase()}`);
}

export interface RoomMemberScore {
  userId: string;
  username: string;
  score: number;
}

export interface RankedMember extends RoomMemberScore {
  rank: number;
}

// Standard competition ranking (1, 2, 2, 4) by score desc; ties broken for
// display order by username but sharing the same rank.
export function rankMembers(members: RoomMemberScore[]): RankedMember[] {
  const sorted = [...members].sort(
    (a, b) => b.score - a.score || a.username.localeCompare(b.username)
  );
  let lastScore: number | null = null;
  let lastRank = 0;
  return sorted.map((m, i) => {
    if (lastScore !== null && m.score === lastScore) {
      return { ...m, rank: lastRank };
    }
    lastRank = i + 1;
    lastScore = m.score;
    return { ...m, rank: lastRank };
  });
}
