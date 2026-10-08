"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { reopenInspection, saveInspection } from "@/actions/product-inspection";
import { assessAql } from "@/lib/aql";
import type { InspectionStart } from "@/lib/data/product-inspection-queries";
import { formatLocation, mapsUrl } from "@/lib/inspection-location";
import {
  CHECKLIST_ANSWERS,
  checklistItemKey,
  type AqlInspectionLevel,
  type ChecklistAnswer,
  type ChecklistResults,
  type ChecklistSection,
  type DefectSeverity,
} from "@/lib/types/product-inspection";

const labelCls = "mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-muted";
const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/20 disabled:bg-slate-50 disabled:text-slate-500";

const answerStyles: Record<ChecklistAnswer, string> = {
  Pass: "border-emerald-600 bg-emerald-600 text-white",
  Fail: "border-red-600 bg-red-600 text-white",
  "N/A": "border-slate-500 bg-slate-500 text-white",
};

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Props = {
  orderId: string;
  checklist: ChecklistSection[];
  initialResults: ChecklistResults;
  initialInspectionDate: string | null;
  initialInspectorName: string | null;
  initialOrderQuantity: number | null;
  aql: { level: AqlInspectionLevel; critical: number; major: number; minor: number };
  defectCounts: Record<DefectSeverity, number>;
  canEdit: boolean;
  finished: boolean;
  cancelled: boolean;
  inspectionResult: "Pass" | "Fail" | null;
  completedAtUk: string | null;
  /** Null until the inspector presses Start inspection; the checklist stays locked until then. */
  start: InspectionStart | null;
};

