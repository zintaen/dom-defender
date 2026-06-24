"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Game } from "@/components/game/Game";
import { getSkin, Skin } from "@/lib/game/skins";
import { RunSummary } from "@/lib/game/achievements";
import { ReplayLog } from "@/lib/game/replay";
import { track } from "@/lib/analytics";
import { encodeChallenge } from "@/lib/game/challenge";

interface SubmitResult {
  newAchievements: { id: string; name: string; icon: string; rewardCoins: number }[];
  coinsEarned: number;
  unlockedSkins: string[];
  runSummary: RunSummary;
  shareUrl?: string;
  replayUrl?: string;
}

export default function PlayShell({
  mode,
  initialSeed,
  dailyKey,
}: {
  mode: "endless" | "daily" | "tournament";
  initialSeed?: number;
  dailyKey?: string;
}) {
  const { data: session, status } = useSession();
  const [skin, setSkin] = useState<Skin>(getSkin("default"));
  const [skinReady, setSkinReady] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const lastSummaryRef = useRef<RunSummary | null>(null);

  // Pull selected skin from /api/profile if signed in
  useEffect(() => {
    if (status !== "authenticated") {
      setSkinReady(true);
      return;
    }
    let cancelled = false;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((p) => {
        if (cancelled) return;
        if (p?.selectedSkin) setSkin(getSkin(p.selectedSkin));
        setSkinReady(true);
      })
      .catch(() => setSkinReady(true));
    return () => {
      cancelled = true;
    };
  }, [status]);

  const onRunEnd = async (summary: RunSummary) => {
    lastSummaryRef.current = summary;
    track("run_end", {
      mode,
      score: summary.score,
      durationSec: summary.durationSec,
      wave: summary.wave,
      signedIn: Boolean(session?.user),
    });
    if (!session?.user) return; // No save when signed out
    // The score is submitted in onReplayReady (Game fires it immediately after
    // this) so the server can validate it against the replay (NFR-DOM-001).
    setSubmitting(true);
    setSubmitError(null);
  };

  const onReplayReady = async (log: ReplayLog) => {
    if (!session?.user) return;
    const summary = lastSummaryRef.current;

    // 1) Submit the score together with its replay so the server can validate it
    //    (NFR-DOM-001). Game delivers the replay right after onRunEnd, so the
    //    summary ref is already set.
    if (summary) {
      try {
        const res = await fetch("/api/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...summary, mode, seed: initialSeed, replay: log }),
        });
        const data = await res.json();
        if (!res.ok) {
          setSubmitError(data?.error ?? "Failed to submit score.");
        } else {
          setSubmitResult({
            newAchievements: data.newAchievements ?? [],
            coinsEarned: data.coinsEarned ?? 0,
            unlockedSkins: data.unlockedSkins ?? [],
            runSummary: summary,
          });
          track("score_submitted", { mode, score: summary.score });
        }
      } catch (e: any) {
        setSubmitError(e?.message ?? "Network error.");
      } finally {
        setSubmitting(false);
      }
    }

    // 2) Store the replay for the shareable link and the viewer.
    try {
      const res = await fetch("/api/replays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log),
      });
      const data = await res.json();
      if (res.ok && data?.shortId) {
        const replayUrl = `/replay/${data.shortId}`;
        const fullUrl = typeof window !== "undefined" ? `${window.location.origin}${replayUrl}` : replayUrl;
        setSubmitResult((prev) =>
          prev ? { ...prev, replayUrl, shareUrl: fullUrl } : prev
        );
        track("replay_saved", { shortId: data.shortId, mode: log.mode });
      }
    } catch {
      // Non-fatal — replay is a bonus feature.
    }
  };

  if (!skinReady) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading skin…
      </div>
    );
  }

  const topRight = (
    <Link
      href="/"
      className="px-3 py-2 rounded-lg border border-white/10 text-sm bg-slate-900/60 text-slate-300 hover:bg-slate-800"
      title="Back to menu"
    >
      ⮌ Menu
    </Link>
  );

  return (
    <>
      <Game
        // The Game core only knows "endless" | "daily". A tournament run is a
        // fixed-seed deterministic run, so it maps to the "daily" core path
        // (seed set => director off, determinism preserved). The real
        // "tournament" mode is still what PlayShell submits to /api/scores.
        mode={mode === "tournament" ? "daily" : mode}
        skin={skin}
        initialSeed={initialSeed}
        dailyKey={dailyKey}
        onRunEnd={onRunEnd}
        onReplayReady={onReplayReady}
        topRightExtra={topRight}
      />

      {/* Game-over toast — sits above the Game's own GameOverOverlay */}
      {(submitting || submitResult || submitError) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] max-w-md w-[92vw]">
          <div className="rounded-2xl border border-slate-700 bg-slate-950/95 backdrop-blur-md p-4 shadow-2xl">
            {submitting && (
              <div className="text-sm text-slate-300">Submitting your score…</div>
            )}
            {submitError && (
              <div className="text-sm text-red-300">⚠ {submitError}</div>
            )}
            {submitResult && (
              <SubmitToast
                result={submitResult}
                mode={mode}
                dailyKey={dailyKey}
                skinId={skin.id}
                seed={initialSeed}
                challengerName={(session?.user as any)?.username}
                onClose={() => setSubmitResult(null)}
              />
            )}
          </div>
        </div>
      )}

      {/* Sign-up nudge for guests */}
      {status === "unauthenticated" && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-xs">
          <div className="rounded-2xl border border-violet-500/40 bg-violet-500/10 backdrop-blur-md p-4 shadow-2xl text-sm">
            <div className="font-bold mb-1">Playing as guest</div>
            <div className="text-slate-300 mb-3">
              Sign up to save scores, unlock skins, and earn achievements.
            </div>
            <div className="flex gap-2">
              <Link
                href="/register"
                className="flex-1 text-center px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-900 font-semibold"
              >
                Sign up
              </Link>
              <Link
                href="/login"
                className="flex-1 text-center px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SubmitToast({
  result,
  mode,
  dailyKey,
  skinId,
  seed,
  challengerName,
  onClose,
}: {
  result: SubmitResult;
  mode: "endless" | "daily" | "tournament";
  dailyKey?: string;
  skinId: string;
  seed?: number;
  challengerName?: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const share = result.shareUrl;
  const { score, wave, bugsFixed, bossesDefeated, maxCombo, durationSec } = result.runSummary;

  // Friend challenge link (FR-DD-SOC-001): only when the run had a seed, and
  // never for tournament runs - a challenge link encodes the seed, and handing
  // out the live week seed would let people pre-practice the tournament.
  const [challengeCopied, setChallengeCopied] = useState(false);
  const challengeUrl =
    mode !== "tournament" && seed !== undefined && typeof window !== "undefined"
      ? `${window.location.origin}/challenge/${encodeChallenge({
          seed,
          score,
          name: challengerName ?? "A player",
          mode,
        })}`
      : null;
  const copyChallenge = async () => {
    if (!challengeUrl) return;
    try {
      await navigator.clipboard.writeText(
        `Beat my ${score.toLocaleString()} in DOM Defender: ${challengeUrl}`
      );
      setChallengeCopied(true);
      setTimeout(() => setChallengeCopied(false), 2000);
    } catch {
      // no-op
    }
  };

  const shareText =
    mode === "daily"
      ? `I scored ${score.toLocaleString()} on the DOM Defender Daily Challenge (${dailyKey ?? "today"}) — wave ${wave}, ${bugsFixed} bugs, combo x${maxCombo}.`
      : mode === "tournament"
      ? `I scored ${score.toLocaleString()} in the DOM Defender weekly tournament — wave ${wave}, ${bugsFixed} bugs, combo x${maxCombo}.`
      : `I scored ${score.toLocaleString()} in DOM Defender — wave ${wave}, ${bugsFixed} bugs, combo x${maxCombo}.`;
  const xIntent =
    share && `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText + " ")}&url=${encodeURIComponent(share)}`;

  const copy = async () => {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(`${shareText} ${share}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // no-op
    }
  };

  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="text-3xl">🎉</div>
        <div className="flex-1">
          <div className="font-black text-lg">Run saved!</div>
          {result.coinsEarned > 0 && (
            <div className="text-sm text-yellow-300 mt-0.5">
              +{result.coinsEarned} coins
            </div>
          )}
          {result.newAchievements.length > 0 && (
            <div className="mt-2">
              <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">
                New achievements
              </div>
              <ul className="space-y-1">
                {result.newAchievements.map((a) => (
                  <li key={a.id} className="text-sm flex items-center gap-2">
                    <span>{a.icon}</span>
                    <span className="font-semibold">{a.name}</span>
                    <span className="text-yellow-300 text-xs">+{a.rewardCoins}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.unlockedSkins.length > 0 && (
            <div className="text-sm text-cyan-300 mt-2">
              🎨 Unlocked skin{result.unlockedSkins.length > 1 ? "s" : ""}:{" "}
              {result.unlockedSkins.join(", ")}
            </div>
          )}

          {/* Share card */}
          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Share this run</div>
            <div className="grid grid-cols-3 gap-1 mb-2">
              <Mini label="Score" value={score.toLocaleString()} />
              <Mini label="Wave" value={String(wave)} />
              <Mini label="Time" value={`${durationSec}s`} />
              <Mini label="Fixed" value={String(bugsFixed)} />
              <Mini label="Bosses" value={String(bossesDefeated)} />
              <Mini label="Combo" value={`x${maxCombo}`} />
            </div>
            {share ? (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={copy}
                  className="text-xs px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 hover:bg-cyan-500/30"
                >
                  {copied ? "✓ Copied" : "Copy link"}
                </button>
                {xIntent && (
                  <a
                    href={xIntent}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
                  >
                    Post on X
                  </a>
                )}
                {result.replayUrl && (
                  <Link
                    href={result.replayUrl}
                    className="text-xs px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-200 border border-violet-500/40 hover:bg-violet-500/30"
                  >
                    View replay →
                  </Link>
                )}
                {challengeUrl && (
                  <button
                    onClick={copyChallenge}
                    className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 hover:bg-emerald-500/30"
                  >
                    {challengeCopied ? "✓ Challenge copied" : "Challenge a friend"}
                  </button>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-500">Saving replay…</div>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <a
              href={
                mode === "tournament"
                  ? "/tournament"
                  : mode === "daily"
                  ? `/leaderboard?mode=daily`
                  : "/leaderboard"
              }
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              View leaderboard
            </a>
            <button
              onClick={onClose}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-950 border border-slate-800 p-1.5 text-center">
      <div className="text-[9px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className="font-mono font-bold text-sm">{value}</div>
    </div>
  );
}
