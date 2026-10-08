import Link from "next/link";
import { fetchProductOrders } from "@/lib/data/product-inspection-queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ORDER_STATUS_STYLES } from "@/lib/types/product-inspection";
import { withTimeout } from "@/lib/with-timeout";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ProductInspectionsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const configured = isSupabaseConfigured();
  const sp = await (searchParams ?? Promise.resolve({} as SearchParams));
  const showCreated = sp.created === "1";

  let orders: Awaited<ReturnType<typeof fetchProductOrders>>["orders"] = [];
  let notSetUp = false;
  let loadError: string | null = null;

  if (configured) {
    try {
      ({ orders, notSetUp } = await withTimeout(fetchProductOrders(), "Loading inspection bookings"));
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load inspection bookings.";
    }
  }

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 shadow-sm md:px-8">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-[#002147]">Product inspections</h1>
          <p className="hidden text-[12px] text-slate-muted sm:block">
            Factory inspection bookings · IPC, DUPRO, PSI, CLC
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-8">
        {loadError ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
            <span className="font-semibold">Bookings unavailable.</span> {loadError}
          </div>
        ) : null}

        {notSetUp ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
            Product inspections aren&apos;t set up in the database yet. Run the product inspections SQL in Supabase first.
          </div>
        ) : null}

        {showCreated && !loadError ? (
          <div
            className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-sm"
            role="status"
          >
            <span className="font-semibold">Booking saved.</span>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#002147]">Inspection bookings</h2>
              <p className="text-sm text-slate-muted">
                {orders.length} {orders.length === 1 ? "booking" : "bookings"} · soonest first
              </p>
            </div>
            {!notSetUp ? (
              <Link
                href="/product-inspections/new"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00306a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
              >
                <svg className="size-4 shrink-0" aria-hidden fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New booking
              </Link>
            ) : null}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  {["Target date", "Stage", "Product", "Client", "Factory", "Status"].map((h) => (
                    <th key={h} className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-muted">
                      No inspection bookings yet.{" "}
                      {!notSetUp ? (
                        <Link
                          href="/product-inspections/new"
                          className="font-semibold text-navy underline-offset-2 hover:underline"
                        >
                          Book the first one
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-6 py-3.5 tabular-nums font-medium text-[#002147]">
                        {o.targetDateUk}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-[13px] font-semibold text-[#002147]">{o.stage}</td>
                      <td className="px-6 py-3.5">
                        <Link
                          href={`/product-inspections/${o.id}`}
                          className="font-medium text-[#002147] underline-offset-2 hover:text-navy hover:underline"
                        >
                          {o.productName}
                        </Link>
                        <p className="text-xs text-slate-muted">
                          {o.categoryName}
                          {o.reference ? ` · Ref ${o.reference}` : ""}
                        </p>
                      </td>
                      <td className="px-6 py-3.5 text-slate-muted">{o.clientName ?? "—"}</td>
                      <td className="px-6 py-3.5 text-slate-muted">{o.factory}</td>
                      <td className="whitespace-nowrap px-6 py-3.5">
                        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${ORDER_STATUS_STYLES[o.status] ?? ""}`}>
                          {o.status}
                        </span>
                        {o.inspectionResult ? (
                          <span
                            className={`ml-1.5 rounded px-2 py-0.5 text-xs font-bold uppercase ${
                              o.inspectionResult === "Pass" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                            }`}
                          >
                            {o.inspectionResult}
                          </span>
                        ) : null}
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