export function ProductInspectionWorkspace(props: Props) {
  const router = useRouter();
  const [inspectionDate, setInspectionDate] = useState(props.initialInspectionDate ?? "");
  const [inspectorName, setInspectorName] = useState(props.initialInspectorName ?? "");
  const [orderQuantity, setOrderQuantity] = useState(props.initialOrderQuantity ? String(props.initialOrderQuantity) : "");
  const [results, setResults] = useState<ChecklistResults>(props.initialResults);
  const [busy, setBusy] = useState<"save" | "finish" | "reopen" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const readOnly = !props.canEdit || props.finished || props.cancelled || !props.start;

  const allKeys = props.checklist.flatMap((s) => s.items.map((_, i) => checklistItemKey(s.key, i)));
  const answered = allKeys.filter((k) => results[k]).length;
  const failedItems = allKeys.filter((k) => results[k]?.answer === "Fail").length;

  const lotSize = Number(orderQuantity);
  const aql = Number.isInteger(lotSize) && lotSize > 0 ? assessAql(lotSize, props.aql, props.defectCounts) : null;

  function setAnswer(key: string, answer: ChecklistAnswer) {
    setSaved(false);
    setResults((prev) => ({ ...prev, [key]: { ...prev[key], answer } }));
  }

  function setNote(key: string, note: string) {
    setSaved(false);
    setResults((prev) => {
      const current = prev[key];
      return current ? { ...prev, [key]: { ...current, note } } : prev;
    });
  }

  function markRestPass() {
    setSaved(false);
    setResults((prev) => {
      const next = { ...prev };
      for (const key of allKeys) next[key] ??= { answer: "Pass" };
      return next;
    });
  }

  async function submit(complete: boolean) {
    if (complete && !window.confirm("Finish this inspection and record the result? You can reopen it later if needed.")) {
      return;
    }
    setBusy(complete ? "finish" : "save");
    setError(null);
    setSaved(false);
    const res = await saveInspection({
      orderId: props.orderId,
      inspectionDate,
      inspectorName,
      orderQuantity,
      results,
      complete,
    });
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (!complete) setSaved(true);
    router.refresh();
  }

  async function reopen() {
    setBusy("reopen");
    setError(null);
    const res = await reopenInspection(props.orderId);
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {props.finished && props.inspectionResult ? (
        <section
          className={`flex flex-col gap-3 rounded-xl border px-6 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between ${
            props.inspectionResult === "Pass" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
          }`}
        >
          <div>
            <p
              className={`text-2xl font-bold tracking-tight ${
                props.inspectionResult === "Pass" ? "text-emerald-800" : "text-red-800"
              }`}
            >
              {props.inspectionResult === "Pass" ? "Passed" : "Failed"}
            </p>
            <p className="mt-1 text-sm text-slate-700">
              Inspected by {props.initialInspectorName ?? "—"}
              {props.completedAtUk ? ` · finished ${props.completedAtUk}` : ""}
            </p>
          </div>
          {props.canEdit ? (
            <button
              type="button"
              onClick={reopen}
              disabled={busy !== null}
              className="w-fit rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {busy === "reopen" ? "Reopening…" : "Reopen inspection"}
            </button>
          ) : null}
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#002147]">AQL sampling (ISO 2859-1)</h2>
          <p className="mt-1 text-sm text-slate-muted">
            Level {props.aql.level} · AQL {props.aql.critical} / {props.aql.major} / {props.aql.minor} (critical / major / minor)
          </p>
        </div>
        {aql ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    {["Defects", "AQL", "Sample size", "Accept up to", "Found", ""].map((h) => (
                      <th key={h} className="px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {aql.severities.map((s) => (
                    <tr key={s.severity}>
                      <td className="px-6 py-3 font-medium text-[#002147]">{s.severity}</td>
                      <td className="px-6 py-3 tabular-nums">{s.aql === 0 ? "0" : s.aql}</td>
                      <td className="px-6 py-3 tabular-nums">
                        {s.plan.sampleSize}
                        <span className="ml-1 text-xs text-slate-500">
                          ({s.plan.fullInspection ? "every unit" : `code ${s.plan.codeLetter}`})
                        </span>
                      </td>
                      <td className="px-6 py-3 tabular-nums">{s.plan.accept}</td>
                      <td className="px-6 py-3 font-semibold tabular-nums">{s.found}</td>
                      <td className="px-6 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${
                            s.passed ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                          }`}
                        >
                          {s.passed ? "OK" : "Over limit"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p
              className={`border-t border-slate-200 px-6 py-3 text-sm ${
                aql.passed && failedItems === 0 ? "text-slate-700" : "font-semibold text-red-800"
              }`}
            >
              {aql.passed && failedItems === 0
                ? "Within the AQL limits so far, and no checklist items have failed."
                : `This inspection will fail: ${[
                    aql.passed ? null : "defects are over the AQL limit",
                    failedItems > 0 ? `${failedItems} checklist ${failedItems === 1 ? "item has" : "items have"} failed` : null,
                  ]
                    .filter(Boolean)
                    .join(" and ")}.`}
            </p>
          </>
        ) : (
          <p className="px-6 py-4 text-sm text-slate-muted">Enter the order quantity below to work out the sample size.</p>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#002147]">Inspection</h2>
          {props.cancelled ? (
            <p className="mt-1 text-sm text-slate-muted">This booking is cancelled.</p>
          ) : !props.canEdit ? (
            <p className="mt-1 text-sm text-slate-muted">Only the person who booked this inspection can fill it in.</p>
          ) : !props.start && !props.finished ? (
            <p className="mt-1 text-sm text-slate-muted">Press Start inspection above to unlock the checklist.</p>
          ) : null}
          {props.start ? (
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-slate-700">
              <svg className="size-4 shrink-0 text-emerald-700" aria-hidden fill="none" viewBox="0 0 24 24">
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 21s-7-6.2-7-11.5A7 7 0 0112 2.5a7 7 0 017 7C19 14.8 12 21 12 21z"
                />
                <circle cx="12" cy="9.5" r="2.5" stroke="currentColor" strokeWidth={2} />
              </svg>
              <span>Started {props.start.startedAtUk} at</span>
              <a
                href={mapsUrl(props.start.latitude, props.start.longitude)}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-navy underline underline-offset-2"
              >
                {formatLocation(props.start.latitude, props.start.longitude, props.start.accuracyM)}
              </a>
            </p>
          ) : null}
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="inspection_date" className={labelCls}>
                Inspection date
              </label>
              <input
                id="inspection_date"
                type="date"
                max={todayLocal()}
                disabled={readOnly}
                value={inspectionDate}
                onFocus={() => setInspectionDate((v) => v || todayLocal())}
                onChange={(e) => {
                  setSaved(false);
                  setInspectionDate(e.target.value);
                }}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="inspector_name" className={labelCls}>
                Inspector
              </label>
              <input
                id="inspector_name"
                type="text"
                autoComplete="name"
                disabled={readOnly}
                value={inspectorName}
                onChange={(e) => {
                  setSaved(false);
                  setInspectorName(e.target.value);
                }}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="order_quantity" className={labelCls}>
                Order quantity (lot size)
              </label>
              <input
                id="order_quantity"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                disabled={readOnly}
                value={orderQuantity}
                onChange={(e) => {
                  setSaved(false);
                  setOrderQuantity(e.target.value);
                }}
                className={inputCls}
              />
            </div>
          </div>

          {props.checklist.length === 0 ? (
            <p className="text-sm text-slate-muted">This booking has no checklist. Log any defects below.</p>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-muted">
                  Checklist ({answered}/{allKeys.length})
                </p>
                {!readOnly ? (
                  <button
                    type="button"
                    onClick={markRestPass}
                    className="text-xs font-semibold text-navy underline-offset-2 hover:underline"
                  >
                    Mark the rest Pass
                  </button>
                ) : null}
              </div>
              {props.checklist.map((section) => (
                <fieldset key={section.key}>
                  <legend className="mb-2 text-sm font-semibold text-[#002147]">{section.title}</legend>
                  <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                    {section.items.map((item, i) => {
                      const key = checklistItemKey(section.key, i);
                      const entry = results[key];
                      return (
                        <li key={key} className="px-3 py-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-sm">{item}</span>
                            <div className="flex shrink-0 gap-1.5" role="radiogroup" aria-label={item}>
                              {CHECKLIST_ANSWERS.map((answer) => {
                                const selected = entry?.answer === answer;
                                return (
                                  <button
                                    key={answer}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    disabled={readOnly}
                                    onClick={() => setAnswer(key, answer)}
                                    className={`min-w-14 rounded-md border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-default ${
                                      selected
                                        ? answerStyles[answer]
                                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:hover:bg-white"
                                    }`}
                                  >
                                    {answer}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          {entry?.answer === "Fail" ? (
                            readOnly ? (
                              entry.note ? <p className="mt-2 text-sm text-red-800">{entry.note}</p> : null
                            ) : (
                              <input
                                type="text"
                                aria-label={`What failed: ${item}`}
                                placeholder="What failed?"
                                value={entry.note ?? ""}
                                onChange={(e) => setNote(key, e.target.value)}
                                className={`${inputCls} mt-2`}
                              />
                            )
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </fieldset>
              ))}
            </div>
          )}

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        {!readOnly ? (
          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50/80 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
            {saved ? (
              <span className="text-sm text-emerald-800 sm:mr-auto" role="status">
                Progress saved.
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => submit(false)}
              disabled={busy !== null}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {busy === "save" ? "Saving…" : "Save progress"}
            </button>
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={busy !== null}
              className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#00306a] disabled:opacity-60"
            >
              {busy === "finish" ? "Finishing…" : "Finish inspection"}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
