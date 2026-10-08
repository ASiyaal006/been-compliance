import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddContractorForm, RemoveContractorButton, ResendInviteButton } from "@/components/contractor-admin";
import { fetchContractorsPage } from "@/lib/data/contractor-queries";
import { requireAuthenticatedContext } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Contractors · Been Compliance" };

export default async function ContractorsPage() {
  const { profile } = await requireAuthenticatedContext();
  if (!profile.isBeenAdmin) notFound();

  const { contractors, categories, notSetUp } = await fetchContractorsPage();

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 shadow-sm md:px-8">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-[#002147]">Contractors</h1>
          <p className="hidden text-[12px] text-slate-muted sm:block">Freelance inspectors you can dispatch</p>
        </div>
        <Link
          href="/admin/dispatch"
          className="shrink-0 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#00306a]"
        >
          Dispatch board
        </Link>
      </header>

      <main className="flex-1 space-y-6 overflow-auto p-4 md:p-8">
        {notSetUp ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
            Contractors aren&apos;t set up in the database yet. Run the contractors SQL in Supabase first.
          </div>
        ) : null}

        <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-[#002147]">
              {contractors.length} {contractors.length === 1 ? "contractor" : "contractors"}
            </h2>
          </div>
          {contractors.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-slate-muted">No contractors yet. Add one below.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {contractors.map((c) => (
                <li key={c.id} className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-[#002147]">{c.name}</p>
                    <p className="text-sm text-slate-muted">
                      {c.regions.length > 0 ? c.regions.join(", ") : "No regions set"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {c.categoryNames.length > 0 ? c.categoryNames.join(" · ") : "All product categories"}
                    </p>
                    {c.invitePending ? <ResendInviteButton id={c.id} name={c.name} /> : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <span className="text-xs text-slate-500">
                      {c.activeJobs} active {c.activeJobs === 1 ? "job" : "jobs"}
                    </span>
                    <RemoveContractorButton id={c.id} name={c.name} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {!notSetUp ? (
          <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-base font-semibold text-[#002147]">Add a contractor</h2>
            </div>
            <AddContractorForm categories={categories} />
          </section>
        ) : null}
      </main>
    </>
  );
}
