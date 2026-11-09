"use client";

import Link from "next/link";
import { useState } from "react";
import { requestPasswordReset } from "@/actions/password-reset";

export function ForgotPasswordForm({ initialEmail = "" }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await requestPasswordReset(email);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSentTo(email.trim());
  }

  if (sentTo) {
    return (
      <div className="space-y-4 text-center">
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900" role="status">
          If <span className="font-medium">{sentTo}</span>{" "}
          has a Been Compliance login, we&apos;ve emailed it a link to
          choose a new password. It can take a minute to arrive, so check your spam folder too.
        </p>
        <Link href="/login" className="text-sm font-semibold text-navy underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="reset_email" className="block text-xs font-semibold uppercase tracking-wider text-slate-muted">
          Email
        </label>
        <input
          id="reset_email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-[#002147] outline-none ring-navy/20 focus:border-navy focus:ring-2"
        />
      </div>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-navy px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00306a] disabled:opacity-60"
      >
        {busy ? "Sending…" : "Email me a reset link"}
      </button>
      <p className="text-center">
        <Link href="/login" className="text-sm font-semibold text-navy underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
