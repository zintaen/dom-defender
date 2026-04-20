import Link from "next/link";

export default function HomePage() {
  return (
    <main className="max-w-6xl mx-auto px-6 pt-12 pb-20">
      {/* HERO */}
      <section className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs mb-6 bg-cyan-400/10 border border-cyan-400/30 text-cyan-300">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
          Now with bosses, daily challenges & power-ups
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 bg-gradient-to-br from-violet-400 via-cyan-300 to-emerald-300 text-transparent bg-clip-text">
          Defend the DOM.
        </h1>
        <p className="text-lg text-slate-300 mb-8 leading-relaxed">
          The webpage <em>is</em> the playing field. Patch CSS bugs, smash console errors, and vacuum
          memory leaks before the <span className="text-red-300 font-semibold">server crash</span> meter
          hits 100%.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/play"
            className="px-7 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-900 font-black text-lg shadow-xl hover:scale-[1.02] transition-transform"
          >
            ▶ Play Endless
          </Link>
          <Link
            href="/daily"
            className="px-7 py-3 rounded-xl bg-yellow-400/10 border border-yellow-400/40 text-yellow-200 font-bold text-lg hover:bg-yellow-400/20 transition-colors"
          >
            ☀ Daily Challenge
          </Link>
          <Link
            href="/leaderboard"
            className="px-7 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-bold text-lg hover:bg-slate-800 transition-colors"
          >
            🏆 Leaderboard
          </Link>
        </div>
      </section>

      {/* FEATURES */}
      <section className="grid md:grid-cols-3 gap-4 mb-16">
        <Feature
          icon="🩹"
          title="Three tools, one webpage"
          desc="Drag drifting elements with Duct Tape. Smash console popups with the Debugger. Vacuum memory leaks with the Garbage Collector."
        />
        <Feature
          icon="⚡"
          title="Power-ups & bosses"
          desc="Freeze, Auto-fix, Magnet, and Shield are mapped to Q/W/E/R. Defeat boss bugs by hitting all three weak points with the right tool."
        />
        <Feature
          icon="🌍"
          title="Compete globally"
          desc="Daily challenges share a fixed seed so leaderboards are fair. Earn coins, unlock skins, climb the rankings."
        />
      </section>

      {/* HOW TO PLAY */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 md:p-8 mb-16">
        <h2 className="text-2xl font-black mb-4">How to play</h2>
        <ol className="space-y-3 text-slate-300 list-decimal list-inside">
          <li>
            Bugs spawn on the page: <span className="text-yellow-300">drifting elements</span>,{" "}
            <span className="text-pink-300">console popups</span>, and{" "}
            <span className="text-cyan-300">memory leaks</span>.
          </li>
          <li>
            Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-xs">1</kbd>/
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-xs">2</kbd>/
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-xs">3</kbd> to switch tools, then
            click or drag to fix bugs.
          </li>
          <li>
            Use power-ups (<kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-xs">Q</kbd>{" "}
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-xs">W</kbd>{" "}
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-xs">E</kbd>{" "}
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-xs">R</kbd>) when things get rough.
          </li>
          <li>Boss bugs appear from wave 4. Hit all three weak points with the matching tool.</li>
          <li>If the crash meter reaches 100%, the server crashes. Do better next time.</li>
        </ol>
      </section>

      <p className="text-center text-slate-500 text-sm">
        Sign up to save your scores, unlock skins, and chase achievements.
      </p>
    </main>
  );
}

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 hover:border-cyan-400/30 transition-colors">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}
