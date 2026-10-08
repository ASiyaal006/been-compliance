import Link from "next/link";
import type { ReactNode } from "react";
import { PrintReportButton } from "@/components/print-report-button";
import { assessAql } from "@/lib/aql";
import type { ProductOrderDetail } from "@/lib/data/product-inspection-queries";
import {
  INSPECTION_STAGE_LABELS,
  checklistItemKey,
  type DefectSeverity,
} from "@/lib/types/product-inspection";

/** A4 pages for this report only; the dashboard chrome is hidden with print:hidden in the layout. */
const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 12mm; }
  html, body { background: #fff !important; }
  .report-sheet { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .report-keep { break-inside: avoid; page-break-inside: avoid; }
}
`;

const severityBadge: Record<DefectSeverity, string> = {
  Critical: "bg-red-700 text-white",
  Major: "bg-orange-600 text-white",
  Minor: "bg-amber-400 text-[#002147]",
};

function formatUk(ymd: string | null): string {
  const m = ymd ? /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd) : null;
  if (!m) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))),
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-[13px] font-medium text-[#002147]">{children}</dd>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#002147]">
      <span className="h-3 w-1 rounded-full bg-[#002147]" aria-hidden />
      {children}
    </h2>
  );
}

function DefectGrid({
  defects,
  start,
  photoUrls,
  checklist,
}: {
  defects: ProductOrderDetail["defects"];
  start: number;
  photoUrls: Record<string, string>;
  checklist: ProductOrderDetail["checklist"];
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 print:grid-cols-3">
      {defects.map((d, i) => {
        const photo = photoUrls[d.id];
        const area = checklist.find((s) => s.key === d.checklistSection)?.title;
        return (
          <figure key={d.id} className="report-keep overflow-hidden rounded-lg border border-slate-200">
            {photo ? (
              // Signed Storage links expire, so next/image can't cache them.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt={d.description} className="aspect-[4/3] w-full bg-slate-100 object-cover" />
            ) : (
              <div className="flex aspect-[4/3] w-full items-center justify-center bg-slate-50 text-[11px] text-slate-400">
                No photo
              </div>
            )}
            <figcaption className="space-y-1 p-3">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${severityBadge[d.severity]}`}
                >
                  {d.severity}
                </span>
                <span className="text-[10px] text-slate-500">
                  #{start + i + 1} · {d.quantity} {d.quantity === 1 ? "unit" : "units"}
                </span>
              </div>
              <p className="text-[12px] leading-snug text-slate-800">{d.description}</p>
              {area ? <p className="text-[10px] text-slate-500">{area}</p> : null}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}


