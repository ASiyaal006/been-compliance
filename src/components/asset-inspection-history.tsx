import type { AssetInspectionViewModel, InspectionHistoryRecord } from "@/lib/data/asset-queries";
import { buildCertificatePdfData } from "@/lib/types/certificate";
import { InspectionCertificateButton } from "@/components/inspection-certificate-button";

function HistoryEntry({
  entry,
  isLatest,
  isLast,
  certificateData,
}: {
  entry: InspectionHistoryRecord;
  isLatest: boolean;
  isLast: boolean;
  certificateData: ReturnType<typeof buildCertificatePdfData>;
}) {
  const fail = entry.outcome === "Fail" || entry.outcome === "Defect";
  const monitor = entry.outcome === "Monitor";
  const hasReference = Boolean(entry.reference && entry.reference !== "—");

  return (
    <li className={`relative pl-8 ${isLast ? "pb-0" : "pb-10"}`}>
      {!isLast ? (
        <span className="absolute left-[5px] top-3 bottom-0 w-px bg-slate-200" aria-hidden />
      ) : null}
      <span
        className={`absolute left-0 top-1 size-3 rounded-full ring-4 ring-white ${
          fail ? "bg-danger" : monitor ? "bg-amber-500" : "bg-success"
        }`}
        aria-hidden
      />
      <div className={`min-w-0 ${isLast ? "pb-0" : "border-b border-slate-100 pb-8"}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2 gap-y-1">
              <time className="text-sm font-semibold tabular-nums text-[#002147]">{entry.date}</time>
              {isLatest ? (
                <span className="rounded bg-navy/10 px-1.5 py-0 text-[10px] font-bold uppercase tracking-wide text-navy">
                  Latest
                </span>
              ) : null}
            </div>
            <p className="mt-1 font-mono text-xs font-medium text-slate-muted">{entry.reference}</p>
            <span
              className={
                fail
                  ? "mt-2 inline-flex rounded-full bg-danger-bg px-2 py-0.5 text-[11px] font-semibold text-danger ring-1 ring-danger/15"
                  : monitor
                    ? "mt-2 inline-flex rounded-full bg-amber-bg px-2 py-0.5 text-[11px] font-semibold text-amber ring-1 ring-amber/20"
                    : "mt-2 inline-flex rounded-full bg-success-bg px-2 py-0.5 text-[11px] font-semibold text-success ring-1 ring-success/15"
              }
            >
              {entry.outcome}
            </span>
            {entry.examinerNotes ? (
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{entry.examinerNotes}</p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-muted sm:text-right">
              Actions
            </span>
            {hasReference ? (
              <InspectionCertificateButton data={certificateData} compact />
            ) : (
              <span
                className="inline-flex items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-muted"
                title="Add a certificate reference to enable download"
              >
                No reference on file
              </span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

export function AssetInspectionHistory({
  history,
  model,
}: {
  history: InspectionHistoryRecord[];
  model: AssetInspectionViewModel;
}) {
  const certContext = {
    assetIdSerial: model.serialLine,
    machineryType: model.machineryTypeLabel,
    siteLocation: model.siteLocation,
    swl: model.swlLine,
    clientName: model.clientName,
    nextInspectionDue: model.nextDueLine,
  };

  return (
    <div className="px-6 py-6">
      <h2 className="border-b border-navy/15 pb-2 text-xs font-bold uppercase tracking-widest text-[#002147]">
        Inspection history
      </h2>
      <p className="mt-3 text-sm text-slate-muted">
        Statutory inspections recorded for this asset. Use{" "}
        <span className="font-semibold text-navy">Download certificate</span> to save a formal PDF for any
        visit with a reference on file.
      </p>

      {history.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center text-sm text-slate-muted">
          No inspections on file yet. Once site visits complete, outcomes show here chronologically — most
          recent first.
        </p>
      ) : (
        <ol className="relative mx-2 mt-6 list-none" aria-label="Inspection history">
          {history.map((entry, idx) => (
            <HistoryEntry
              key={`${entry.reference}-${entry.date}-${idx}`}
              entry={entry}
              isLatest={idx === 0}
              isLast={idx === history.length - 1}
              certificateData={buildCertificatePdfData(entry, certContext)}
            />
          ))}
        </ol>
      )}
    </div>
  );
}
