import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AssetInspectionHistory } from "@/components/asset-inspection-history";
import { fetchAssetInspectionViewModel, looksLikeUuid } from "@/lib/data/asset-queries";
import { fetchSavedCertificates } from "@/lib/data/inspection-queries";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Equipment certificates · Been Compliance" };

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-0">
      <dt className="text-slate-muted">{label}</dt>
      <dd className="text-right font-medium text-[#002147]">{value}</dd>
    </div>
  );
}

export default async function PortalAssetPage({ params }: Props) {
  const { id } = await params;
  if (!looksLikeUuid(id)) notFound();
  const assetId = id.trim();

  // RLS only returns the asset if it belongs to the signed-in customer.
  const [model, uploaded] = await Promise.all([
    fetchAssetInspectionViewModel(assetId),
    fetchSavedCertificates().catch(() => []),
  ]);
  if (!model) notFound();
  const files = uploaded.filter((c) => c.assetId === assetId && c.hasFile);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-6 md:px-8 md:py-8">
      <Link
        href="/portal"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-muted transition-colors hover:text-navy"
      >
        <svg className="size-4" aria-hidden fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        All equipment
      </Link>

      <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-navy px-6 py-5 text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">Equipment</p>
          <p className="mt-2 break-words font-mono text-2xl font-bold tracking-tight">{model.headlineId}</p>
          <p className="mt-1 text-sm text-white/85">
            {model.machineryTypeLabel} · {model.siteLocation}
          </p>
          <p className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold tracking-wide">
            {model.badge.text}
          </p>
        </div>

        <dl className="border-b border-slate-200 px-6 py-3">
          <Row label="Last inspected" value={model.inspectionDateLine} />
          <Row label="Next due" value={model.nextDueLine} />
          <Row label="Make / model" value={model.descriptionLine} />
          <Row label="SWL / capacity" value={model.swlLine} />
        </dl>

        <AssetInspectionHistory history={model.inspectionHistory} model={model} />

        {files.length > 0 ? (
          <div className="border-t border-slate-200 px-6 py-6">
            <h2 className="border-b border-navy/15 pb-2 text-xs font-bold uppercase tracking-widest text-[#002147]">
              Certificate files
            </h2>
            <ul className="mt-3 divide-y divide-slate-100">
              {files.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-medium text-[#002147]">{c.reference}</p>
                    <p className="text-xs text-slate-muted">{c.inspectionDateUk}</p>
                  </div>
                  <a
                    href={`/api/certificates/${c.certificateId}/file`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-sm font-semibold text-navy underline-offset-2 hover:underline"
                  >
                    Download
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </article>
    </main>
  );
}