/** The client-facing report for one product inspection, laid out for A4 printing. */
export function ProductInspectionReport({
  order,
  photoUrls,
}: {
  order: ProductOrderDetail;
  /** Signed photo links keyed by defect id. */
  photoUrls: Record<string, string>;
}) {
  const found: Record<DefectSeverity, number> = { Critical: 0, Major: 0, Minor: 0 };
  for (const d of order.defects) found[d.severity] += d.quantity;

  const lotSize = order.orderQuantity ?? 0;
  const aql = lotSize > 0 ? assessAql(lotSize, order.aql, found) : null;

  const sections = order.checklist.map((section) => {
    const items = section.items.map((item, i) => ({ item, ...order.checklistResults[checklistItemKey(section.key, i)] }));
    return {
      ...section,
      pass: items.filter((i) => i.answer === "Pass").length,
      fail: items.filter((i) => i.answer === "Fail"),
      na: items.filter((i) => i.answer === "N/A").length,
      open: items.filter((i) => !i.answer).length,
    };
  });
  const failedItems = sections.reduce((n, s) => n + s.fail.length, 0);

  const finished = order.status === "Report issued" && order.inspectionResult !== null;
  const result: "Pass" | "Fail" | null = finished
    ? order.inspectionResult
    : aql
      ? aql.passed && failedItems === 0
        ? "Pass"
        : "Fail"
      : null;

  const reportNo = `BC-PI-${order.id.slice(0, 8).toUpperCase()}`;
  const fileName = `Inspection report ${reportNo} ${order.productName}`.replace(/[\\/:*?"<>|]+/g, " ");
  const passed = result === "Pass";

  return (
    <>
      <style>{PRINT_CSS}</style>

      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 shadow-sm md:px-8 print:hidden">
        <Link
          href={`/product-inspections/${order.id}`}
          className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-slate-muted transition-colors hover:text-navy"
        >
          <svg className="size-4" aria-hidden fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to inspection
        </Link>
        <PrintReportButton fileName={fileName} />
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-8 print:overflow-visible print:p-0">
        {!finished ? (
          <p
            className="mx-auto mb-4 max-w-[210mm] rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 print:hidden"
            role="status"
          >
            This inspection isn&apos;t finished yet, so the report is marked <strong>Draft</strong>. Click &quot;Finish
            inspection&quot; on the inspection page to issue the final report.
          </p>
        ) : null}

        <article className="report-sheet mx-auto max-w-[210mm] overflow-hidden rounded-xl bg-white text-[#002147] shadow-lg ring-1 ring-slate-200 print:max-w-none print:rounded-none print:shadow-none print:ring-0">
          {/* Letterhead */}
          <div className="flex items-center justify-between gap-6 bg-[#002147] px-8 py-6 text-white">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/25">
                <span className="text-lg font-bold">B</span>
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight">Been Compliance</p>
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/70">
                  Product inspection report
                </p>
              </div>
            </div>
            <dl className="text-right text-[11px] leading-5 text-white/80">
              <div>
                <dt className="inline">Report no. </dt>
                <dd className="inline font-mono font-semibold text-white">{reportNo}</dd>
              </div>
              <div>
                <dt className="inline">Issued </dt>
                <dd className="inline font-semibold text-white">
                  {finished ? (order.completedAtUk ?? "—") : "Draft, not issued"}
                </dd>
              </div>
            </dl>
          </div>
          <div className="h-1 bg-gradient-to-r from-[#c8a24a] via-[#e6c879] to-[#c8a24a]" aria-hidden />

          <div className="space-y-8 px-8 py-8">
            {/* Result and booking */}
            <section className="report-keep grid gap-6 sm:grid-cols-[13rem_1fr] print:grid-cols-[13rem_1fr]">
              <div
                className={`flex flex-col items-center justify-center rounded-xl border-2 px-4 py-6 text-center ${
                  result === null
                    ? "border-slate-300 bg-slate-50"
                    : passed
                      ? "border-emerald-600 bg-emerald-50"
                      : "border-red-600 bg-red-50"
                }`}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">Overall AQL result</p>
                <p
                  className={`mt-2 text-4xl font-black tracking-tight ${
                    result === null ? "text-slate-400" : passed ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {result === null ? "—" : passed ? "PASS" : "FAIL"}
                </p>
                {!finished ? (
                  <p className="mt-2 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                    Draft
                  </p>
                ) : null}
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight">{order.productName}</h1>
                <p className="text-sm text-slate-600">{order.categoryName}</p>
                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 print:grid-cols-3">
                  <Field label="Inspection">{INSPECTION_STAGE_LABELS[order.stage]}</Field>
                  <Field label="Target date">{order.targetDateUk}</Field>
                  <Field label="Inspection date">{formatUk(order.inspectionDate)}</Field>
                  <Field label="Factory">
                    {order.factoryName}
                    {order.factoryPlace ? <span className="block text-[11px] font-normal text-slate-600">{order.factoryPlace}</span> : null}
                  </Field>
                  <Field label="Client">{order.clientName ?? "—"}</Field>
                  <Field label="Inspector">{order.inspectorName ?? "—"}</Field>
                  <Field label="PO number">{order.poNumber ?? "—"}</Field>
                  <Field label="Reference">{order.reference ?? "—"}</Field>
                  <Field label="Order quantity">{order.orderQuantity?.toLocaleString("en-GB") ?? "—"}</Field>
                </dl>
              </div>
            </section>

            {/* AQL summary */}
            <section className="report-keep">
              <SectionTitle>AQL summary · ISO 2859-1</SectionTitle>
              <p className="mb-3 text-[12px] text-slate-600">
                General inspection level {order.aql.level}, single sampling, normal inspection. Tolerances: AQL{" "}
                {order.aql.critical} critical, {order.aql.major} major, {order.aql.minor} minor.
              </p>
              {aql ? (
                <table className="w-full border-collapse text-left text-[12px]">
                  <thead>
                    <tr className="border-b-2 border-[#002147] text-[9px] uppercase tracking-[0.12em] text-slate-600">
                      <th className="py-2 pr-3 font-bold">Defect class</th>
                      <th className="py-2 pr-3 font-bold">AQL</th>
                      <th className="py-2 pr-3 font-bold">Sample size</th>
                      <th className="py-2 pr-3 font-bold">Accept (Ac)</th>
                      <th className="py-2 pr-3 font-bold">Reject (Re)</th>
                      <th className="py-2 pr-3 font-bold">Found</th>
                      <th className="py-2 font-bold">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aql.severities.map((s) => (
                      <tr key={s.severity} className="border-b border-slate-200">
                        <td className="py-2.5 pr-3 font-semibold">{s.severity}</td>
                        <td className="py-2.5 pr-3 tabular-nums">{s.aql === 0 ? "0 (none allowed)" : s.aql}</td>
                        <td className="py-2.5 pr-3 tabular-nums">
                          {s.plan.sampleSize}
                          <span className="ml-1 text-[10px] text-slate-500">
                            {s.plan.fullInspection ? "(100%)" : `(code ${s.plan.codeLetter})`}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 tabular-nums">{s.plan.accept}</td>
                        <td className="py-2.5 pr-3 tabular-nums">{s.plan.reject}</td>
                        <td className="py-2.5 pr-3 font-bold tabular-nums">{s.found}</td>
                        <td className="py-2.5">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              s.passed ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {s.passed ? "Pass" : "Fail"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-[12px] text-slate-600">Order quantity not recorded, so no sampling plan applies.</p>
              )}
            </section>

            {/* Checklist */}
            {sections.length > 0 ? (
              <section className="report-keep">
                <SectionTitle>Checklist results</SectionTitle>
                <table className="w-full border-collapse text-left text-[12px]">
                  <thead>
                    <tr className="border-b-2 border-[#002147] text-[9px] uppercase tracking-[0.12em] text-slate-600">
                      <th className="py-2 pr-3 font-bold">Area</th>
                      <th className="py-2 pr-3 font-bold">Pass</th>
                      <th className="py-2 pr-3 font-bold">Fail</th>
                      <th className="py-2 pr-3 font-bold">N/A</th>
                      <th className="py-2 font-bold">Findings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map((s) => (
                      <tr key={s.key} className="border-b border-slate-200 align-top">
                        <td className="py-2 pr-3 font-semibold">{s.title}</td>
                        <td className="py-2 pr-3 tabular-nums">{s.pass}</td>
                        <td className={`py-2 pr-3 tabular-nums ${s.fail.length ? "font-bold text-red-700" : ""}`}>
                          {s.fail.length}
                        </td>
                        <td className="py-2 pr-3 tabular-nums">{s.na}</td>
                        <td className="py-2 text-slate-700">
                          {s.fail.length === 0 ? (
                            s.open > 0 ? (
                              <span className="text-slate-500">{s.open} not checked</span>
                            ) : (
                              <span className="text-slate-500">Conforms</span>
                            )
                          ) : (
                            <ul className="space-y-0.5">
                              {s.fail.map((f) => (
                                <li key={f.item}>
                                  <span className="font-medium text-red-800">{f.item}</span>
                                  {f.note ? <span>: {f.note}</span> : null}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ) : null}

            {/* Defect gallery: the heading stays on the same printed page as the first row of photos */}
            <section>
              {order.defects.length === 0 ? (
                <div className="report-keep">
                  <SectionTitle>Defect gallery</SectionTitle>
                  <p className="text-[12px] text-slate-600">No defects were found in the sample.</p>
                </div>
              ) : (
                <>
                  <div className="report-keep">
                    <SectionTitle>Defect gallery</SectionTitle>
                    <DefectGrid defects={order.defects.slice(0, 3)} start={0} photoUrls={photoUrls} checklist={order.checklist} />
                  </div>
                  {order.defects.length > 3 ? (
                    <div className="mt-4">
                      <DefectGrid defects={order.defects.slice(3)} start={3} photoUrls={photoUrls} checklist={order.checklist} />
                    </div>
                  ) : null}
                </>
              )}
            </section>

            {/* Sign-off */}
            <section className="report-keep grid gap-6 border-t border-slate-200 pt-6 sm:grid-cols-2 print:grid-cols-2">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Inspected by</p>
                <p className="mt-1 text-[13px] font-semibold">{order.inspectorName ?? "—"}</p>
                <p className="text-[11px] text-slate-600">on behalf of Been Compliance</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Date of inspection</p>
                <p className="mt-1 text-[13px] font-semibold">{formatUk(order.inspectionDate)}</p>
              </div>
            </section>

            <p className="text-[9px] leading-relaxed text-slate-500">
              This report covers only the goods sampled at the factory on the date shown, inspected by random sampling under
              ISO 2859-1. It does not release the supplier from its contractual obligations. Report {reportNo}.
            </p>
          </div>
        </article>
      </main>
    </>
  );
}
