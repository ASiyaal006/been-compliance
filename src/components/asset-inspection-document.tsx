import { AssetDetailToolbar } from "@/components/asset-detail-toolbar";
import { AssetInspectionHistory } from "@/components/asset-inspection-history";
import type { AssetInspectionViewModel } from "@/lib/data/asset-queries";

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 py-3 last:border-0 sm:grid sm:grid-cols-[minmax(0,11rem)_1fr] sm:items-baseline sm:gap-8">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-muted">{label}</dt>
      <dd className="text-sm font-medium text-[#002147]">{value}</dd>
    </div>
  );
}

function HeroBadge({ badge }: { badge: AssetInspectionViewModel["badge"] }) {
  if (badge.kind === "registered") {
    return (
      <span className="inline-flex w-fit max-w-full rounded-md border border-white/25 bg-amber-500 px-4 py-2.5 text-center text-[12px] font-bold uppercase leading-snug tracking-wide text-white shadow-lg sm:px-5 sm:text-[13px]">
        {badge.text}
      </span>
    );
  }
  if (badge.kind === "defect") {
    return (
      <span className="inline-flex w-fit rounded-md border border-white/20 bg-danger px-5 py-2.5 text-center text-[13px] font-bold uppercase tracking-wide text-white shadow-lg">
        {badge.text}
      </span>
    );
  }
  if (badge.kind === "monitor") {
    return (
      <span className="inline-flex w-fit rounded-md border border-white/20 bg-amber-500 px-5 py-2.5 text-center text-[13px] font-bold uppercase tracking-wide text-white shadow-lg">
        {badge.text}
      </span>
    );
  }
  return (
    <span className="inline-flex w-fit rounded-md border border-white/20 bg-success px-5 py-2.5 text-center text-[13px] font-bold uppercase tracking-wide text-white shadow-lg">
      {badge.text}
    </span>
  );
}

export function AssetInspectionDocument({
  model,
  assetId = null,
}: {
  model: AssetInspectionViewModel;
  assetId?: string | null;
}) {
  const history = model.inspectionHistory.length > 0 ? model.inspectionHistory : model.timeline.map((e) => ({
    date: e.date,
    outcome: e.outcome,
    reference: e.reference,
    examinerNotes: "",
  }));

  return (
    <article className="mx-auto max-w-3xl overflow-hidden border border-slate-200 bg-white shadow-sm">
      <div className="border-l-4 border-navy bg-navy px-6 py-5 text-white">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">
          Been Compliance · Formal inspection record
        </p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-white/65">Machine / asset identifier</p>
            <p className="break-words font-mono text-2xl font-bold tracking-tight md:text-4xl">{model.headlineId}</p>
            <p className="mt-2 text-sm text-white/85">
              {model.machineryTypeLabel} · {model.siteLocation}
            </p>
          </div>
          <HeroBadge badge={model.badge} />
        </div>
      </div>

      <div className="border-b border-slate-200 px-6 py-4">
        <dl className="grid gap-x-10 gap-y-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-4 border-b border-slate-100 py-2 sm:border-0">
            <dt className="text-slate-muted">File reference</dt>
            <dd className="text-right font-mono font-medium text-[#002147] sm:text-left">{model.fileReference}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-slate-100 py-2 sm:border-0">
            <dt className="text-slate-muted">Inspection date</dt>
            <dd className="font-medium text-[#002147]">{model.inspectionDateLine}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-slate-100 py-2 sm:border-0">
            <dt className="text-slate-muted">Next due</dt>
            <dd className="font-medium text-[#002147]">{model.nextDueLine}</dd>
          </div>
          <div className="flex justify-between gap-4 py-2">
            <dt className="text-slate-muted">Client</dt>
            <dd className="text-right font-medium text-[#002147] sm:text-left">{model.clientName}</dd>
          </div>
        </dl>
      </div>

      {assetId ? (
        <div className="flex flex-col items-stretch gap-2 border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-muted">
            Record a statutory visit outcome — saved to Supabase and reflected in Inspection Reports.
          </p>
          <AssetDetailToolbar assetId={assetId} assetLabel={model.headlineId} />
        </div>
      ) : null}

      <AssetInspectionHistory history={history} model={model} />

      <div className="border-t border-slate-200 px-6 py-6">
        <h2 className="border-b border-navy/15 pb-2 text-xs font-bold uppercase tracking-widest text-[#002147]">
          Technical specifications
        </h2>
        <dl className="mt-1">
          <SpecRow label="Commissioning date" value={model.commissioningLine} />
          <SpecRow label="Serial number" value={model.serialLine} />
          <SpecRow label="SWL / capacity" value={model.swlLine} />
          <SpecRow label="Last test date" value={model.lastTestDateLine} />
        </dl>
      </div>

      <div className="border-t border-slate-200 bg-slate-50/40 px-6 py-6">
        <h2 className="border-b border-navy/15 pb-2 text-xs font-bold uppercase tracking-widest text-[#002147]">
          Inspector&apos;s notes
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-slate-700">{model.inspectorNotes}</p>

        <h3 className="mt-8 text-[11px] font-bold uppercase tracking-widest text-slate-muted">Evidence photos</h3>
        <p className="mt-2 text-sm text-slate-muted">
          Attach labelled site photos supporting this assessment. Accepted formats: JPG, PNG · max 25 MB each.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            >
              Evidence {n}
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
