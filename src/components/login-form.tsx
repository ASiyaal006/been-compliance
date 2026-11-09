"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If Supabase sends an invite link to the site's home page instead of /auth/welcome, carry it on there.
  useEffect(() => {
    const hash = window.location.hash;
    if (/[#&](access_token|error_code)=/.test(hash)) window.location.replace(`/auth/welcome${hash}`);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(
        signInError.code === "invalid_credentials"
          ? "Wrong email or password. If you've forgotten your password, use “Forgot password?” to set a new one."
          : signInError.message,
      );
      setBusy(false);
      return;
    }

    // Full navigation so the server receives fresh auth cookies (avoids stale RSC session).
    window.location.assign(redirectTo.startsWith("/") ? redirectTo : "/dashboard");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-muted">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-[#002147] outline-none ring-navy/20 focus:border-navy focus:ring-2"
        />
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-muted">
            Password
          </label>
          <Link
            href={email.trim() ? `/auth/forgot-password?email=${encodeURIComponent(email.trim())}` : "/auth/forgot-password"}
            className="text-xs font-semibold text-navy underline-offset-2 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-[#002147] outline-none ring-navy/20 focus:border-navy focus:ring-2"
        />
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-navy px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00306a] disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
