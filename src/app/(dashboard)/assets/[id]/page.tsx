import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AssetQrTag } from "@/components/asset-qr-tag";
import { AssetInspectionDocument } from "@/components/asset-inspection-document";
import { publicAssetUrl } from "@/lib/site-url";
import {
  fetchAssetInspectionViewModel,
  fetchLegacyInspectionViewModel,
  looksLikeUuid,
} from "@/lib/data/asset-queries";
import { decodeAssetIdParam } from "@/lib/assets";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type Props = { params: Promise<{ id: string }> };

async function resolveViewModel(rawId: string) {
  if (looksLikeUuid(rawId) && isSupabaseConfigured()) {
    const vm = await fetchAssetInspectionViewModel(rawId.trim());
    if (vm) return vm;
    return null;
  }

  return fetchLegacyInspectionViewModel(rawId);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const raw = decodeAssetIdParam(id);
  const vm = await resolveViewModel(raw);
  if (!vm) return { title: "Asset not found · Been Compliance" };
  return {
    title: `${vm.headlineId} · Inspection file · Been Compliance`,
    description: `Formal inspection record for ${vm.machineryTypeLabel} (${vm.clientName}).`,
  };
}

export default async function AssetInspectionFilePage({ params }: Props) {
  const { id } = await params;
  const rawId = decodeAssetIdParam(id);
  const model = await resolveViewModel(rawId);
  if (!model) notFound();

  const dbAssetId =
    looksLikeUuid(rawId) && isSupabaseConfigured() ? rawId.trim() : null;

  return (
    <>
      <header className="sticky top-0 z-10 flex h-auto min-h-16 shrink-0 flex-col gap-2 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-0 md:px-8">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <Link
            href="/dashboard"
            className="inline-flex w-fit shrink-0 items-center gap-1.5 text-xs font-semibold text-slate-muted transition-colors hover:text-navy"
          >
            <svg className="size-4" aria-hidden fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </Link>
          <span className="hidden h-8 w-px shrink-0 bg-slate-200 sm:block" aria-hidden />
          <div className="min-w-0">
            <h1 className="break-words font-mono text-xl font-semibold tracking-tight text-[#002147] sm:text-2xl">
              <span>{model.headlineId}</span>
            </h1>
            <p className="mt-0.5 truncate text-sm text-[#002147]/90">
              Inspection file ·{" "}
              <span className="font-semibold">{model.machineryTypeLabel}</span>
              <span className="text-slate-muted"> · </span>
              <span className="text-slate-muted">{model.clientName}</span>
              <span className="text-slate-muted"> · Ref </span>
              <span className="font-mono font-medium">{model.fileReference}</span>
            </p>
          </div>
        </div>
        <button
          type="button"
          className="flex size-10 shrink-0 items-center justify-center self-end rounded-full bg-navy text-xs font-semibold text-white shadow-sm ring-2 ring-white sm:self-auto"
          aria-label="Profile"
        >
          BC
        </button>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {dbAssetId ? (
            <AssetQrTag assetLabel={model.headlineId} publicUrl={publicAssetUrl(dbAssetId)} />
          ) : null}
          <AssetInspectionDocument model={model} assetId={dbAssetId} />
        </div>
      </main>
    </>
  );
}
