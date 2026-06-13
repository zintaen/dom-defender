"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import BYOGame from "@/components/BYOGame";
import { validateByoUrl, tryRecordByoAttempt } from "@/lib/game/byoValidator";
import { track } from "@/lib/analytics";

const COOKIE_KEY = "dd.byo.consent.v1";

export default function BYOPageWrapper() {
  return (
    <Suspense
      fallback={<main className="max-w-3xl mx-auto px-6 py-10 text-slate-400">Loading…</main>}
    >
      <BYOPage />
    </Suspense>
  );
}

function BYOPage() {
  const params = useSearchParams();
  const router = useRouter();
  const qUrl = params?.get("url") ?? "";
  const [input, setInput] = useState("");
  const [url, setUrl] = useState<string | null>(qUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setConsent(localStorage.getItem(COOKIE_KEY) === "yes");
    } catch {
      setConsent(false);
    }
  }, []);

  useEffect(() => {
    // Validate URL in query string on every mount (someone could hand-craft it).
    if (!qUrl) return;
    const v = validateByoUrl(qUrl);
    if (!v.ok) {
      setError(v.reason ?? "Invalid URL.");
      setUrl(null);
      router.replace("/byo");
      return;
    }
    setUrl(v.url!);
  }, [qUrl, router]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const rate = tryRecordByoAttempt();
    if (!rate.ok) {
      setError(`Slow down — try again in ${Math.ceil((rate.retryInMs ?? 0) / 1000)}s.`);
      return;
    }
    const v = validateByoUrl(input);
    if (!v.ok) {
      setError(v.reason ?? "Invalid URL.");
      return;
    }
    track("byo_url_submitted", { domain: new URL(v.url!).hostname });
    router.push(`/byo?url=${encodeURIComponent(v.url!)}`);
  };

  const acceptConsent = () => {
    try {
      localStorage.setItem(COOKIE_KEY, "yes");
    } catch {}
    setConsent(true);
  };

  // If a URL is loaded, render the game (but only if consent was given).
  if (url && consent) {
    return <BYOGame url={url} />;
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <div className="inline-block text-[10px] uppercase tracking-widest bg-amber-500/20 text-amber-200 border border-amber-500/40 px-2 py-0.5 rounded mb-3">
        Experimental
      </div>
      <h1 className="text-4xl font-black tracking-tight mb-2">🧪 BYO-Website</h1>
      <p className="text-slate-400 mb-6">
        Pick any site to use as the backdrop. Bugs spawn on top of it and you swat them.
        This is a sandbox — scores don&apos;t save.
      </p>

      {/* First-time cookie / consent banner */}
      {consent === false && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 mb-6">
          <h2 className="font-bold mb-2">Before we load a third-party site</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-slate-300 mb-4">
            <li>
              The site loads in a <span className="font-mono">sandboxed iframe</span> that can&apos;t
              read your cookies from this app.
            </li>
            <li>
              We only send a standard web request to the URL — no tracking pixels, no extra headers.
            </li>
            <li>
              Some sites (Google, Facebook, most banks) refuse to be embedded. That&apos;s fine; pick a
              different one.
            </li>
            <li>
              BYO runs are not scored on the leaderboard.
            </li>
          </ul>
          <div className="flex gap-2">
            <button
              onClick={acceptConsent}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-900 font-bold"
            >
              Got it — let me play
            </button>
            <Link
              href="/"
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200"
            >
              Go back
            </Link>
          </div>
        </div>
      )}

      {consent && (
        <>
          {error && (
            <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-4">
              {error}
            </div>
          )}
          <form onSubmit={submit} className="flex gap-2 mb-6">
            <input
              type="text"
              inputMode="url"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 font-mono text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-900 font-bold disabled:opacity-40"
            >
              Play →
            </button>
          </form>

          <div className="grid sm:grid-cols-2 gap-3">
            <SampleCard
              url="https://en.wikipedia.org/wiki/Main_Page"
              label="Wikipedia"
              desc="Plays nicely in iframes. A sea of links to swat."
              onChoose={(u) => setInput(u)}
            />
            <SampleCard
              url="https://developer.mozilla.org/en-US/"
              label="MDN"
              desc="Dev-friendly and usually embeddable."
              onChoose={(u) => setInput(u)}
            />
            <SampleCard
              url="https://news.ycombinator.com/"
              label="Hacker News"
              desc="Minimal DOM. Retro vibes."
              onChoose={(u) => setInput(u)}
            />
            <SampleCard
              url="https://example.com/"
              label="example.com"
              desc="The internet's favorite placeholder."
              onChoose={(u) => setInput(u)}
            />
          </div>

          <p className="text-xs text-slate-500 mt-8">
            Tip: if your chosen site shows as blank, it&apos;s probably sending{" "}
            <span className="font-mono">X-Frame-Options: DENY</span>. The overlay still works; just
            pick a different site for a better backdrop.
          </p>
        </>
      )}
    </main>
  );
}

function SampleCard({
  url,
  label,
  desc,
  onChoose,
}: {
  url: string;
  label: string;
  desc: string;
  onChoose: (u: string) => void;
}) {
  return (
    <button
      onClick={() => onChoose(url)}
      className="text-left rounded-2xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 p-4 transition-colors"
    >
      <div className="font-bold mb-1">{label}</div>
      <div className="text-xs text-slate-400 mb-2">{desc}</div>
      <div className="text-[10px] font-mono text-slate-500 truncate">{url}</div>
    </button>
  );
}
