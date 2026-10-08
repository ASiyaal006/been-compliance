"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addContractor, removeContractor, resendInvite, type InviteOutcome } from "@/actions/contractors";

const labelCls = "mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-muted";
const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/20";

export function AddContractorForm({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [regions, setRegions] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<{ name: string; email: string; invite: InviteOutcome } | null>(null);

  function toggle(id: string) {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setAdded(null);
    const res = await addContractor({ email, name, regions, categoryIds });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setAdded({ name: name.trim(), email: email.trim(), invite: res.invite });
    setEmail("");
    setName("");
    setRegions("");
    setCategoryIds([]);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5 px-6 py-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contractor_email" className={labelCls}>
            Email
          </label>
          <input
            id="contractor_email"
            type="email"
            required
            autoComplete="off"
            placeholder="inspector@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
          <p className="mt-1 text-xs text-slate-500">
            New to Been Compliance? We&apos;ll email them a link to set their password.
          </p>
        </div>
        <div>
          <label htmlFor="contractor_name" className={labelCls}>
            Name
          </label>
          <input
            id="contractor_name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>
      <div>
        <label htmlFor="contractor_regions" className={labelCls}>
          Regions covered
        </label>
        <input
          id="contractor_regions"
          type="text"
          placeholder="e.g. China, Vietnam, Shenzhen"
          value={regions}
          onChange={(e) => setRegions(e.target.value)}
          className={inputCls}
        />
        <p className="mt-1 text-xs text-slate-500">
          Countries or cities, separated by commas. Matching factories show this contractor first.
        </p>
      </div>
      <fieldset>
        <legend className={labelCls}>Approved product categories</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {categories.map((c) => (
            <label key={c.id} className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={categoryIds.includes(c.id)}
                onChange={() => toggle(c.id)}
                className="mt-0.5 size-4 accent-[#002147]"
              />
              {c.name}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-slate-500">Leave all unticked to approve every category.</p>
      </fieldset>
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
          {error}
        </p>
      ) : null}
      {added ? <InviteMessage name={added.name} email={added.email} invite={added.invite} /> : null}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#00306a] disabled:opacity-60"
        >
          {busy ? "Adding…" : "Add contractor"}
        </button>
      </div>
    </form>
  );
}

export function RemoveContractorButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (
      !window.confirm(
        `Remove ${name}? Jobs they haven't started go back on the dispatch board, and they lose access to any job in progress.`,
      )
    ) {
      return;
    }
    setBusy(true);
    const res = await removeContractor(id);
    setBusy(false);
    if (!res.ok) {
      window.alert(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      className="text-xs font-semibold text-slate-500 hover:text-red-700 disabled:opacity-60"
    >
      {busy ? "Removing…" : "Remove"}
    </button>
  );
}

function InviteMessage({ name, email, invite }: { name: string; email?: string; invite: InviteOutcome }) {
  const [copied, setCopied] = useState(false);
  if (invite.kind !== "link") {
    return (
      <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
        {invite.kind === "emailed"
          ? `Invite sent to ${email ?? name}. Once they set a password, their jobs appear under My jobs.`
          : `${name} added. They'll see their jobs under My jobs.`}
      </p>
    );
  }
  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      window.prompt("Copy this link:", link);
    }
  }
  return (
    <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950" role="status">
      <p>
        {name}&apos;s login is ready, but the invite email couldn&apos;t be sent automatically. Copy this link and send it
        to them (WhatsApp or your own email). It lets them set a password and works once.
      </p>
      <div className="flex gap-2">
        <input
          readOnly
          value={invite.link}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-md border border-amber-200 bg-white px-2 py-1.5 font-mono text-xs"
          aria-label="Invite link"
        />
        <button
          type="button"
          onClick={() => copy(invite.link)}
          className="shrink-0 rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#00306a]"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}

export function ResendInviteButton({ id, name }: { id: string; name: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteOutcome | null>(null);

  async function resend() {
    setBusy(true);
    setError(null);
    const res = await resendInvite(id);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setInvite(res.invite);
  }

  return (
    <div className="mt-2 space-y-2">
      <p className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">Invite not accepted yet</span>
        <button
          type="button"
          onClick={resend}
          disabled={busy}
          className="font-semibold text-navy underline-offset-2 hover:underline disabled:opacity-60"
        >
          {busy ? "Sending…" : "Resend invite"}
        </button>
      </p>
      {error ? (
        <p className="text-xs text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {invite ? <InviteMessage name={name} invite={invite} /> : null}
    </div>
  );
}
