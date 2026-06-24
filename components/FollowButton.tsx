"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

// FR-DD-COMM-002: follower/following counts plus a follow toggle, loaded client
// side from /api/follow so the profile page itself stays a cacheable server
// component.
interface FollowState {
  followers: number;
  following: number;
  viewerFollows: boolean;
  isSelf: boolean;
  canFollow: boolean;
}

export default function FollowButton({ username }: { username: string }) {
  const [s, setS] = useState<FollowState | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/follow?username=${encodeURIComponent(username)}`, { cache: "no-store" });
      if (res.ok) setS(await res.json());
    } catch {
      // counts are non-critical; leave them at the default
    }
  }, [username]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async () => {
    if (!s) return;
    setBusy(true);
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: s.viewerFollows ? "unfollow" : "follow", username }),
      });
      const data = await res.json();
      if (res.ok) {
        setS((p) => (p ? { ...p, viewerFollows: data.viewerFollows, followers: data.followers } : p));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4 mt-2">
      <div className="flex gap-4 text-sm text-slate-400">
        <span>
          <span className="font-bold text-slate-100">{s?.followers ?? 0}</span> followers
        </span>
        <span>
          <span className="font-bold text-slate-100">{s?.following ?? 0}</span> following
        </span>
      </div>
      {s?.canFollow && (
        <button
          onClick={toggle}
          disabled={busy}
          className={`px-4 py-1.5 rounded-lg font-semibold text-sm disabled:opacity-60 ${
            s.viewerFollows
              ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
              : "bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-900"
          }`}
        >
          {s.viewerFollows ? "Following" : "Follow"}
        </button>
      )}
      {s && !s.isSelf && !s.canFollow && (
        <Link href="/login" className="text-sm text-cyan-300 underline">
          Sign in to follow
        </Link>
      )}
    </div>
  );
}
