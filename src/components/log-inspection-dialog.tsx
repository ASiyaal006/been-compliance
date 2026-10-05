"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createInspectionRecord } from "@/actions/create-inspection";
import {
  INSPECTION_OUTCOMES_FORM,
  REASONS_FOR_EXAM,
  type InspectionOutcomeForm,
  type ReasonForExam,
} from "@/lib/types/inspection";

/** Examiner details are the same on most reports, so remember them on this device. */
const EXAMINER_STORAGE_KEY = "been:last-examiner";

type ExaminerDetails = { name: string; qualifications: string; employer: string };

function loadExaminer(): ExaminerDetails | null {
  try {
    const raw = window.localStorage.getItem(EXAMINER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ExaminerDetails) : null;
  } catch {
    return null;
  }
}

function saveExaminer(details: ExaminerDetails) {
  try {
    window.localStorage.setItem(EXAMINER_STORAGE_KEY, JSON.stringify(details));
  } catch {
    // Storage unavailable (private mode); the form still works.
  }
}

const labelCls = "mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-muted";
const inputCls =
  "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/20";

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
  const [reasonForExam, setReasonForExam] = useState<ReasonForExam | "">("");
  const [examinerName, setExaminerName] = useState("");
  const [examinerQualifications, setExaminerQualifications] = useState("");
  const [examinerEmployer, setExaminerEmployer] = useState("");
  const [defects, setDefects] = useState("");
  const [defectRemedyBy, setDefectRemedyBy] = useState("");
  const [testDetails, setTestDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      setError(null);
      const saved = loadExaminer();
      if (saved) {
        // Reads browser storage, which only exists once the dialog opens on the client.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setExaminerName((v) => v || saved.name);
        setExaminerQualifications((v) => v || saved.qualifications);
        setExaminerEmployer((v) => v || saved.employer);
      }
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
    if (!reasonForExam) {
      setError("Select the reason for the examination.");
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
      reasonForExam,
      examinerName,
      examinerQualifications,
      examinerEmployer,
      defects,
      defectRemedyBy,
      testDetails,
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
    setReasonForExam("");
    setDefects("");
    setDefectRemedyBy("");
    setTestDetails("");
    saveExaminer({
      name: examinerName.trim(),
      qualifications: examinerQualifications.trim(),
      employer: examinerEmployer.trim(),
    });
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

        <div className="max-h-[65vh] space-y-5 overflow-y-auto px-6 py-6">
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
            <label htmlFor="reason_for_exam" className={labelCls}>
              Reason for examination
            </label>
            <select
              id="reason_for_exam"
              name="reason_for_exam"
              required
              value={reasonForExam}
              onChange={(e) => setReasonForExam(e.target.value as ReasonForExam)}
              className={`${inputCls} font-medium`}
            >
              <option value="">Select reason</option>
              {REASONS_FOR_EXAM.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {outcome === "Fail" || outcome === "Monitor" ? (
            <div className="space-y-5 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
              <div>
                <label htmlFor="defects" className={labelCls}>
                  Defects found and repair required
                </label>
                <textarea
                  id="defects"
                  name="defects"
                  rows={3}
                  required
                  placeholder="Which part, what is wrong, and the repair, renewal or alteration needed"
                  value={defects}
                  onChange={(e) => setDefects(e.target.value)}
                  className={`${inputCls} resize-y bg-white`}
                />
              </div>
              <div>
                <label htmlFor="defect_remedy_by" className={labelCls}>
                  {outcome === "Fail" ? "Remedy by (optional)" : "Must be remedied by"}
                </label>
                <input
                  id="defect_remedy_by"
                  name="defect_remedy_by"
                  type="date"
                  required={outcome === "Monitor"}
                  value={defectRemedyBy}
                  onChange={(e) => setDefectRemedyBy(e.target.value)}
                  className={`${inputCls} bg-white`}
                />
                {outcome === "Fail" ? (
                  <p className="mt-1.5 text-[11px] text-slate-600">
                    Fail means an existing or imminent danger: the equipment must not be used, and the report must
                    be sent to the enforcing authority.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div>
            <label htmlFor="test_details" className={labelCls}>
              Tests carried out (if any)
            </label>
            <input
              id="test_details"
              name="test_details"
              type="text"
              placeholder="e.g. Proof load test at 1.25 × SWL, no permanent deformation"
              value={testDetails}
              onChange={(e) => setTestDetails(e.target.value)}
              className={inputCls}
            />
          </div>

          <fieldset className="space-y-4 border-t border-slate-200 pt-5">
            <legend className="text-xs font-bold uppercase tracking-wider text-[#002147]">Competent person</legend>
            <div>
              <label htmlFor="examiner_name" className={labelCls}>
                Examiner name
              </label>
              <input
                id="examiner_name"
                name="examiner_name"
                type="text"
                required
                autoComplete="name"
                value={examinerName}
                onChange={(e) => setExaminerName(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="examiner_qualifications" className={labelCls}>
                Qualifications
              </label>
              <input
                id="examiner_qualifications"
                name="examiner_qualifications"
                type="text"
                placeholder="e.g. LEEA Diploma, IEng"
                value={examinerQualifications}
                onChange={(e) => setExaminerQualifications(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="examiner_employer" className={labelCls}>
                Employer name and address
              </label>
              <textarea
                id="examiner_employer"
                name="examiner_employer"
                rows={2}
                required
                placeholder="Been Compliance Ltd, … (or Self-employed, with your address)"
                value={examinerEmployer}
                onChange={(e) => setExaminerEmployer(e.target.value)}
                className={`${inputCls} resize-y`}
              />
            </div>
          </fieldset>

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
