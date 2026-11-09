"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { InviteOutcome } from "@/actions/contractors";
import {
  addCustomerLogin,
  removeCustomerLogin,
  resendCustomerInvite,
  sendCustomerPasswordLink,
} from "@/actions/customers";
import { InviteMessage } from "@/components/contractor-admin";

const labelCls = "mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-muted";
const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/20";

const PORTAL_TEXT = "Once they set a password, they can download their certificates.";

export function AddCustomerLoginForm({
  clients,
  defaultClientId = "",
}: {
  clients: { id: string; name: string }[];
  defaultClientId?: string;
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState(defaultClientId);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<{ name: string; email: string; invite: InviteOutcome } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setAdded(null);
    const res = await addCustomerLogin({ clientId, email, name });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setAdded({ name: name.trim(), email: email.trim(), invite: res.invite });
    setEmail("");
    setName("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5 px-6 py-6">
      <div>
        <label htmlFor="customer_client" className={labelCls}>
          Customer
        </label>
        <select
          id="customer_client"
          required
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className={inputCls}
        >
          <option value="">Choose a customer…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          Customers appear here once they have an asset or a product inspection booking.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="customer_email" className={labelCls}>
            Email
          </label>
          <input
            id="customer_email"
            type="email"
            required
            autoComplete="off"
            placeholder="name@customer.co.uk"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
          <p className="mt-1 text-xs text-slate-500">We&apos;ll email them a link to set their password.</p>
        </div>
        <div>
          <label htmlFor="customer_name" className={labelCls}>
            Name
          </label>
          <input
            id="customer_name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
          {error}
        </p>
      ) : null}
      {added ? (
        <InviteMessage
          name={added.name}
          email={added.email}
          invite={added.invite}
          where={PORTAL_TEXT}
          existing={`${added.name} already had a login. Next time they sign in they'll see this customer's certificates.`}
        />
      ) : null}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#00306a] disabled:opacity-60"
        >
          {busy ? "Sending…" : "Invite to portal"}
        </button>
      </div>
    </form>
  );
}

export function CustomerLoginActions({
  userId,
  name,
  invitePending,
}: {
  userId: string;
  name: string;
  invitePending: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"invite" | "password" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ invite: InviteOutcome; email?: string; reset: boolean } | null>(null);

  async function resend() {
    setBusy("invite");
    setError(null);
    setSent(null);
    const res = await resendCustomerInvite(userId);
    setBusy(null);
    if (!res.ok) setError(res.error);
    else setSent({ invite: res.invite, reset: false });
  }

  async function password() {
    if (!window.confirm(`Email ${name} a link to choose a new password? Their current password keeps working until they change it.`)) {
      return;
    }
    setBusy("password");
    setError(null);
    setSent(null);
    const res = await sendCustomerPasswordLink(userId);
    setBusy(null);
    if (!res.ok) setError(res.error);
    else setSent({ invite: res.invite, email: res.email, reset: true });
  }

  async function remove() {
    if (!window.confirm(`Remove ${name}'s portal access? They will no longer see this customer's certificates.`)) return;
    setBusy("remove");
    setError(null);
    const res = await removeCustomerLogin(userId);
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  const linkCls = "font-semibold text-navy underline-offset-2 hover:underline disabled:opacity-60";

  return (
    <div className="space-y-2">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {invitePending ? (
          <>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">
              Invite not accepted yet
            </span>
            <button type="button" onClick={resend} disabled={busy !== null} className={linkCls}>
              {busy === "invite" ? "Sending…" : "Resend invite"}
            </button>
          </>
        ) : (
          <button type="button" onClick={password} disabled={busy !== null} className={linkCls}>
            {busy === "password" ? "Sending…" : "Send password link"}
          </button>
        )}
        <button
          type="button"
          onClick={remove}
          disabled={busy !== null}
          className="font-semibold text-slate-500 hover:text-red-700 disabled:opacity-60"
        >
          {busy === "remove" ? "Removing…" : "Remove access"}
        </button>
      </p>
      {error ? (
        <p className="text-xs text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {sent ? (
        <InviteMessage name={name} email={sent.email} invite={sent.invite} reset={sent.reset} where={PORTAL_TEXT} />
      ) : null}
    </div>
  );
}
