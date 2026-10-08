"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { assignContractor } from "@/actions/contractors";
import type { DispatchOption } from "@/lib/data/contractor-queries";

const selectCls =
  "min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/20";

/** Contractor dropdown with Assign (and Unassign once assigned) for one booking. */
export function DispatchAssign({
  orderId,
  options,
  currentId,
}: {
  orderId: string;
  options: DispatchOption[];
  currentId: string | null;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState(currentId ?? "");
  const [busy, setBusy] = useState<"assign" | "unassign" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(contractorId: string | null) {
    setBusy(contractorId ? "assign" : "unassign");
    setError(null);
    const res = await assignContractor(orderId, contractorId);
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  if (options.length === 0) {
    return <p className="text-xs text-slate-muted">No contractor is approved for this category yet.</p>;
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <select
          aria-label="Contractor"
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
          disabled={busy !== null}
          className={selectCls}
        >
          <option value="">Choose contractor…</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
              {o.coversRegion ? " · covers this region" : ""}
              {o.activeJobs > 0 ? ` · ${o.activeJobs} active` : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => run(choice)}
          disabled={busy !== null || !choice || choice === currentId}
          className="shrink-0 rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#00306a] disabled:opacity-50"
        >
          {busy === "assign" ? "Assigning…" : currentId ? "Reassign" : "Assign"}
        </button>
        {currentId ? (
          <button
            type="button"
            onClick={() => run(null)}
            disabled={busy !== null}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {busy === "unassign" ? "Removing…" : "Unassign"}
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="text-xs text-red-800" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
