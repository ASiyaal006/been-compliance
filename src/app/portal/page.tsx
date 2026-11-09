import Link from "next/link";
import { ExpiryBadge } from "@/components/expiry-badge";
import { fetchPortalHome } from "@/lib/data/customer-queries";

const cardCls = "overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm";
const linkCls = "text-sm font-semibold text-navy underline-offset-2 hover:underline";

function ResultBadge({ result }: { result: string }) {
  const cls =
    result === "Fail"
      ? "bg-danger-bg text-danger ring-danger/15"
      : result === "Monitor"
        ? "bg-amber-bg text-amber ring-amber/20"
        : result === "Pass"
          ? "bg-success-bg text-success ring-success/15"
          : "bg-slate-100 text-slate-700 ring-slate-200";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${cls}`}>
      {result === "Pending inspection" ? "Awaiting inspection" : result}
    </span>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "red" | "amber" }) {
  const valueCls = tone === "red" && value > 0 ? "text-danger" : tone === "amber" && value > 0 ? "text-amber" : "text-[#002147]";
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${valueCls}`}>{value}</p>
    </div>
  );
}

export default async function PortalHomePage() {
  const home = await fetchPortalHome();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[#002147]">{home.clientName}</h1>
        <p className="mt-1 text-sm text-slate-muted">
          Your inspection certificates and reports from Been Compliance. Open any item of equipment to download its
          certificates.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Equipment" value={home.counts.assets} />
        <Stat label="Overdue or failed" value={home.counts.overdue} tone="red" />
        <Stat label="Due in 30 days" value={home.counts.dueSoon} tone="amber" />
      </div>

      <section className={cardCls}>
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-[#002147]">Your equipment</h2>
          <p className="text-sm text-slate-muted">Most urgent first.</p>
        </div>
        {home.assets.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-muted">No equipment on file yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {home.assets.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/portal/assets/${a.id}`}
                  className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold text-[#002147]">{a.assetLabel}</p>
                    <p className="truncate text-sm text-slate-muted">
                      {[a.machineryType, a.site].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    <ResultBadge result={a.outcomeLabel} />
                    <ExpiryBadge status={a.expiry} />
                    <span className="text-xs tabular-nums text-slate-muted">Next due {a.nextDueUk}</span>
                    <span className={linkCls}>Certificates →</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {home.uploaded.length > 0 ? (
        <section className={cardCls}>
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-semibold text-[#002147]">Certificate files</h2>
            <p className="text-sm text-slate-muted">Original certificates on file for your equipment.</p>
          </div>
          <ul className="divide-y divide-slate-100">
            {home.uploaded.map((c) => (
              <li key={c.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-medium text-[#002147]">{c.reference}</p>
                  <p className="text-sm text-slate-muted">
                    {c.assetLabel} · {c.inspectionDateUk}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <ResultBadge result={c.outcomeLabel} />
                  <a
                    href={`/api/certificates/${c.certificateId}/file`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkCls}
                  >
                    Download
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {home.productReports.length > 0 ? (
        <section className={cardCls}>
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-semibold text-[#002147]">Product inspection reports</h2>
            <p className="text-sm text-slate-muted">Factory inspections carried out for you.</p>
          </div>
          <ul className="divide-y divide-slate-100">
            {home.productReports.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/portal/reports/${o.id}`}
                  className="flex flex-col gap-1 px-5 py-3 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#002147]">{o.productName}</p>
                    <p className="truncate text-sm text-slate-muted">
                      {[o.reference, o.stage, o.factory, o.targetDateUk].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {o.inspectionResult ? <ResultBadge result={o.inspectionResult} /> : null}
                    <span className={linkCls}>View report →</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
