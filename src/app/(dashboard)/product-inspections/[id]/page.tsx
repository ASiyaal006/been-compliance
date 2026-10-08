import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { BookingStatusActions } from "@/components/booking-status-actions";
import { DefectLogSection } from "@/components/defect-log-section";
import { ProductInspectionWorkspace } from "@/components/product-inspection-workspace";
import { looksLikeUuid } from "@/lib/data/asset-queries";
import { fetchProductOrder } from "@/lib/data/product-inspection-queries";
import { INSPECTION_STAGE_LABELS, ORDER_STATUS_STYLES, type DefectSeverity } from "@/lib/types/product-inspection";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Product inspection · Been Compliance" };

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-[#002147]">{children}</dd>
    </div>
  );
}

export default async function ProductInspectionPage({ params }: Props) {
  const { id } = await params;
  if (!looksLikeUuid(id)) notFound();

  const { order, notSetUp } = await fetchProductOrder(id.trim());
  if (!order && !notSetUp) notFound();

  const defectCounts: Record<DefectSeverity, number> = { Critical: 0, Major: 0, Minor: 0 };
  for (const d of order?.defects ?? []) defectCounts[d.severity] += d.quantity;

  const finished = order?.status === "Report issued";
  const cancelled = order?.status === "Cancelled";

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 shadow-sm sm:gap-4 md:px-8">
        <Link
          href="/product-inspections"
          className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-slate-muted transition-colors hover:text-navy"
        >
          <svg className="size-4" aria-hidden fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Bookings
        </Link>
        <span className="hidden h-6 w-px shrink-0 bg-slate-200 sm:block" aria-hidden />
        <h1 className="truncate text-lg font-semibold tracking-tight text-[#002147]">
          {order ? order.productName : "Product inspection"}
        </h1>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-8">
        {!order ? (
          <div className="mx-auto max-w-3xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
            Inspection results aren&apos;t set up in the database yet. Run the product inspection results SQL in Supabase first.
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-[#002147]">{order.stage}</span>
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${ORDER_STATUS_STYLES[order.status]}`}>
                    {order.status}
                  </span>
                </div>
                {order.canEdit ? <BookingStatusActions orderId={order.id} status={order.status} /> : null}
              </div>
              <dl className="grid gap-x-6 gap-y-4 px-6 py-5 sm:grid-cols-2">
                <Detail label="Inspection">{INSPECTION_STAGE_LABELS[order.stage]}</Detail>
                <Detail label="Target date">{order.targetDateUk}</Detail>
                <Detail label="Product">
                  {order.productName}
                  <span className="block text-xs text-slate-muted">{order.categoryName}</span>
                </Detail>
                <Detail label="Client">{order.clientName ?? "—"}</Detail>
                <Detail label="PO number">{order.poNumber ?? "—"}</Detail>
                <Detail label="Your reference">{order.reference ?? "—"}</Detail>
                <Detail label="Factory">
                  {order.factoryName}
                  {order.factoryAddress ? <span className="block whitespace-pre-line text-xs text-slate-muted">{order.factoryAddress}</span> : null}
                  {order.factoryPlace ? <span className="block text-xs text-slate-muted">{order.factoryPlace}</span> : null}
                </Detail>
                <Detail label="Factory contact">{order.factoryContact ?? "—"}</Detail>
                {order.notes ? (
                  <div className="sm:col-span-2">
                    <Detail label="Special instructions">
                      <span className="whitespace-pre-line">{order.notes}</span>
                    </Detail>
                  </div>
                ) : null}
              </dl>
            </section>

            <ProductInspectionWorkspace
              orderId={order.id}
              checklist={order.checklist}
              initialResults={order.checklistResults}
              initialInspectionDate={order.inspectionDate}
              initialInspectorName={order.inspectorName}
              initialOrderQuantity={order.orderQuantity}
              aql={order.aql}
              defectCounts={defectCounts}
              canEdit={order.canEdit}
              finished={finished}
              cancelled={cancelled}
              inspectionResult={order.inspectionResult}
              completedAtUk={order.completedAtUk}
            />

            <DefectLogSection
              orderId={order.id}
              sections={order.checklist}
              defects={order.defects}
              canAdd={order.canEdit && !finished && !cancelled}
            />
          </div>
        )}
      </main>
    </>
  );
}
