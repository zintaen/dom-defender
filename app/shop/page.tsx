"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Cosmetic,
  CosmeticCategory,
  isCoinPurchasable,
  isUsdPurchasable,
} from "@/lib/game/cosmetics";
import { track } from "@/lib/analytics";

interface ShopPayload {
  cosmetics: Cosmetic[];
  owned: string[];
  coins: number;
  isPro: boolean;
  selected: {
    trail?: string;
    title?: string;
    badge?: string;
    sfxPack?: string;
  };
  billingEnabled: boolean;
}

const CATEGORIES: { id: CosmeticCategory; label: string; emoji: string }[] = [
  { id: "trail", label: "Cursor Trails", emoji: "✨" },
  { id: "title", label: "Titles", emoji: "🏷️" },
  { id: "badge", label: "Badges", emoji: "🎖️" },
  { id: "sfx_pack", label: "Sound Packs", emoji: "🎧" },
];

export default function ShopPage() {
  const { status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ShopPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/shop");
      return;
    }
    if (status !== "authenticated") return;
    fetch("/api/shop")
      .then((r) => r.json())
      .then((d) => {
        if (d?.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => setError(e?.message ?? "Network error"));
  }, [status, router]);

  const buyCoins = async (c: Cosmetic) => {
    if (!data) return;
    setBusyId(c.id);
    setError(null);
    try {
      const res = await fetch("/api/shop/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cosmeticId: c.id, method: "coins" }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d?.error ?? "Could not buy");
      } else {
        setData({ ...data, coins: d.coins, owned: d.ownedCosmetics });
        track("cosmetic_purchased", { id: c.id, method: "coins", price: c.coinPrice });
      }
    } catch (e: any) {
      setError(e?.message ?? "Network error");
    } finally {
      setBusyId(null);
    }
  };

  const buyUsd = async (c: Cosmetic) => {
    if (!data) return;
    setBusyId(c.id);
    setError(null);
    try {
      const res = await fetch("/api/shop/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cosmeticId: c.id, method: "usd" }),
      });
      const d = await res.json();
      if (d?.waitlistUrl) {
        router.push(d.waitlistUrl);
        return;
      }
      if (!res.ok) {
        setError(d?.error ?? "Could not buy");
      } else if (d?.stub) {
        setError(d.message ?? "Billing coming soon.");
      }
    } catch (e: any) {
      setError(e?.message ?? "Network error");
    } finally {
      setBusyId(null);
    }
  };

  const equip = async (slot: "trail" | "title" | "badge" | "sfxPack", cosmeticId: string | null) => {
    if (!data) return;
    try {
      const res = await fetch("/api/shop/equip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, cosmeticId }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d?.error ?? "Could not equip");
      } else if (d?.cleared) {
        setData({ ...data, selected: { ...data.selected, [slot]: undefined } });
        track("cosmetic_cleared", { slot });
      } else {
        setData({ ...data, selected: d.selected });
        track("cosmetic_equipped", { slot, id: d.cosmeticId });
      }
    } catch (e: any) {
      setError(e?.message ?? "Network error");
    }
  };

  if (status === "loading" || !data) {
    return <main className="max-w-5xl mx-auto px-6 py-10 text-slate-400">Loading…</main>;
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tight">🛍 Cosmetics Shop</h1>
          <p className="text-slate-400 mt-1">
            Spend coins on vanity items. Gameplay stays the same — these are pure flair.
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-sm">
          <span className="text-slate-500 mr-2">You have</span>
          <span className="font-mono font-bold text-yellow-300">
            🪙 {data.coins.toLocaleString()} coins
          </span>
          {data.isPro && (
            <span className="ml-3 text-[10px] uppercase tracking-widest bg-violet-500/20 text-violet-300 border border-violet-500/40 px-2 py-0.5 rounded">
              Pro
            </span>
          )}
        </div>
      </div>

      {!data.billingEnabled && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 mb-6 text-xs text-slate-400">
          💡 Real-money purchases are paused while we finish the billing pipeline.
          Join the <Link href="/pro" className="underline decoration-dotted hover:text-slate-200">Pro waitlist</Link>{" "}
          to be notified when it opens.
        </div>
      )}

      {error && (
        <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-6">
          {error}
        </div>
      )}

      <div className="space-y-10">
        {CATEGORIES.map((cat) => {
          const items = data.cosmetics.filter((c) => c.category === cat.id);
          const slotKey =
            cat.id === "sfx_pack" ? ("sfxPack" as const) :
            cat.id === "trail" ? ("trail" as const) :
            cat.id === "title" ? ("title" as const) : ("badge" as const);
          const selectedId = data.selected[slotKey];

          return (
            <section key={cat.id}>
              <div className="flex items-end justify-between mb-3">
                <h2 className="text-xl font-black flex items-center gap-2">
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </h2>
                {selectedId && (
                  <button
                    onClick={() => equip(slotKey, null)}
                    className="text-xs text-slate-500 hover:text-slate-300 underline decoration-dotted"
                  >
                    Unequip
                  </button>
                )}
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((c) => {
                  const owned = data.owned.includes(c.id);
                  const selected = selectedId === c.id;
                  const lockedForNonPro = c.proOnly && !data.isPro;
                  return (
                    <article
                      key={c.id}
                      className={`rounded-2xl p-4 border transition-colors ${
                        selected
                          ? "border-cyan-400 bg-cyan-400/5"
                          : owned
                          ? "border-slate-700 bg-slate-900/50"
                          : lockedForNonPro
                          ? "border-violet-500/30 bg-violet-500/5"
                          : "border-slate-800 bg-slate-900/30"
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <div className="text-3xl leading-none">{c.icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-bold">{c.name}</h3>
                            {selected && (
                              <span className="text-[10px] uppercase tracking-widest bg-cyan-400/20 text-cyan-300 px-1.5 py-0.5 rounded">
                                Equipped
                              </span>
                            )}
                            {c.proOnly && (
                              <span className="text-[10px] uppercase tracking-widest bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded">
                                Pro
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">{c.description}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 items-center">
                        {owned ? (
                          !selected && (
                            <button
                              onClick={() => equip(slotKey, c.id)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-900 font-semibold"
                            >
                              Equip
                            </button>
                          )
                        ) : (
                          <>
                            {isCoinPurchasable(c) && (
                              <button
                                onClick={() => buyCoins(c)}
                                disabled={busyId === c.id || data.coins < (c.coinPrice ?? Infinity)}
                                className="text-xs px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-200 border border-yellow-500/40 hover:bg-yellow-500/30 disabled:opacity-40"
                              >
                                {busyId === c.id ? "Buying…" : `🪙 Buy · ${c.coinPrice}`}
                              </button>
                            )}
                            {isUsdPurchasable(c) && (
                              <button
                                onClick={() => buyUsd(c)}
                                disabled={busyId === c.id}
                                title={
                                  data.billingEnabled
                                    ? "Buy with Stripe"
                                    : "Billing not enabled — join the Pro waitlist"
                                }
                                className="text-xs px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-200 border border-violet-500/40 hover:bg-violet-500/30 disabled:opacity-40"
                              >
                                {busyId === c.id ? "…" : `$${c.usdPrice?.toFixed(2)}`}
                              </button>
                            )}
                            {lockedForNonPro && !isCoinPurchasable(c) && !isUsdPurchasable(c) && (
                              <Link
                                href="/pro"
                                className="text-xs px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-200 border border-violet-500/40"
                              >
                                Unlock with Pro →
                              </Link>
                            )}
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
