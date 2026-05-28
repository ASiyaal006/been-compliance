import Link from "next/link";
import { AddAssetForm } from "@/components/add-asset-form";

export default function NewAssetPage() {
  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 shadow-sm md:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          <Link
            href="/assets"
            className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-slate-muted transition-colors hover:text-navy"
          >
            <svg className="size-4" aria-hidden fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Register
          </Link>
          <span className="hidden h-6 w-px shrink-0 bg-slate-200 sm:block" aria-hidden />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight text-[#002147]">Add new asset</h1>
            <p className="hidden truncate text-[12px] text-slate-muted sm:block">
              Saves directly to Supabase · clients &amp; assets tables
            </p>
          </div>
        </div>
        <button
          type="button"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white shadow-sm ring-2 ring-white"
          aria-label="Profile"
        >
          BC
        </button>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-8">
        <AddAssetForm />
      </main>
    </>
  );
}
