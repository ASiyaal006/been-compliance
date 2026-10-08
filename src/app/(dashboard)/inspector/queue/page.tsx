import type { Metadata } from "next";
import Link from "next/link";
import { fetchMyJobs, type QueueJob } from "@/lib/data/contractor-queries";
import { INSPECTION_STAGE_LABELS, ORDER_STATUS_STYLES } from "@/lib/types/product-inspection";

export const metadata: Metadata = { title: "My jobs · Been Compliance" };

function JobCard({ job }: { job: QueueJob }) {
  const done = job.status === "Report issued";
  return (
    <li>
      <Link
        href={done ? `/product-inspections/${job.id}/report` : `/product-inspections/${job.id}`}
        className="block rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-navy/30 hover:shadow"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-muted">{job.targetDateUk}</p>
            <p className="mt-0.5 truncate text-base font-semibold text-[#002147]">{job.productName}</p>
            <p className="text-xs text-slate-muted">
              {INSPECTION_STAGE_LABELS[job.stage]} · {job.categoryName}
            </p>
          </div>
          <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${ORDER_STATUS_STYLES[job.status]}`}>
            {job.status === "Confirmed" ? "To do" : job.status}
          </span>
        </div>
        <p className="mt-3 text-sm text-slate-700">{job.factory}</p>
        {job.factoryAddress ? <p className="whitespace-pre-line text-xs text-slate-500">{job.factoryAddress}</p> : null}
        {job.factoryContact ? <p className="mt-1 text-xs text-slate-500">Contact: {job.factoryContact}</p> : null}
        <p className="mt-3 text-sm font-semibold text-navy">
          {done ? `View report${job.inspectionResult ? ` · ${job.inspectionResult}` : ""}` : "Open job →"}
        </p>
      </Link>
    </li>
  );
}

export default async function InspectorQueuePage() {
  const { contractor, jobs } = await fetchMyJobs();
  const open = jobs.filter((j) => j.status !== "Report issued");
  const done = jobs.filter((j) => j.status === "Report issued");

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4 shadow-sm md:px-8">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-[#002147]">My jobs</h1>
          {contractor ? <p className="hidden text-[12px] text-slate-muted sm:block">{contractor.name}</p> : null}
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="mx-auto max-w-3xl space-y-8">
          {!contractor ? (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-muted shadow-sm">
              Your login isn&apos;t set up as a contractor. Ask Been Compliance to add you.
            </div>
          ) : (
            <>
              <section>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#002147]">
                  To do ({open.length})
                </h2>
                {open.length === 0 ? (
                  <p className="rounded-xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-muted">
                    No jobs assigned to you right now.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {open.map((j) => (
                      <JobCard key={j.id} job={j} />
                    ))}
                  </ul>
                )}
              </section>
              {done.length > 0 ? (
                <section>
                  <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#002147]">
                    Finished ({done.length})
                  </h2>
                  <ul className="space-y-3">
                    {done.map((j) => (
                      <JobCard key={j.id} job={j} />
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </div>
      </main>
    </>
  );
}
