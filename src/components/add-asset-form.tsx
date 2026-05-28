"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useMemo, useState } from "react";
import { createAssetRecord } from "@/actions/create-asset";
import type { MachineryTypeDb } from "@/lib/types/machinery";

const STEPS = [
  { key: 1, title: "Client & location", subtitle: "Who owns the asset and where it operates." },
  { key: 2, title: "Asset identity", subtitle: "Reference details and commissioning." },
  { key: 3, title: "Review & submit", subtitle: "Confirm before creating the inspection file stub." },
] as const;

const MACHINERY_TYPES = ["LOLER", "PSSR", "COSHH", "Other"] as const;

type FormState = {
  clientName: string;
  siteLocation: string;
  assetIdSerial: string;
  machineryType: (typeof MACHINERY_TYPES)[number] | "";
  commissioningDate: string;
};

const initialForm: FormState = {
  clientName: "",
  siteLocation: "",
  assetIdSerial: "",
  machineryType: "",
  commissioningDate: "",
};

function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-muted">{children}</span>
      {hint ? <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function AddAssetForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const stepValid = useMemo(() => {
    if (step === 1)
      return form.clientName.trim().length > 0 && form.siteLocation.trim().length > 0;
    if (step === 2)
      return (
        form.assetIdSerial.trim().length > 0 &&
        form.machineryType !== "" &&
        form.commissioningDate.trim().length > 0
      );
    return true;
  }, [form, step]);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    setSubmitError(null);
    setBusy(true);
    const res = await createAssetRecord({
      clientName: form.clientName,
      siteLocation: form.siteLocation,
      assetIdSerial: form.assetIdSerial,
      machineryType: form.machineryType as MachineryTypeDb,
      commissioningDate: form.commissioningDate,
    });
    setBusy(false);
    if (!res.ok) {
      setSubmitError(res.error);
      return;
    }
    router.replace("/assets?created=1");
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Step indicator */}
      <ol className="mb-8 flex gap-2 sm:gap-4" aria-label="Form progress">
        {STEPS.map((s) => {
          const active = step === s.key;
          const done = step > s.key;
          return (
            <li key={s.key} className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center gap-2">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    done
                      ? "bg-success text-white"
                      : active
                        ? "bg-navy text-white ring-2 ring-navy/20 ring-offset-2"
                        : "border border-slate-200 bg-white text-slate-muted"
                  }`}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? "✓" : s.key}
                </span>
                <span
                  className={`hidden min-w-0 truncate text-sm font-semibold sm:inline ${
                    active ? "text-[#002147]" : "text-slate-muted"
                  }`}
                >
                  {s.title}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4">
          <h2 className="text-base font-semibold text-[#002147]">{STEPS[step - 1]!.title}</h2>
          <p className="mt-1 text-sm text-slate-muted">{STEPS[step - 1]!.subtitle}</p>
        </div>

        <div className="px-6 py-6">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label htmlFor="clientName" className="block">
                  <FieldLabel>Client name</FieldLabel>
                </label>
                <input
                  id="clientName"
                  name="clientName"
                  type="text"
                  autoComplete="organization"
                  placeholder="e.g. CD Waste Ltd"
                  value={form.clientName}
                  onChange={(e) => patch("clientName", e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#002147] shadow-sm outline-none ring-navy/20 transition placeholder:text-slate-400 focus:border-navy/40 focus:ring-2"
                />
              </div>
              <div>
                <label htmlFor="siteLocation" className="block">
                  <FieldLabel>Site location</FieldLabel>
                </label>
                <input
                  id="siteLocation"
                  name="siteLocation"
                  type="text"
                  autoComplete="street-address"
                  placeholder="e.g. Bermondsey MRF, London"
                  value={form.siteLocation}
                  onChange={(e) => patch("siteLocation", e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#002147] shadow-sm outline-none ring-navy/20 transition placeholder:text-slate-400 focus:border-navy/40 focus:ring-2"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label htmlFor="assetIdSerial" className="block">
                  <FieldLabel hint="Use your internal asset code or manufacturer serial.">
                    Asset ID / serial number
                  </FieldLabel>
                </label>
                <input
                  id="assetIdSerial"
                  name="assetIdSerial"
                  type="text"
                  autoComplete="off"
                  placeholder="e.g. CDW-1098 or HL-UK-2022-90001"
                  value={form.assetIdSerial}
                  onChange={(e) => patch("assetIdSerial", e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm text-[#002147] shadow-sm outline-none ring-navy/20 transition placeholder:font-sans placeholder:text-slate-400 focus:border-navy/40 focus:ring-2"
                />
              </div>
              <div>
                <label htmlFor="machineryType" className="block">
                  <FieldLabel>Machinery type</FieldLabel>
                </label>
                <select
                  id="machineryType"
                  name="machineryType"
                  value={form.machineryType}
                  onChange={(e) =>
                    patch("machineryType", e.target.value as FormState["machineryType"])
                  }
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-[#002147] shadow-sm outline-none ring-navy/20 transition focus:border-navy/40 focus:ring-2"
                >
                  <option value="">Select regime</option>
                  {MACHINERY_TYPES.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="commissioningDate" className="block">
                  <FieldLabel>Commissioning date</FieldLabel>
                </label>
                <input
                  id="commissioningDate"
                  name="commissioningDate"
                  type="date"
                  value={form.commissioningDate}
                  onChange={(e) => patch("commissioningDate", e.target.value)}
                  className="w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#002147] shadow-sm outline-none ring-navy/20 transition focus:border-navy/40 focus:ring-2"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr] sm:items-baseline">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-muted">Client</dt>
                <dd className="text-sm font-medium text-[#002147]">{form.clientName}</dd>
              </div>
              <div className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr] sm:items-baseline">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-muted">Site</dt>
                <dd className="text-sm font-medium text-[#002147]">{form.siteLocation}</dd>
              </div>
              <div className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr] sm:items-baseline">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                  Asset ID / serial
                </dt>
                <dd className="font-mono text-sm font-medium text-[#002147]">{form.assetIdSerial}</dd>
              </div>
              <div className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr] sm:items-baseline">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                  Machinery type
                </dt>
                <dd className="text-sm font-medium text-[#002147]">{form.machineryType}</dd>
              </div>
              <div className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr] sm:items-baseline">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                  Commissioning
                </dt>
                <dd className="text-sm font-medium tabular-nums text-[#002147]">{form.commissioningDate}</dd>
              </div>
            </dl>
          )}
        </div>

        {submitError && step === 3 ? (
          <div
            className="border-t border-red-200 bg-red-50 px-6 py-3 text-sm leading-relaxed text-red-900"
            role="alert"
          >
            <span className="font-semibold">Could not save.</span> {submitError}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Back
              </button>
            ) : (
              <Link
                href="/assets"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Cancel
              </Link>
            )}
          </div>
          <div className="flex gap-2">
            {step < 3 ? (
              <button
                type="button"
                disabled={!stepValid}
                onClick={() => stepValid && setStep((s) => s + 1)}
                className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00306a] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={handleSubmit}
                className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00306a] disabled:cursor-wait disabled:opacity-70"
              >
                {busy ? "Submitting…" : "Create asset record"}
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-slate-muted">
        When Supabase credentials are configured, submitting creates rows in{" "}
        <span className="font-mono text-[11px]">clients</span> and{" "}
        <span className="font-mono text-[11px]">assets</span>; duplicate references per client are rejected.
      </p>
    </div>
  );
}
