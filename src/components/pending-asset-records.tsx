"use client";

import { useState } from "react";
import { preUseResult } from "@/lib/pre-use-checks";
import {
  removeOutboxItem,
  retryOutboxItem,
  useOutbox,
  type AssetInspectionItem,
  type PreUseCheckItem,
} from "@/lib/offline/outbox";

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

function Row({ item }: { item: AssetInspectionItem | PreUseCheckItem }) {
  const [busy, setBusy] = useState(false);
  const failed = item.status === "failed";

  const title =
    item.kind === "asset-inspection"
      ? `Inspection · ${item.input.outcome} · ${formatDate(item.input.inspectionDate)}`
      : `Pre-use check · ${preUseResult(item.input.items)} · ${formatDate(item.input.checkedOn)}`;
  const detail =
    item.kind === "asset-inspection"
      ? `Ref ${item.input.reference} · ${item.input.examinerName}`
      : `Checked by ${item.input.checkedBy}`;

  async function remove() {
    if (!window.confirm("Remove this? It hasn't been uploaded, so it will be lost.")) return;
    await removeOutboxItem(item.id);
  }

  async function retry() {
    setBusy(true);
    await retryOutboxItem(item.id);
    setBusy(false);
  }

  return (
    <li className="flex gap-4 px-6 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-[#002147]">{title}</span>
          <span
            className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
              failed ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900"
            }`}
          >
            {failed ? "Couldn't upload" : "Saved on phone · waiting to upload"}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-700">{detail}</p>
        {failed && item.error ? <p className="mt-1 text-sm text-red-800">{item.error}</p> : null}
      </div>
      <div className="flex h-fit shrink-0 flex-col items-end gap-2">
        {failed ? (
          <button
            type="button"
            onClick={retry}
            disabled={busy}
            className="text-xs font-semibold text-navy hover:underline disabled:opacity-60"
          >
            {busy ? "Trying…" : "Try again"}
          </button>
        ) : null}
        <button type="button" onClick={remove} className="text-xs font-semibold text-slate-500 hover:text-red-700">
          Remove
        </button>
      </div>
    </li>
  );
}

/** Inspections and pre-use checks for this equipment that are saved on the phone but not uploaded yet. */
export function PendingAssetRecords({ assetId }: { assetId: string }) {
  const { items } = useOutbox();
  const mine = (items ?? []).filter(
    (i): i is AssetInspectionItem | PreUseCheckItem =>
      (i.kind === "asset-inspection" || i.kind === "pre-use-check") && i.assetId === assetId,
  );
  if (mine.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm print:hidden">
      <div className="border-b border-amber-200 bg-amber-50/60 px-6 py-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#002147]">Waiting to upload</h2>
        <p className="mt-1 text-sm text-slate-muted">
          Saved on this phone. They upload by themselves when the signal is back, then show in the history below.
        </p>
      </div>
      <ul className="divide-y divide-slate-100">
        {mine.map((item) => (
          <Row key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}
