"use client";

import { useEffect, useState } from "react";
import { saveCertificate } from "@/actions/save-certificate";
import {
  parsedDocumentSchema,
  type ParsedDocumentData,
} from "@/lib/types/parsed-document";

type ApproveResult = { ok: true } | { ok: false; error: string };

type ParsedDocumentReviewFormProps = {
  data: ParsedDocumentData;
  filename?: string | null;
  onApprove: (data: ParsedDocumentData) => ApproveResult;
  onCancel: () => void;
  /** When true, Approve & Save inserts a row into public.certificates. */
  persistCertificate?: boolean;
  onPersisted?: (message: string) => void;
};

type ReviewField = {
  key: keyof ParsedDocumentData;
  label: string;
  options: readonly string[] | null;
  input: "text" | "date" | "textarea" | "select";
};

const inputClassName =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#002147] shadow-sm outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/20";

function fieldLabel(key: string): string {
  const spaced = key.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function enumOptions(field: object): readonly string[] | null {
  if (!("options" in field) || !Array.isArray(field.options)) return null;
  if (!field.options.every((option) => typeof option === "string")) return null;
  return field.options;
}

const REVIEW_FIELDS: ReviewField[] = (
  Object.keys(parsedDocumentSchema.shape) as (keyof ParsedDocumentData)[]
).map((key) => {
  const field = parsedDocumentSchema.shape[key];
  const options = enumOptions(field);
  const description = field.description ?? "";
  const input: ReviewField["input"] = options
    ? "select"
    : description.includes("YYYY-MM-DD")
      ? "date"
      : /notes/i.test(key)
        ? "textarea"
        : "text";

  return { key, label: fieldLabel(key), options, input };
});

function dateValue(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function sanitizeDraft(data: ParsedDocumentData): ParsedDocumentData {
  return {
    ...data,
    inspectionDate: dateValue(data.inspectionDate),
    expiryDate: dateValue(data.expiryDate),
  };
}

export function ParsedDocumentReviewForm({
  data,
  filename,
  onApprove,
  onCancel,
  persistCertificate = false,
  onPersisted,
}: ParsedDocumentReviewFormProps) {
  const [draft, setDraft] = useState<ParsedDocumentData>(() => sanitizeDraft(data));
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  useEffect(() => {
    setDraft(sanitizeDraft(data));
  }, [data]);

  function updateField(key: keyof ParsedDocumentData, value: string) {
    setSaved(false);
    setDuplicateWarning(null);
    setDraft((current) => ({ ...current, [key]: value }) as ParsedDocumentData);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setSaved(false);

    const result = onApprove(draft);
    if (!result.ok) {
      setFormError(result.error);
      setSubmitting(false);
      return;
    }

    if (!persistCertificate) {
      setSaved(true);
      setSubmitting(false);
      return;
    }

    const savedResult = await saveCertificate(draft, { allowDuplicate: duplicateWarning !== null });
    if (!savedResult.ok) {
      if (savedResult.duplicate) {
        setDuplicateWarning(savedResult.error);
      } else {
        setFormError(savedResult.error);
      }
      setSubmitting(false);
      return;
    }

    setDuplicateWarning(null);

    onPersisted?.(savedResult.message);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/40">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-muted">
          Human review
        </p>
        <h3 className="mt-1 text-sm font-semibold text-[#002147]">Check the extracted fields</h3>
        {filename ? <p className="mt-0.5 truncate text-xs text-slate-muted">{filename}</p> : null}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 px-4 py-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {REVIEW_FIELDS.map((field) => {
            const id = `parsed-${field.key}`;
            const value = draft[field.key];
            const wide = field.input === "textarea";

            return (
              <div key={field.key} className={wide ? "sm:col-span-2" : undefined}>
                <label
                  htmlFor={id}
                  className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-muted"
                >
                  {field.label}
                </label>

                {field.input === "select" && field.options ? (
                  <select
                    id={id}
                    name={field.key}
                    value={value}
                    onChange={(event) => updateField(field.key, event.target.value)}
                    className={inputClassName}
                  >
                    {(field.options.includes(value) ? field.options : [value, ...field.options]).map(
                      (option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ),
                    )}
                  </select>
                ) : field.input === "textarea" ? (
                  <textarea
                    id={id}
                    name={field.key}
                    rows={4}
                    value={value}
                    onChange={(event) => updateField(field.key, event.target.value)}
                    className={`${inputClassName} resize-y`}
                  />
                ) : (
                  <input
                    id={id}
                    name={field.key}
                    type={field.input}
                    value={value}
                    onChange={(event) => updateField(field.key, event.target.value)}
                    className={inputClassName}
                  />
                )}
              </div>
            );
          })}
        </div>

        {formError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
            {formError}
          </p>
        ) : null}

        {duplicateWarning ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
            {duplicateWarning}
          </p>
        ) : null}

        {saved ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
            Approved and saved.
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#00306a] disabled:opacity-60"
          >
            {submitting ? "Saving…" : duplicateWarning ? "Save anyway" : "Approve & Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
