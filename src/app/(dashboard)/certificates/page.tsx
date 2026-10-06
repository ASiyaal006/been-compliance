import Link from "next/link";
import { CertificatesPageUpload } from "@/components/certificates-page-upload";
import { fetchAllInspectionReports, fetchSavedCertificates } from "@/lib/data/inspection-queries";
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

export default async function CertificatesPage() {
  const configured = isSupabaseConfigured();
  let rows: Awaited<ReturnType<typeof fetchAllInspectionReports>> = [];
  let loadError: string | null = null;

  if (configured) {
    try {
      const [inspections, saved] = await Promise.all([
        fetchAllInspectionReports(),
        fetchSavedCertificates(),
      ]);
      rows = [...inspections, ...saved].sort((a, b) =>
        b.inspectionDateIso.localeCompare(a.inspectionDateIso),
      );
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load certificates.";
    }
  }

  const withReference = rows.filter(
    (row) => row.source === "uploaded" || row.reference.trim().length > 0,
  );

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 shadow-sm md:px-8">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-[#002147]">Certificates</h1>
          <p className="hidden text-[12px] text-slate-muted sm:block">
            Parse incoming certificates · issued inspection records on file
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

      <CertificatesPageUpload />

      <main className="flex-1 overflow-auto p-4 md:p-8">
        {loadError ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
            <span className="font-semibold">Certificates unavailable.</span> {loadError}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-[#002147]">Issued certificates</h2>
            <p className="text-sm text-slate-muted">
              {configured
                ? `${withReference.length} certificate references on file`
                : "Connect Supabase to load certificates"}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                    Certificate ref
                  </th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                    Asset ID
                  </th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                    Inspection date
                  </th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                    Outcome
                  </th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                    Source
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {withReference.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-14 text-center text-sm text-slate-muted">
                      {configured
                        ? "No certificate references yet. Parse a document above or log an inspection on an asset."
                        : "Database not configured."}
                    </td>
                  </tr>
                ) : (
                  withReference.map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-6 py-3.5 font-mono text-xs font-medium text-[#002147]">
                        {row.reference}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3.5 font-mono text-[13px]">
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
                      <td className="whitespace-nowrap px-6 py-3.5 tabular-nums text-slate-muted">
                        {row.inspectionDateUk}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3.5">
                        <OutcomeBadge outcome={row.outcome} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-3.5 text-[13px] text-slate-muted">
                        {row.source === "uploaded" ? "Uploaded" : "Inspection"}
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
