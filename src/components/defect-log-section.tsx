"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createDefectLog, deleteDefectLog } from "@/actions/product-inspection";
import type { DefectRow } from "@/lib/data/product-inspection-queries";
import {
  DEFECT_PHOTOS_BUCKET,
  DEFECT_PHOTO_MAX_BYTES,
  defectPhotoPath,
  isDefectPhotoType,
} from "@/lib/defect-photos";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { DEFECT_SEVERITIES, type ChecklistSection, type DefectSeverity } from "@/lib/types/product-inspection";

const labelCls = "mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-muted";
const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/20";

const severityStyles: Record<DefectSeverity, { selected: string; badge: string }> = {
  Critical: { selected: "border-red-700 bg-red-700 text-white", badge: "bg-red-100 text-red-800" },
  Major: { selected: "border-orange-600 bg-orange-600 text-white", badge: "bg-orange-100 text-orange-800" },
  Minor: { selected: "border-amber-500 bg-amber-500 text-white", badge: "bg-amber-100 text-amber-900" },
};

const severityHints: Record<DefectSeverity, string> = {
  Critical: "Unsafe or breaks the law",
  Major: "Customer would likely return it",
  Minor: "Small flaw, still usable",
};

async function uploadPhoto(orderId: string, file: File): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in to upload photos." };

  const path = defectPhotoPath(user.id, orderId, file.type);
  const { error } = await supabase.storage.from(DEFECT_PHOTOS_BUCKET).upload(path, file, { contentType: file.type });
  if (error) {
    return {
      ok: false,
      error: /bucket not found/i.test(error.message)
        ? "Photo storage isn't set up yet. Run the product inspection results SQL in Supabase first."
        : `The photo could not be uploaded: ${error.message}`,
    };
  }
  return { ok: true, path };
}

type DialogProps = {
  orderId: string;
  sections: ChecklistSection[];
  open: boolean;
  onClose: () => void;
};

function LogDefectDialog({ orderId, sections, open, onClose }: DialogProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [severity, setSeverity] = useState<DefectSeverity | null>(null);
  const [section, setSection] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  function reset() {
    setSeverity(null);
    setSection("");
    setDescription("");
    setQuantity("1");
    setPhoto(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose() {
    dialogRef.current?.close();
    onClose();
  }

  function handlePhoto(file: File | null) {
    setError(null);
    if (file && !isDefectPhotoType(file.type)) {
      setError("Use a JPG, PNG or WebP photo.");
      setPhoto(null);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (file && file.size > DEFECT_PHOTO_MAX_BYTES) {
      setError("That photo is over 10 MB. Try a smaller one.");
      setPhoto(null);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setPhoto(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!severity) {
      setError("Choose Critical, Major or Minor.");
      return;
    }
    setBusy(true);
    setError(null);

    let photoPath: string | null = null;
    if (photo) {
      const up = await uploadPhoto(orderId, photo);
      if (!up.ok) {
        setBusy(false);
        setError(up.error);
        return;
      }
      photoPath = up.path;
    }

    const res = await createDefectLog({ orderId, severity, description, checklistSection: section, quantity, photoPath });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    reset();
    handleClose();
    router.refresh();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-0 text-[#002147] shadow-xl backdrop:bg-navy/40"
      aria-labelledby="log-defect-title"
    >
      <div className="border-b border-slate-200 bg-navy px-6 py-4 text-white">
        <h2 id="log-defect-title" className="text-lg font-semibold tracking-tight">
          Log a defect
        </h2>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="space-y-5 px-6 py-6">
          <fieldset>
            <legend className={labelCls}>Severity</legend>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Severity">
              {DEFECT_SEVERITIES.map((s) => {
                const selected = severity === s;
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setSeverity(s)}
                    className={`rounded-lg border px-2 py-2 text-left transition ${
                      selected ? severityStyles[s].selected : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <span className="block text-sm font-semibold">{s}</span>
                    <span className={`block text-[11px] ${selected ? "text-white/85" : "text-slate-500"}`}>
                      {severityHints[s]}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div>
            <label htmlFor="defect_description" className={labelCls}>
              What is wrong
            </label>
            <textarea
              id="defect_description"
              rows={3}
              required
              placeholder="e.g. Open seam at left side, 2 cm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputCls} resize-y`}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="defect_section" className={labelCls}>
                Checklist area
              </label>
              <select id="defect_section" value={section} onChange={(e) => setSection(e.target.value)} className={inputCls}>
                <option value="">Not specified</option>
                {sections.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="defect_quantity" className={labelCls}>
                Units with this defect
              </label>
              <input
                id="defect_quantity"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label htmlFor="defect_photo" className={labelCls}>
              Photo (optional)
            </label>
            <input
              ref={fileRef}
              id="defect_photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={(e) => handlePhoto(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-navy hover:file:bg-slate-200"
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
            {busy ? (photo ? "Uploading…" : "Saving…") : "Save defect"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

type Props = {
  orderId: string;
  sections: ChecklistSection[];
  defects: DefectRow[];
  canAdd: boolean;
};

export function DefectLogSection({ orderId, sections, defects, canAdd }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sectionTitles = new Map(sections.map((s) => [s.key, s.title]));

  async function handleDelete(id: string) {
    if (!window.confirm("Remove this defect?")) return;
    setDeleting(id);
    setError(null);
    const res = await deleteDefectLog(id);
    setDeleting(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#002147]">Defects</h2>
          <p className="mt-1 text-sm text-slate-muted">
            {defects.length === 0
              ? "No defects logged."
              : `${defects.reduce((n, d) => n + d.quantity, 0)} defective units logged`}
          </p>
        </div>
        {canAdd ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border-2 border-navy bg-white px-4 py-2.5 text-sm font-semibold text-navy hover:bg-navy hover:text-white"
          >
            <svg className="size-4" aria-hidden fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Log defect
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-900" role="alert">
          {error}
        </p>
      ) : null}

      {defects.length > 0 ? (
        <ul className="divide-y divide-slate-100">
          {defects.map((d) => (
            <li key={d.id} className="flex gap-4 px-6 py-4">
              {d.hasPhoto ? (
                <a href={`/api/defects/${d.id}/photo`} target="_blank" rel="noreferrer" className="shrink-0">
                  {/* Signed Storage links change each time, so next/image can't cache them. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/defects/${d.id}/photo`}
                    alt={`Photo: ${d.description}`}
                    className="size-20 rounded-lg border border-slate-200 object-cover"
                  />
                </a>
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${severityStyles[d.severity].badge}`}>
                    {d.severity}
                  </span>
                  <span className="text-xs text-slate-500">
                    {d.quantity} {d.quantity === 1 ? "unit" : "units"}
                    {d.checklistSection ? ` · ${sectionTitles.get(d.checklistSection) ?? d.checklistSection}` : ""}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-800">{d.description}</p>
              </div>
              {canAdd && d.canDelete ? (
                <button
                  type="button"
                  onClick={() => handleDelete(d.id)}
                  disabled={deleting === d.id}
                  className="h-fit shrink-0 text-xs font-semibold text-slate-500 hover:text-red-700 disabled:opacity-60"
                >
                  {deleting === d.id ? "Removing…" : "Remove"}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {canAdd ? (
        <LogDefectDialog orderId={orderId} sections={sections} open={open} onClose={() => setOpen(false)} />
      ) : null}
    </section>
  );
}
