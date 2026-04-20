"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.toLowerCase().trim(),
          password,
          email: email.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Registration failed.");
        setLoading(false);
        return;
      }
      // Auto sign in
      const signInRes = await signIn("credentials", {
        username: username.toLowerCase().trim(),
        password,
        redirect: false,
      });
      setLoading(false);
      if (signInRes?.error) {
        // Should not happen — but fall back to login page
        router.push("/login");
      } else {
        router.push("/account");
        router.refresh();
      }
    } catch (e: any) {
      setLoading(false);
      setError(e?.message ?? "Network error");
    }
  };

  return (
    <main className="max-w-md mx-auto px-6 py-16">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8">
        <h1 className="text-3xl font-black tracking-tight mb-1">Create your account</h1>
        <p className="text-slate-400 text-sm mb-6">Save scores, climb the leaderboard, unlock skins.</p>

        <form onSubmit={submit} className="space-y-4">
          <Field
            label="Username"
            value={username}
            onChange={setUsername}
            placeholder="lowercase letters, numbers, underscores"
            hint="2–24 chars. Used on the leaderboard."
            autoComplete="username"
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="at least 6 characters"
            autoComplete="new-password"
          />
          <Field
            label="Email (optional)"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            autoComplete="email"
            required={false}
          />

          {error && (
            <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 text-slate-900 font-black text-lg disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-sm text-slate-400 mt-6 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-cyan-300 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
  autoComplete,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-slate-400 mb-1 block">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 focus:border-cyan-400 focus:outline-none text-slate-100"
      />
      {hint && <span className="text-xs text-slate-500 mt-1 block">{hint}</span>}
    </label>
  );
}
