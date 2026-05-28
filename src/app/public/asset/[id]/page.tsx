import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { decodeAssetIdParam } from "@/lib/assets";
import { fetchPublicAssetProfile } from "@/lib/data/public-asset-queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type Props = { params: Promise<{ id: string }> };

const safetyStyles = {
  safe: {
    banner: "bg-success text-white",
    ring: "ring-success/25",
    icon: "✓",
  },
  unsafe: {
    banner: "bg-danger text-white",
    ring: "ring-danger/25",
    icon: "✕",
  },
  monitor: {
    banner: "bg-amber-500 text-white",
    ring: "ring-amber/30",
    icon: "!",
  },
  unknown: {
    banner: "bg-slate-600 text-white",
    ring: "ring-slate-300",
    icon: "?",
  },
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const raw = decodeAssetIdParam(id);
  const profile = isSupabaseConfigured() ? await fetchPublicAssetProfile(raw) : null;
  return {
    title: profile ? `${profile.serial} · Been Compliance` : "Asset · Been Compliance",
    description: "Public compliance status for registered plant and machinery.",
    robots: { index: false, follow: false },
  };
}

export default async function PublicAssetPage({ params }: Props) {
  const { id } = await params;
  const rawId = decodeAssetIdParam(id);

  if (!isSupabaseConfigured()) {
    notFound();
  }

  const profile = await fetchPublicAssetProfile(rawId);
  if (!profile) notFound();

  const style = safetyStyles[profile.safetyStatus];

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-muted">
          Been Compliance
        </p>
        <p className="mt-1 text-xs text-slate-muted">Public asset compliance tag</p>
      </header>

      <main className="flex flex-1 flex-col">
        <section
          className={`overflow-hidden rounded-2xl shadow-lg ring-4 ${style.ring}`}
          aria-labelledby="safety-headline"
        >
          <div className={`px-6 py-8 text-center ${style.banner}`}>
            <span
              className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-white/20 text-3xl font-bold"
              aria-hidden
            >
              {style.icon}
            </span>
            <h1 id="safety-headline" className="text-2xl font-bold uppercase tracking-wide sm:text-3xl">
              {profile.safetyHeadline}
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/90">
              {profile.safetyDetail}
            </p>
          </div>

          <div className="border-t border-slate-200 bg-white px-6 py-6">
            <dl className="space-y-4">
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-muted">
                  Asset ID / serial
                </dt>
                <dd className="text-right font-mono text-sm font-semibold text-[#002147]">
                  {profile.serial}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-muted">
                  Machinery type
                </dt>
                <dd className="text-right text-sm font-medium text-[#002147]">{profile.machineryType}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-muted">SWL / capacity</dt>
                <dd className="text-right text-sm font-medium text-[#002147]">{profile.swl}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-muted">Site</dt>
                <dd className="text-right text-sm font-medium text-[#002147]">{profile.siteLocation}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-muted">
                  Latest outcome
                </dt>
                <dd className="text-right text-sm font-semibold text-[#002147]">{profile.outcomeLabel}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-muted">
                  Next inspection due
                </dt>
                <dd className="text-right text-sm font-semibold tabular-nums text-[#002147]">
                  {profile.nextDueUk}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-muted">
          This page is for on-site verification only. It does not replace the full statutory inspection file.
          For queries contact{" "}
          <a href="https://beencompliance.com" className="font-semibold text-navy underline-offset-2 hover:underline">
            beencompliance.com
          </a>
          .
        </p>
      </main>

      <footer className="mt-8 border-t border-slate-200 pt-4 text-center text-[10px] uppercase tracking-wider text-slate-400">
        Been Compliance · TICC Platform
      </footer>
    </div>
  );
}
