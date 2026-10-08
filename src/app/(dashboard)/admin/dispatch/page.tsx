import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DispatchAssign } from "@/components/dispatch-assign";
import { fetchDispatchBoard, type DispatchOrder } from "@/lib/data/contractor-queries";
import { requireAuthenticatedContext } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Dispatch · Been Compliance" };

function OrdersTable({ orders, empty }: { orders: DispatchOrder[]; empty: string }) {
  if (orders.length === 0) return <p className="px-6 py-10 text-center text-sm text-slate-muted">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80">
            {["Target date", "Job", "Factory", "Contractor"].map((h) => (
              <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {orders.map((o) => (
            <tr key={o.id} className="align-top">
              <td className="whitespace-nowrap px-6 py-4 font-medium tabular-nums text-[#002147]">{o.targetDateUk}</td>
              <td className="px-6 py-4">
                <Link
                  href={`/product-inspections/${o.id}`}
                  className="font-medium text-[#002147] underline-offset-2 hover:underline"
                >
                  <span className="font-mono text-[13px]">{o.stage}</span> · {o.productName}
                </Link>
                <p className="text-xs text-slate-muted">
                  {o.categoryName}
                  {o.clientName ? ` · ${o.clientName}` : ""}
                  {o.reference ? ` · Ref ${o.reference}` : ""}
                </p>
              </td>
              <td className="px-6 py-4 text-slate-muted">{o.factory}</td>
              <td className="w-[22rem] px-6 py-4">
                {o.contractorName ? (
                  <p className="mb-2 text-sm font-medium text-[#002147]">Assigned to {o.contractorName}</p>
                ) : null}
                <DispatchAssign orderId={o.id} options={o.options} currentId={o.contractorId} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function DispatchPage() {
  const { profile } = await requireAuthenticatedContext();
  if (!profile.isBeenAdmin) notFound();

  const { toAssign, assigned, contractorCount, notSetUp } = await fetchDispatchBoard();

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 shadow-sm md:px-8">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-[#002147]">Dispatch</h1>
          <p className="hidden text-[12px] text-slate-muted sm:block">Assign product inspections to contractors</p>
        </div>
        <Link
          href="/admin/contractors"
          className="shrink-0 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-navy shadow-sm hover:bg-slate-50"
        >
          Contractors
        </Link>
      </header>

      <main className="flex-1 space-y-6 overflow-auto p-4 md:p-8">
        {notSetUp ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
            Contractors aren&apos;t set up in the database yet. Run the contractors SQL in Supabase first.
          </div>
        ) : contractorCount === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
            No contractors yet.{" "}
            <Link href="/admin/contractors" className="font-semibold underline underline-offset-2">
              Add your first contractor
            </Link>{" "}
            to start assigning jobs.
          </div>
        ) : null}

        <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-[#002147]">Waiting for a contractor</h2>
            <p className="text-sm text-slate-muted">
              {toAssign.length} requested {toAssign.length === 1 ? "booking" : "bookings"} · assigning confirms the booking
            </p>
          </div>
          <OrdersTable orders={toAssign} empty="Nothing to assign. New bookings appear here." />
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-[#002147]">Assigned, not started</h2>
            <p className="text-sm text-slate-muted">Reassign or unassign until the inspector presses Start.</p>
          </div>
          <OrdersTable orders={assigned} empty="No confirmed bookings waiting to start." />
        </section>
      </main>
    </>
  );
}
