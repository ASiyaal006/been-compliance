import Link from "next/link";
import { fetchAllInspectionReports } from "@/lib/data/inspection-queries";
import { isFailureOutcome, isMonitorOutcome, isPassOutcome } from "@/lib/types/inspection";
import { isSupabaseConfigured } from "@/lib/supabase/env";

function OutcomeBadge({ outcome }: { outcome: string }) {
  if (isFailureOutcome(outcome)) {
    return (
      <span className="inline-flex rounded-full bg-danger-bg px-2.5 py-0.5 text-xs font-semibold text-danger ring-1 ring-danger/15">
        Fail
      </span>
    );
  }
  if (isMonitorOutcome(outcome)) {
    return (
      <span className="inline-flex rounded-full bg-amber-bg px-2.5 py-0.5 text-xs font-semibold text-amber ring-1 ring-amber/20">
        Monitor
      </span>
    );
  }
  if (isPassOutcome(outcome)) {
    return (
      <span className="inline-flex rounded-full bg-success-bg px-2.5 py-0.5 text-xs font-semibold text-success ring-1 ring-success/15">
        Pass
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
      {outcome}
    </span>
  );
}

export default async function InspectionReportsPage() {
  const configured = isSupabaseConfigured();
  let rows: Awaited<ReturnType<typeof fetchAllInspectionReports>> = [];
  let loadError: string | null = null;

  if (configured) {
    try {
      rows = await fetchAllInspectionReports();
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load inspection reports.";
    }
  }

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 shadow-sm md:px-8">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-[#002147]">Inspection reports</h1>
          <p className="hidden text-[12px] text-slate-muted sm:block">
            Full statutory history · all clients and assets
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
            <span className="font-semibold">Reports unavailable.</span> {loadError}
            <p className="mt-2 text-xs text-red-800">
              If you see a constraint error on outcome, run{" "}
              <span className="font-mono">supabase/migrations/20260503120000_inspection_outcomes.sql</span> in the
              Supabase SQL editor.
            </p>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-[#002147]">All inspection records</h2>
            <p className="text-sm text-slate-muted">
              {configured ? `${rows.length} reports on file` : "Connect Supabase to load reports"}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                    Date
                  </th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                    Asset ID
                  </th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                    Client
                  </th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                    Site
                  </th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                    Outcome
                  </th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                    Certificate ref
                  </th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-14 text-center text-sm text-slate-muted">
                      {configured
                        ? "No inspections logged yet. Open an asset and use Log inspection."
                        : "Database not configured."}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-6 py-3.5 font-medium tabular-nums text-[#002147]">
                        {row.inspectionDateUk}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3.5 font-mono text-[13px] font-medium">
                        {row.assetId ? (
                          <Link
                            href={`/assets/${encodeURIComponent(row.assetId)}`}
                            className="text-navy underline decoration-navy/30 underline-offset-2 hover:text-[#00306a]"
                          >
                            {row.assetLabel}
                          </Link>
                        ) : (
                          row.assetLabel
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-slate-muted">{row.clientName}</td>
                      <td className="px-6 py-3.5 text-slate-muted">{row.site}</td>
                      <td className="whitespace-nowrap px-6 py-3.5">
                        <OutcomeBadge outcome={row.outcome} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-3.5 font-mono text-xs text-slate-muted">
                        {row.reference}
                      </td>
                      <td className="max-w-[200px] truncate px-6 py-3.5 text-slate-muted" title={row.notesPreview}>
                        {row.notesPreview}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
