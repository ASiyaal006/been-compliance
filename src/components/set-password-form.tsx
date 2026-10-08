"use client";

import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Database } from "@/lib/supabase/database.types";

type Stage = { kind: "checking" } | { kind: "ready"; email: string } | { kind: "invalid"; message: string };

const inputCls =
  "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-[#002147] outline-none ring-navy/20 focus:border-navy focus:ring-2";
const labelCls = "block text-xs font-semibold uppercase tracking-wider text-slate-muted";

function browserClient() {
  // The invite link puts the session in the URL hash; we read it ourselves below.
  return createBrowserClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    isSingleton: false,
    auth: { detectSessionInUrl: false },
  });
}

/** Turns an invite (or password reset) link into a session, then lets the person choose a password. */
export function SetPasswordForm({ redirectTo }: { redirectTo: string }) {
  const [stage, setStage] = useState<Stage>({ kind: "checking" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function begin() {
      const supabase = browserClient();
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const query = new URLSearchParams(window.location.search);
      // Keep the one-time tokens out of the address bar and browser history.
      if (window.location.hash) window.history.replaceState(null, "", window.location.pathname + window.location.search);

      let failure: string | null = null;
      if (hash.get("error_code") || hash.get("error")) {
        failure =
          hash.get("error_code") === "otp_expired"
            ? "This link has expired or has already been used. Ask Been Compliance to resend your invite."
            : (hash.get("error_description") ?? "This link didn't work. Ask Been Compliance to resend your invite.");
      } else if (hash.get("access_token") && hash.get("refresh_token")) {
        const { error } = await supabase.auth.setSession({
          access_token: hash.get("access_token")!,
          refresh_token: hash.get("refresh_token")!,
        });
        if (error) failure = "This link has expired or has already been used. Ask Been Compliance to resend your invite.";
      } else if (query.get("token_hash")) {
        const type = query.get("type") === "recovery" ? "recovery" : "invite";
        const { error } = await supabase.auth.verifyOtp({ token_hash: query.get("token_hash")!, type });
        if (error) failure = "This link has expired or has already been used. Ask Been Compliance to resend your invite.";
      }

      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (failure || !data.user) {
        setStage({ kind: "invalid", message: failure ?? "Open the link from your invite email to set your password." });
        return;
      }
      setStage({ kind: "ready", email: data.user.email ?? "" });
    }
    void begin();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: updateError } = await browserClient().auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setBusy(false);
      return;
    }
    // Full navigation so the server picks up the new session cookies.
    window.location.assign(redirectTo);
  }

  if (stage.kind === "checking") {
    return <p className="text-center text-sm text-slate-muted">Checking your link…</p>;
  }
  if (stage.kind === "invalid") {
    return (
      <div className="space-y-4 text-center">
        <p className="rounded-lg border border-danger/20 bg-danger-bg px-3 py-2 text-sm text-danger" role="alert">
          {stage.message}
        </p>
        <Link href="/login" className="text-sm font-semibold text-navy underline-offset-4 hover:underline">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {stage.email ? (
        <p className="text-center text-sm text-slate-muted">
          Signing in as <span className="font-medium text-[#002147]">{stage.email}</span>
        </p>
      ) : null}
      <div>
        <label htmlFor="new_password" className={labelCls}>
          New password
        </label>
        <input
          id="new_password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
        />
      </div>
      <div>
        <label htmlFor="confirm_password" className={labelCls}>
          Confirm password
        </label>
        <input
          id="confirm_password"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputCls}
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
        {busy ? "Saving…" : "Set password and continue"}
      </button>
    </form>
  );
}
