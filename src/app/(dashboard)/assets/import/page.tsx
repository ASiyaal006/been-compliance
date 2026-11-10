import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AssetImport } from "@/components/asset-import";
import { requireAuthenticatedContext } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Import assets · Been Compliance" };

export default async function ImportAssetsPage() {
  const { profile, supabase } = await requireAuthenticatedContext();
  if (!profile.isBeenAdmin) notFound();

  const { data } = await supabase.from("clients").select("name").order("name");
  const customers = (data ?? []).map((c) => c.name);

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4 shadow-sm md:px-8">
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
          <h1 className="truncate text-lg font-semibold tracking-tight text-[#002147]">Import assets</h1>
          <p className="hidden truncate text-[12px] text-slate-muted sm:block">
            Add a customer&apos;s whole equipment list from a spreadsheet
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="mx-auto max-w-5xl">
          <AssetImport customers={customers} />
        </div>
      </main>
    </>
  );
}
