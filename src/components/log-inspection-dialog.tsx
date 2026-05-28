"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createInspectionRecord } from "@/actions/create-inspection";
import { INSPECTION_OUTCOMES_FORM, type InspectionOutcomeForm } from "@/lib/types/inspection";

type Props = {
  assetId: string;
  assetLabel: string;
  open: boolean;
  onClose: () => void;
};

export function LogInspectionDialog({ assetId, assetLabel, open, onClose }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [inspectionDate, setInspectionDate] = useState("");
  const [outcome, setOutcome] = useState<InspectionOutcomeForm | "">("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      setError(null);
    }
    if (!open && el.open) el.close();
  }, [open]);

  function handleClose() {
    dialogRef.current?.close();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!outcome) {
      setError("Select an outcome.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await createInspectionRecord({
      assetId,
      inspectionDate,
      outcome,
      reference,
      notes,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setInspectionDate("");
    setOutcome("");
    setReference("");
    setNotes("");
    handleClose();
    router.refresh();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-0 text-[#002147] shadow-xl backdrop:bg-navy/40"
      aria-labelledby="log-inspection-title"
    >
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="border-b border-slate-200 bg-navy px-6 py-4 text-white">
          <h2 id="log-inspection-title" className="text-lg font-semibold tracking-tight">
            Log inspection
          </h2>
          <p className="mt-1 font-mono text-sm text-white/85">{assetLabel}</p>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div>
            <label htmlFor="inspection_date" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-muted">
              Inspection date
            </label>
            <input
              id="inspection_date"
              name="inspection_date"
              type="date"
              required
              value={inspectionDate}
              onChange={(e) => setInspectionDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/20"
            />
          </div>

          <div>
            <label htmlFor="outcome" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-muted">
              Outcome
            </label>
            <select
              id="outcome"
              name="outcome"
              required
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as InspectionOutcomeForm)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium shadow-sm outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/20"
            >
              <option value="">Select outcome</option>
              {INSPECTION_OUTCOMES_FORM.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="reference" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-muted">
              Certificate / reference number
            </label>
            <input
              id="reference"
              name="reference"
              type="text"
              required
              placeholder="e.g. BC-INS-2026-0142"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-mono text-sm shadow-sm outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/20"
            />
          </div>

          <div>
            <label htmlFor="notes" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-muted">
              Inspector&apos;s notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              placeholder="Observations, defects, follow-up actions…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/20"
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50/80 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#00306a] disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save inspection"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
