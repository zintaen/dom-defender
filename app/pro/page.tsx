"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { track } from "@/lib/analytics";

interface ProState {
  billingEnabled: boolean;
  isPro: boolean;
  email?: string;
}

const PERKS: { icon: string; title: string; body: string }[] = [
  {
    icon: "🎨",
    title: "Exclusive skins & cosmetics",
    body:
      "Pro-only skins, cursor trails, titles, and profile badges that aren't available with coins.",
  },
  {
    icon: "📊",
    title: "Advanced replay analytics",
    body:
      "Per-wave breakdowns, heatmaps of where your cursor spent time, and side-by-side replay diffs.",
  },
  {
    icon: "🧪",
    title: "Early access to new modes",
    body:
      "BYO-Website sandboxes, community challenge boards, and experimental boss variants land for Pro first.",
  },
  {
    icon: "🌙",
    title: "Private leaderboards",
    body:
      "Unlimited private-seed challenge rooms to race friends or teammates without strangers piling in.",
  },
];

export default function ProPage() {
  const { data: session, status } = useSession();
  const [state, setState] = useState<ProState | null>(null);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Cheap read: hit /api/shop because it already returns billingEnabled + isPro.
    fetch("/api/shop")
      .then((r) => r.json())
      .then((d) => {
        setState({
          billingEnabled: Boolean(d?.billingEnabled),
          isPro: Boolean(d?.isPro),
        });
      })
      .catch(() => {
        setState({ billingEnabled: false, isPro: false });
      });
  }, [status]);

  useEffect(() => {
    track("pro_page_viewed", { signedIn: status === "authenticated" });
  }, [status]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/pro-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, note, source: "pro_page" }),
      });
      const d = await res.json();
      if (!res.ok) setError(d?.error ?? "Could not join");
      else {
        setSubmitted(true);
        track("pro_waitlist_submitted", { hasNote: note.trim().length > 0 });
      }
    } catch (e: any) {
      setError(e?.message ?? "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <div className="text-center mb-10">
        <div className="inline-block text-[10px] uppercase tracking-widest bg-violet-500/20 text-violet-300 border border-violet-500/40 px-2 py-0.5 rounded mb-3">
          Coming soon
        </div>
        <h1 className="text-5xl font-black tracking-tight mb-3">
          DOM Defender <span className="bg-gradient-to-r from-violet-400 to-cyan-300 bg-clip-text text-transparent">Pro</span>
        </h1>
        <p className="text-slate-400 max-w-xl mx-auto">
          Support the project and unlock vanity perks that make the leaderboard feel like yours.
          Gameplay is free forever — Pro is for players who want extra flair.
        </p>
      </div>

      {state?.isPro && state?.billingEnabled && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-center mb-10">
          <div className="text-3xl mb-1">🌟</div>
          <div className="font-bold mb-1">You're a Pro member — thank you.</div>
          <div className="text-sm text-slate-300">
            Head to the{" "}
            <Link href="/shop" className="underline decoration-dotted hover:text-white">
              shop
            </Link>{" "}
            to spend perks.
          </div>
        </div>
      )}

      <section className="grid md:grid-cols-2 gap-3 mb-10">
        {PERKS.map((p) => (
          <div
            key={p.title}
            className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 flex gap-3"
          >
            <div className="text-3xl shrink-0">{p.icon}</div>
            <div>
              <h3 className="font-bold mb-1">{p.title}</h3>
              <p className="text-sm text-slate-400">{p.body}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Pricing card */}
      <section className="grid md:grid-cols-2 gap-3 mb-10">
        <PricingCard
          tier="Supporter"
          price="$3"
          cadence="/ mo"
          blurb="Every cosmetic in the shop, priority queue on leaderboards."
          features={[
            "All Pro cosmetics",
            "Early access to new modes",
            "Priority leaderboard placement on tie",
          ]}
          billingEnabled={Boolean(state?.billingEnabled)}
        />
        <PricingCard
          tier="Patron"
          price="$9"
          cadence="/ mo"
          blurb="Supporter + advanced analytics + private leaderboards."
          highlight
          features={[
            "Everything in Supporter",
            "Advanced replay analytics & diffs",
            "Unlimited private-seed rooms",
            "Supporter-only badge on your profile",
          ]}
          billingEnabled={Boolean(state?.billingEnabled)}
        />
      </section>

      {/* Waitlist form when billing is off */}
      {!state?.billingEnabled && (
        <section className="rounded-2xl border border-violet-500/40 bg-violet-500/10 p-6">
          <h2 className="text-2xl font-black mb-1">Join the waitlist</h2>
          <p className="text-slate-300 text-sm mb-4">
            We'll email you when Pro opens. No charges until you pick a tier.
          </p>
          {submitted ? (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              ✓ You're on the list. Welcome aboard.
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:border-violet-500 focus:outline-none"
              />
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 500))}
                placeholder="Optional: what Pro feature matters most to you?"
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:border-violet-500 focus:outline-none resize-none"
              />
              {error && <div className="text-sm text-red-300">{error}</div>}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-xs text-slate-500">
                  We'll only use your email to notify you about Pro.
                </p>
                <button
                  type="submit"
                  disabled={submitting || !email}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-900 font-bold disabled:opacity-50"
                >
                  {submitting ? "Submitting…" : "Notify me"}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      <p className="text-center text-xs text-slate-500 mt-10">
        The core game is — and will always be — free. Pro is about funding the project
        and rewarding superfans, not about gating gameplay.
      </p>
    </main>
  );
}

function PricingCard({
  tier,
  price,
  cadence,
  blurb,
  features,
  highlight,
  billingEnabled,
}: {
  tier: string;
  price: string;
  cadence: string;
  blurb: string;
  features: string[];
  highlight?: boolean;
  billingEnabled: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-6 border ${
        highlight
          ? "border-violet-500/60 bg-violet-500/10"
          : "border-slate-800 bg-slate-900/40"
      }`}
    >
      <div className="flex items-baseline gap-2 mb-1">
        <h3 className="text-xl font-black">{tier}</h3>
        {highlight && (
          <span className="text-[10px] uppercase tracking-widest bg-violet-500/30 text-violet-200 px-1.5 py-0.5 rounded">
            Best
          </span>
        )}
      </div>
      <p className="text-sm text-slate-400 mb-4">{blurb}</p>
      <div className="mb-5">
        <span className="text-4xl font-black">{price}</span>
        <span className="text-slate-400">{cadence}</span>
      </div>
      <ul className="space-y-1.5 text-sm text-slate-300 mb-5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button
        disabled
        title={billingEnabled ? "Checkout coming soon" : "Waitlist open — billing not enabled yet"}
        className={`w-full px-4 py-2 rounded-lg font-bold ${
          highlight
            ? "bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-900"
            : "bg-slate-800 text-slate-300"
        } opacity-60 cursor-not-allowed`}
      >
        {billingEnabled ? "Subscribe →" : "Join waitlist below"}
      </button>
    </div>
  );
}
