"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPreUseCheck } from "@/actions/create-pre-use-check";
import {
  PRE_USE_ANSWERS,
  PRE_USE_CHECK_ITEMS,
  type PreUseAnswer,
} from "@/lib/pre-use-checks";

/** The same operator usually does the checks, so remember their name on this device. */
const CHECKER_STORAGE_KEY = "been:last-pre-use-checker";

function loadChecker(): string {
  try {
    return window.localStorage.getItem(CHECKER_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveChecker(name: string) {
  try {
    window.localStorage.setItem(CHECKER_STORAGE_KEY, name);
  } catch {
    // Storage unavailable (private mode); the form still works.
  }
}

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const labelCls = "mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-muted";
const inputCls =
  "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/20";

const answerStyles: Record<PreUseAnswer, string> = {
  OK: "border-emerald-600 bg-emerald-600 text-white",
  Fault: "border-red-600 bg-red-600 text-white",
  "N/A": "border-slate-500 bg-slate-500 text-white",
};

type Answers = Partial<Record<string, PreUseAnswer>>;

type Props = {
  assetId: string;
  assetLabel: string;
  open: boolean;
  onClose: () => void;
};

export function PreUseCheckDialog({ assetId, assetLabel, open, onClose }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [checkedOn, setCheckedOn] = useState("");
  const [checkedBy, setCheckedBy] = useState("");
  const [answers, setAnswers] = useState<Answers>({});
  const [faultNotes, setFaultNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answered = PRE_USE_CHECK_ITEMS.filter((item) => answers[item]).length;
  const hasFault = PRE_USE_CHECK_ITEMS.some((item) => answers[item] === "Fault");

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      // Today's date and the remembered name only exist once the dialog opens on the client.
      setError(null);
      setCheckedOn((v) => v || todayLocal());
      setCheckedBy((v) => v || loadChecker());
    }
    if (!open && el.open) el.close();
  }, [open]);

  function setAnswer(item: string, answer: PreUseAnswer) {
    setAnswers((prev) => ({ ...prev, [item]: answer }));
  }

  function markRemainingOk() {
    setAnswers((prev) => {
      const next = { ...prev };
      for (const item of PRE_USE_CHECK_ITEMS) next[item] ??= "OK";
      return next;
    });
  }

  function handleClose() {
    dialogRef.current?.close();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const missing = PRE_USE_CHECK_ITEMS.find((item) => !answers[item]);
    if (missing) {
      setError(`Answer every item (missing: "${missing}").`);
      return;
    }
    const items = PRE_USE_CHECK_ITEMS.map((item) => ({ item, answer: answers[item] as PreUseAnswer }));

    setBusy(true);
    setError(null);
    const res = await createPreUseCheck({ assetId, checkedOn, checkedBy, items, faultNotes });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    saveChecker(checkedBy.trim());
    setAnswers({});
    setFaultNotes("");
    setCheckedOn("");
    handleClose();
    router.refresh();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-0 text-[#002147] shadow-xl backdrop:bg-navy/40"
      aria-labelledby="pre-use-check-title"
    >
      <div className="border-b border-slate-200 bg-navy px-6 py-4 text-white">
        <h2 id="pre-use-check-title" className="text-lg font-semibold tracking-tight">
          Pre-use check
        </h2>
        <p className="mt-1 font-mono text-sm text-white/85">{assetLabel}</p>
        <p className="mt-2 text-xs text-white/75">
          A quick check before use. It does not replace or reset the thorough examination due date.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="space-y-5 px-6 py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="checked_on" className={labelCls}>
                Date of check
              </label>
              <input
                id="checked_on"
                type="date"
                required
                max={todayLocal()}
                value={checkedOn}
                onChange={(e) => setCheckedOn(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="checked_by" className={labelCls}>
                Checked by
              </label>
              <input
                id="checked_by"
                type="text"
                required
                autoComplete="name"
                placeholder="Operator name"
                value={checkedBy}
                onChange={(e) => setCheckedBy(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <fieldset>
            <div className="mb-2 flex items-center justify-between gap-2">
              <legend className="text-xs font-semibold uppercase tracking-wide text-slate-muted">
                Checklist ({answered}/{PRE_USE_CHECK_ITEMS.length})
              </legend>
              <button
                type="button"
                onClick={markRemainingOk}
                className="text-xs font-semibold text-navy underline-offset-2 hover:underline"
              >
                Mark the rest OK
              </button>
            </div>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {PRE_USE_CHECK_ITEMS.map((item) => (
                <li key={item} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm">{item}</span>
                  <div className="flex shrink-0 gap-1.5" role="radiogroup" aria-label={item}>
                    {PRE_USE_ANSWERS.map((answer) => {
                      const selected = answers[item] === answer;
                      return (
                        <button
                          key={answer}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setAnswer(item, answer)}
                          className={`min-w-14 rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                            selected ? answerStyles[answer] : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {answer}
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </fieldset>

          {hasFault ? (
            <div className="space-y-3 rounded-lg border border-red-200 bg-red-50/60 p-4">
              <p className="text-sm font-semibold text-red-900">
                Do not use this equipment. Take it out of service and report the fault to your supervisor.
              </p>
              <div>
                <label htmlFor="fault_notes" className={labelCls}>
                  Describe the fault
                </label>
                <textarea
                  id="fault_notes"
                  rows={3}
                  required
                  placeholder="What is wrong, and what was done (e.g. tagged out, reported to …)"
                  value={faultNotes}
                  onChange={(e) => setFaultNotes(e.target.value)}
                  className={`${inputCls} resize-y bg-white`}
                />
              </div>
            </div>
          ) : null}

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
            {busy ? "Saving…" : hasFault ? "Save and report fault" : "Save check"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
