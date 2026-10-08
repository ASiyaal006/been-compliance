"use client";

import { useState } from "react";
import { PreUseCheckDialog } from "@/components/pre-use-check-dialog";
import type { PreUseCheckList } from "@/lib/data/pre-use-check-queries";

type Props = {
  assetId: string;
  assetLabel: string;
  list: PreUseCheckList;
};

export function PreUseChecksSection({ assetId, assetLabel, list }: Props) {
  const [open, setOpen] = useState(false);
  const latest = list.checks[0];

  return (
    <section className="overflow-hidden border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#002147]">Pre-use checks</h2>
          <p className="mt-1 text-sm text-slate-muted">
            Routine operator checks. These don&apos;t change the thorough examination due date.
          </p>
        </div>
        {!list.notSetUp ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border-2 border-navy bg-white px-4 py-2.5 text-sm font-semibold text-navy hover:bg-navy hover:text-white"
          >
            <svg className="size-4" aria-hidden fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Record pre-use check
          </button>
        ) : null}
      </div>

      {list.notSetUp ? (
        <p className="px-6 py-5 text-sm text-amber-900">
          Pre-use checks aren&apos;t set up in the database yet. Run the pre-use checks SQL in Supabase to turn them on.
        </p>
      ) : list.checks.length === 0 ? (
        <p className="px-6 py-5 text-sm text-slate-muted">No pre-use checks recorded yet.</p>
      ) : (
        <>
          {latest?.result === "Fault" ? (
            <p className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm font-semibold text-red-900" role="alert">
              Fault reported on {latest.checkedOnUk}. Do not use until it has been repaired and checked.
            </p>
          ) : null}
          <ul className="divide-y divide-slate-100">
            {list.checks.map((c) => (
              <li key={c.id} className="flex flex-col gap-1 px-6 py-3 sm:flex-row sm:items-start sm:gap-6">
                <span className="w-28 shrink-0 text-sm font-medium">{c.checkedOnUk}</span>
                <span
                  className={`w-fit shrink-0 rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${
                    c.result === "Fault" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {c.result}
                </span>
                <div className="min-w-0 flex-1 text-sm">
                  <span className="text-slate-700">{c.checkedBy}</span>
                  {c.result === "Fault" ? (
                    <div className="mt-1 text-slate-700">
                      {c.faultItems.length > 0 ? <p className="text-xs text-red-800">{c.faultItems.join(" · ")}</p> : null}
                      {c.faultNotes ? <p className="mt-0.5">{c.faultNotes}</p> : null}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <PreUseCheckDialog assetId={assetId} assetLabel={assetLabel} open={open} onClose={() => setOpen(false)} />
    </section>
  );
}
