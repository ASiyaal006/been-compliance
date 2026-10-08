"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { createProductOrder } from "@/actions/create-product-order";
import type { BookingFormOptions } from "@/lib/data/product-inspection-queries";
import {
  AQL_INSPECTION_LEVELS,
  AQL_VALUES,
  DEFAULT_AQL,
  INSPECTION_STAGES,
  INSPECTION_STAGE_LABELS,
  type AqlInspectionLevel,
  type InspectionStage,
} from "@/lib/types/product-inspection";

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#002147] shadow-sm outline-none ring-navy/20 transition placeholder:text-slate-400 focus:border-navy/40 focus:ring-2";

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-muted">{label}</span>
        {hint ? <span className="mt-0.5 block text-[11px] text-slate-500">{hint}</span> : null}
      </label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-5 border-t border-slate-200 pt-6 first:border-t-0 first:pt-0">
      <legend className="mb-1 text-xs font-bold uppercase tracking-wider text-[#002147]">{title}</legend>
      {children}
    </fieldset>
  );
}

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function AqlSelect({ id, value, onChange }: { id: string; value: number; onChange: (v: number) => void }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(Number(e.target.value))} className={inputCls}>
      {AQL_VALUES.map((v) => (
        <option key={v} value={v}>
          {v === 0 ? "0 (none allowed)" : v}
        </option>
      ))}
    </select>
  );
}

export function NewProductOrderForm({ options }: { options: BookingFormOptions }) {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [stage, setStage] = useState<InspectionStage | "">("");
  const [targetDate, setTargetDate] = useState("");
  const [productName, setProductName] = useState("");
  const [reference, setReference] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("");
  const [factoryName, setFactoryName] = useState("");
  const [factoryAddress, setFactoryAddress] = useState("");
  const [factoryCity, setFactoryCity] = useState("");
  const [factoryCountry, setFactoryCountry] = useState("");
  const [factoryContact, setFactoryContact] = useState("");
  const [aqlLevel, setAqlLevel] = useState<AqlInspectionLevel>(DEFAULT_AQL.level);
  const [aqlCritical, setAqlCritical] = useState<number>(DEFAULT_AQL.critical);
  const [aqlMajor, setAqlMajor] = useState<number>(DEFAULT_AQL.major);
  const [aqlMinor, setAqlMinor] = useState<number>(DEFAULT_AQL.minor);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ownClientName = options.clients.find((c) => c.id === options.ownClientId)?.name;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stage) {
      setError("Choose the inspection stage.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await createProductOrder({
      clientId,
      categoryId,
      stage,
      targetDate,
      productName,
      reference,
      poNumber,
      orderQuantity,
      factoryName,
      factoryAddress,
      factoryCity,
      factoryCountry,
      factoryContact,
      aqlLevel,
      aqlCritical,
      aqlMajor,
      aqlMinor,
      notes,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.replace("/product-inspections?created=1");
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
      <div className="space-y-6 px-6 py-6">
        <Section title="Booking">
          <Field id="client" label="Client">
            {options.isAdmin ? (
              <select id="client" value={clientId} onChange={(e) => setClientId(e.target.value)} className={inputCls}>
                <option value="">No client (internal)</option>
                {options.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <p id="client" className="text-sm font-medium text-[#002147]">
                {ownClientName ?? "Your company"}
              </p>
            )}
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="stage" label="Inspection stage">
              <select
                id="stage"
                required
                value={stage}
                onChange={(e) => setStage(e.target.value as InspectionStage)}
                className={inputCls}
              >
                <option value="">Select stage</option>
                {INSPECTION_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {INSPECTION_STAGE_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="target_date" label="Target date">
              <input
                id="target_date"
                type="date"
                required
                min={todayLocal()}
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
        </Section>

        <Section title="Product">
          <Field id="category" label="Product category">
            <select
              id="category"
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={inputCls}
            >
              <option value="">Select category</option>
              {options.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field id="product_name" label="Product name">
            <input
              id="product_name"
              type="text"
              required
              placeholder="e.g. Men's cotton T-shirt, style 4021"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className={inputCls}
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field id="po_number" label="PO number">
              <input id="po_number" type="text" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} className={inputCls} />
            </Field>
            <Field id="order_quantity" label="Order quantity">
              <input
                id="order_quantity"
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={orderQuantity}
                onChange={(e) => setOrderQuantity(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field id="reference" label="Your reference">
              <input id="reference" type="text" value={reference} onChange={(e) => setReference(e.target.value)} className={inputCls} />
            </Field>
          </div>
        </Section>

        <Section title="Factory">
          <Field id="factory_name" label="Factory name">
            <input
              id="factory_name"
              type="text"
              required
              value={factoryName}
              onChange={(e) => setFactoryName(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field id="factory_address" label="Address">
            <textarea
              id="factory_address"
              rows={2}
              value={factoryAddress}
              onChange={(e) => setFactoryAddress(e.target.value)}
              className={`${inputCls} resize-y`}
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field id="factory_city" label="City">
              <input id="factory_city" type="text" value={factoryCity} onChange={(e) => setFactoryCity(e.target.value)} className={inputCls} />
            </Field>
            <Field id="factory_country" label="Country">
              <input
                id="factory_country"
                type="text"
                value={factoryCountry}
                onChange={(e) => setFactoryCountry(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field id="factory_contact" label="Contact">
              <input
                id="factory_contact"
                type="text"
                placeholder="Name, phone or email"
                value={factoryContact}
                onChange={(e) => setFactoryContact(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
        </Section>

        <Section title="AQL sampling (ISO 2859-1)">
          <p className="-mt-3 text-[11px] text-slate-500">
            Standard settings are level II with AQL 0 / 2.5 / 4.0. Only change these if the client asks.
          </p>
          <div className="grid gap-5 sm:grid-cols-4">
            <Field id="aql_level" label="Level">
              <select
                id="aql_level"
                value={aqlLevel}
                onChange={(e) => setAqlLevel(e.target.value as AqlInspectionLevel)}
                className={inputCls}
              >
                {AQL_INSPECTION_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="aql_critical" label="Critical">
              <AqlSelect id="aql_critical" value={aqlCritical} onChange={setAqlCritical} />
            </Field>
            <Field id="aql_major" label="Major">
              <AqlSelect id="aql_major" value={aqlMajor} onChange={setAqlMajor} />
            </Field>
            <Field id="aql_minor" label="Minor">
              <AqlSelect id="aql_minor" value={aqlMinor} onChange={setAqlMinor} />
            </Field>
          </div>
        </Section>

        <Section title="Notes">
          <Field id="notes" label="Special instructions (optional)">
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inputCls} resize-y`}
            />
          </Field>
        </Section>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50/80 px-6 py-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.push("/product-inspections")}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#00306a] disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save booking"}
        </button>
      </div>
    </form>
  );
}
