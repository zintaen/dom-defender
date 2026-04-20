"use client";
import React, { forwardRef } from "react";
import { Skin } from "@/lib/game/skins";

export const LandingPage = forwardRef<HTMLDivElement, { skin: Skin }>(function LandingPage({ skin }, ref) {
  // CSS variables for skin theming + background
  const cssVars = {
    ["--bug-drift"]: skin.bugColors.drift,
    ["--bug-comic"]: skin.bugColors.comic,
    ["--bug-invert"]: skin.bugColors.invert,
    ["--bug-chromatic"]: skin.bugColors.chromatic,
  } as React.CSSProperties;

  const features = [
    { t: "Lightning fast",        d: "Sub-100ms builds on a global edge network that never sleeps." },
    { t: "Type-safe by default",  d: "Full TypeScript support with design tokens and runtime validation." },
    { t: "Designed for teams",    d: "Review, preview, and ship collaborative work without merge conflicts." },
  ];

  return (
    <div ref={ref} className={`${skin.pageBgClass} ${skin.textClass} min-h-screen`} style={cssVars}>
      {/* NAV */}
      <header className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto" data-bug-candidate="true">
        <div className="flex items-center gap-2" data-bug-candidate="true">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-slate-900"
               style={{ background: `linear-gradient(135deg, ${skin.accent}, ${skin.accent2})` }}>N</div>
          <span className="font-bold text-lg tracking-tight" data-bug-candidate="true">{skin.brandName}</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm opacity-80">
          <a href="#" data-bug-candidate="true">Product</a>
          <a href="#" data-bug-candidate="true">Pricing</a>
          <a href="#" data-bug-candidate="true">Customers</a>
          <a href="#" data-bug-candidate="true">Docs</a>
        </nav>
        <div className="flex items-center gap-3">
          <button className="text-sm opacity-80" data-bug-candidate="true">Sign in</button>
          <button className="text-sm bg-white text-slate-900 px-4 py-2 rounded-lg font-semibold" data-bug-candidate="true">Start free</button>
        </div>
      </header>

      {/* HERO */}
      <section className="px-8 py-16 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs mb-6"
             style={{ background: skin.surface, border: "1px solid rgba(255,255,255,0.08)", color: skin.accent2 }}
             data-bug-candidate="true">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: skin.accent2 }} />
          Now with AI-powered DOM repair
        </div>
        <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-tight mb-6" data-bug-candidate="true" data-bug-priority="high">
          {skin.brandTagline}
        </h1>
        <p className="text-lg opacity-80 max-w-2xl mx-auto mb-8" data-bug-candidate="true">
          Build, ship, and defend pixel-perfect web experiences. Trusted by thousands of engineers worldwide.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button className="text-slate-900 px-6 py-3 rounded-xl font-bold shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${skin.accent}, ${skin.accent2})` }}
                  data-bug-candidate="true" data-bug-priority="high">
            Deploy a site →
          </button>
          <button className="px-6 py-3 rounded-xl font-semibold"
                  style={{ background: skin.surface, border: "1px solid rgba(255,255,255,0.12)" }}
                  data-bug-candidate="true">
            Watch demo
          </button>
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-8 py-12 max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <div key={i} className="rounded-2xl p-6"
               style={{ background: skin.surface, border: "1px solid rgba(255,255,255,0.08)" }}
               data-bug-candidate="true">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 font-bold"
                 style={{ background: `${skin.accent}33`, border: `1px solid ${skin.accent}66`, color: skin.accent }}>
              {i === 0 ? "⚡" : i === 1 ? "🛡" : "✨"}
            </div>
            <h3 className="font-bold text-lg mb-2" data-bug-candidate="true">{f.t}</h3>
            <p className="text-sm opacity-70" data-bug-candidate="true">{f.d}</p>
          </div>
        ))}
      </section>

      {/* TESTIMONIAL */}
      <section className="px-8 py-16 max-w-4xl mx-auto">
        <div className="rounded-2xl p-8 text-center"
             style={{ background: skin.surface, border: "1px solid rgba(255,255,255,0.08)" }}
             data-bug-candidate="true">
          <p className="text-xl italic opacity-90 mb-4" data-bug-candidate="true">
            &ldquo;We shipped our entire design system in a weekend. It&apos;s the future of the web.&rdquo;
          </p>
          <p className="text-sm opacity-60" data-bug-candidate="true">— Morgan Chen, CTO at StackForge</p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-8 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4" data-bug-candidate="true">Ready to build something great?</h2>
        <button className="bg-white text-slate-900 px-8 py-3 rounded-xl font-bold" data-bug-candidate="true">Get started free</button>
      </section>

      {/* FOOTER */}
      <footer className="px-8 py-10 border-t border-white/10 max-w-7xl mx-auto flex justify-between text-sm opacity-50">
        <div data-bug-candidate="true">© 2026 {skin.brandName}, Inc.</div>
        <div className="flex gap-6">
          <a href="#" data-bug-candidate="true">Privacy</a>
          <a href="#" data-bug-candidate="true">Terms</a>
          <a href="#" data-bug-candidate="true">Status</a>
        </div>
      </footer>
    </div>
  );
});
