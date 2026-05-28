import Link from "next/link";
import { fetchRegisterAssets } from "@/lib/data/asset-queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { withTimeout } from "@/lib/with-timeout";

type SearchParams = Record<string, string | string[] | undefined>;

function readCreatedFlag(searchParams: SearchParams): boolean {
  const v = searchParams.created;
  if (Array.isArray(v)) return v.includes("1");
  return v === "1";
}

export default async function AssetRegisterPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const configured = isSupabaseConfigured();
  const sp = await (searchParams ?? Promise.resolve({} as SearchParams));
  const showCreated = readCreatedFlag(sp);

  let rows: Awaited<ReturnType<typeof fetchRegisterAssets>> = [];
  let loadError: string | null = null;

  if (configured) {
    try {
      rows = await withTimeout(fetchRegisterAssets(), "Loading asset register");
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load asset register.";
    }
  }

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 shadow-sm md:px-8">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-[#002147]">Asset register</h1>
          <p className="hidden text-[12px] text-slate-muted sm:block">
            {configured ? "Supabase-backed register" : "Awaiting database credentials"}
          </p>
        </div>
        <button
          type="button"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white shadow-sm ring-2 ring-white"
          aria-label="Profile"
        >
          BC
        </button>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-8">
        {loadError ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
            <span className="font-semibold">Register unavailable.</span> {loadError}
          </div>
        ) : null}

        {showCreated && configured && !loadError ? (
          <div
            className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-sm"
            role="status"
          >
            <span className="font-semibold">Asset saved.</span>{" "}
            <span className="text-emerald-800">Stored in Supabase — refresh-safe.</span>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#002147]">All tracked assets</h2>
              <p className="text-sm text-slate-muted">{rows.length} assets in portfolio</p>
            </div>
            <Link
              href="/assets/new"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00306a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              <svg className="size-4 shrink-0" aria-hidden fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add asset
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                    Asset ID
                  </th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                    Machinery type
                  </th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                    Site
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-sm text-slate-muted">
                      {configured
                        ? "No assets in the database yet."
                        : "Connect Supabase to load your live register."}{" "}
                      <Link href="/assets/new" className="font-semibold text-navy underline-offset-2 hover:underline">
                        Add the first machine
                      </Link>
                      .
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-6 py-3.5 font-mono text-[13px] font-medium">
                        <Link
                          href={`/assets/${encodeURIComponent(row.id)}`}
                          className="text-navy underline decoration-navy/30 underline-offset-2 transition-colors hover:text-[#00306a] hover:decoration-navy"
                        >
                          {row.assetLabel}
                        </Link>
                      </td>
                      <td className="px-6 py-3.5 text-slate-muted">{row.machineryType}</td>
                      <td className="px-6 py-3.5 text-slate-muted">{row.site}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-6 py-3">
            <Link href="/" className="text-xs font-semibold text-navy underline-offset-2 hover:underline">
              ← Back to dashboard
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
