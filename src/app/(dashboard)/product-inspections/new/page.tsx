import Link from "next/link";
import { NewProductOrderForm } from "@/components/new-product-order-form";
import { fetchBookingFormOptions } from "@/lib/data/product-inspection-queries";

export default async function NewProductInspectionPage() {
  const options = await fetchBookingFormOptions();

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
        <h1 className="truncate text-lg font-semibold tracking-tight text-[#002147]">New inspection booking</h1>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-8">
        {options.notSetUp ? (
          <div className="mx-auto max-w-2xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
            Product inspections aren&apos;t set up in the database yet. Run the product inspections SQL in Supabase first.
          </div>
        ) : (
          <NewProductOrderForm options={options} />
        )}
      </main>
    </>
  );
}
