"use client";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

export default function Nav() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Hide chrome on play / daily for an immersive game experience.
  // BYO's game view is `fixed inset-0` so it visually covers the nav on its own —
  // we leave the nav rendered so the landing (?url unset) still has navigation.
  if (pathname?.startsWith("/play") || pathname?.startsWith("/daily")) return null;

  return (
    <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center font-black text-slate-900">
            D
          </div>
          <span className="font-black tracking-tight group-hover:text-cyan-300 transition-colors">
            DOM DEFENDER
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1 text-sm">
          <NavLink href="/play" label="Play" current={pathname} />
          <NavLink href="/daily" label="Daily" current={pathname} />
          <NavLink href="/tournament" label="Tournament" current={pathname} />
          <NavLink href="/leaderboard" label="Leaderboard" current={pathname} />
          {session && <NavLink href="/feed" label="Feed" current={pathname} />}
          <NavLink href="/achievements" label="Achievements" current={pathname} />
          <NavLink href="/shop" label="Shop" current={pathname} />
          <NavLink href="/pro" label="Pro" current={pathname} />
          {session && <NavLink href="/account" label="Account" current={pathname} />}
        </div>

        <div className="flex items-center gap-2 text-sm">
          {status === "loading" ? (
            <span className="text-slate-500">…</span>
          ) : session?.user ? (
            <>
              <span className="text-slate-400 hidden sm:inline">
                Hi, <span className="text-cyan-300 font-semibold">{(session.user as any).username}</span>
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-slate-200"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-lg text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-900 font-semibold"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, label, current }: { href: string; label: string; current: string | null }) {
  const active = current === href || current?.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-lg transition-colors ${
        active ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800/60"
      }`}
    >
      {label}
    </Link>
  );
}
