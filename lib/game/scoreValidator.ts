// Server-authoritative score validation (NFR-DOM-001 / BACKLOG L1-T1).
//
// The client used to assert its own score; the server only checked
// `score <= max(500, durationSec*200)`, so a single forged POST could top the
// leaderboard. This validates a claimed run against its recorded replay.
//
// v1 (this file) is a consistency + bounds check:
//   - the replay's own summary must equal the claimed summary,
//   - claimed counts (bugs, bosses, combo, wave) cannot exceed the event log,
//   - the claimed score cannot exceed the replay's evidence (summed fix scores
//     and the recorded score curve) beyond a small tolerance,
//   - the replay timeline cannot run past the claimed duration.
// It defeats the trivial "POST a number" attack and naive inflation. It does NOT
// defeat a fully self-consistent fabricated replay - that needs v2, a
// re-simulation of the deterministic run from its seed. See NFR-DOM-001.

import { ReplayLog, REPLAY_MAX_EVENTS, REPLAY_MAX_SNAPSHOTS } from "./replay";
import type { RunSummary } from "./achievements";

export interface ScoreValidationResult {
  ok: boolean;
  reason?: string;
}

// The final per-second snapshot can lag a late scoring burst, so allow headroom
// above the recorded evidence before rejecting.
export const SCORE_TOLERANCE = 0.1;
export const MIN_SCORE_FLOOR = 500; // tiny runs are always allowed
export const DURATION_SLACK_SEC = 5;

type ClaimedRun = Pick<
  RunSummary,
  "score" | "durationSec" | "wave" | "bugsFixed" | "bossesDefeated" | "maxCombo"
>;

export function validateRunAgainstReplay(
  claimed: ClaimedRun,
  replay: ReplayLog | null | undefined
): ScoreValidationResult {
  if (!replay || typeof replay !== "object") return { ok: false, reason: "Missing replay." };

  const events = Array.isArray(replay.events) ? replay.events : [];
  const snapshots = Array.isArray(replay.snapshots) ? replay.snapshots : [];
  if (events.length > REPLAY_MAX_EVENTS) return { ok: false, reason: "Replay has too many events." };
  if (snapshots.length > REPLAY_MAX_SNAPSHOTS) return { ok: false, reason: "Replay has too many snapshots." };

  const rs = replay.summary;
  if (!rs) return { ok: false, reason: "Replay summary missing." };

  // 1) The replay's own summary must match the claimed summary.
  if (
    claimed.score !== rs.score ||
    claimed.wave !== rs.wave ||
    claimed.bugsFixed !== rs.bugsFixed ||
    claimed.bossesDefeated !== rs.bossesDefeated ||
    claimed.maxCombo !== rs.maxCombo
  ) {
    return { ok: false, reason: "Claimed summary does not match the replay summary." };
  }

  // 2) Tally the event log.
  let fixCount = 0;
  let fixScoreSum = 0;
  let bossDowns = 0;
  let comboMax = 0;
  let waveMaxEvent = 1;
  let lastEventT = 0;
  for (const e of events as any[]) {
    if (!e || typeof e !== "object") continue;
    if (typeof e.t === "number" && e.t > lastEventT) lastEventT = e.t;
    switch (e.type) {
      case "fix":
        fixCount++;
        fixScoreSum += Number(e.score) || 0;
        break;
      case "boss_down":
        bossDowns++;
        break;
      case "combo":
        comboMax = Math.max(comboMax, Number(e.value) || 0);
        break;
      case "wave":
        waveMaxEvent = Math.max(waveMaxEvent, Number(e.wave) || 1);
        break;
    }
  }
  if (claimed.bugsFixed > fixCount) return { ok: false, reason: "More bugs claimed than the replay recorded." };
  if (claimed.bossesDefeated > bossDowns) return { ok: false, reason: "More bosses claimed than the replay recorded." };
  if (comboMax > 0 && claimed.maxCombo > comboMax) return { ok: false, reason: "Combo exceeds the replay." };

  // 3) Wave ceiling from events and snapshots.
  let snapWaveMax = 1;
  let lastSnapScore = 0;
  let lastSnapT = 0;
  for (const s of snapshots as any[]) {
    if (!s || typeof s !== "object") continue;
    snapWaveMax = Math.max(snapWaveMax, Number(s.wave) || 1);
    if (typeof s.t === "number" && s.t >= lastSnapT) {
      lastSnapT = s.t;
      lastSnapScore = Number(s.score) || 0;
    }
  }
  if (claimed.wave > Math.max(waveMaxEvent, snapWaveMax)) {
    return { ok: false, reason: "Wave exceeds the replay." };
  }

  // 4) Score cannot exceed the replay's evidence beyond tolerance.
  const evidence = Math.max(fixScoreSum, lastSnapScore);
  const ceiling = Math.max(MIN_SCORE_FLOOR, Math.ceil(evidence * (1 + SCORE_TOLERANCE)));
  if (claimed.score > ceiling) return { ok: false, reason: "Score exceeds what the replay supports." };

  // 5) Timeline cannot run past the claimed duration.
  const lastT = Math.max(lastEventT, lastSnapT);
  if (claimed.durationSec > 0 && lastT > claimed.durationSec + DURATION_SLACK_SEC) {
    return { ok: false, reason: "Replay timeline is longer than the claimed duration." };
  }

  return { ok: true };
}
