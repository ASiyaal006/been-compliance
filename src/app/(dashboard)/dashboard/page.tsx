import Link from "next/link";
import type { ReactNode } from "react";
import { ExpiryBadge } from "@/components/expiry-badge";
import { fetchRegisterAssets, type RegisterRow } from "@/lib/data/asset-queries";
import {
  fetchDashboardData,
  type DashboardData,
  type DueItem,
  type OpenDefect,
} from "@/lib/data/dashboard-queries";
import { compareExpiry, type ExpiryStatus } from "@/lib/expiry";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { withTimeout } from "@/lib/with-timeout";

type DashboardInspectionRow = {
  hrefId: string;
  assetLabel: string;
  machineryType: string;
  site: string;
  status: "Compliant" | "Defect" | "Monitor" | "Pending";
  due: string;
  expiry: ExpiryStatus;
};

function mapRegister(rows: RegisterRow[]): DashboardInspectionRow[] {
  return rows.map((r) => ({
    hrefId: r.id,
    assetLabel: r.assetLabel,
    machineryType: r.machineryType,
    site: r.site,
    status:
      r.outcomeLabel === "Pass"
        ? "Compliant"
        : r.outcomeLabel === "Fail"
          ? "Defect"
          : r.outcomeLabel === "Monitor"
            ? "Monitor"
            : "Pending",
    due: r.nextDueUk,
    expiry: r.expiry,
  }));
}

function formatInt(n: number): string {
  return n.toLocaleString("en-GB");
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function dueDetail(days: number): string {
  if (days < 0) return `${plural(-days, "day")} overdue`;
  if (days === 0) return "Due today";
  return `Due in ${plural(days, "day")}`;
}

function KindTag({ kind }: { kind: DueItem["kind"] | OpenDefect["kind"] }) {
  const text = kind === "product" ? "Factory" : kind === "pre-use" ? "Pre-use" : "Equipment";
  return (
    <span className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
      {text}
    </span>
  );
}

function SectionShell({
  id,
  title,
  subtitle,
  accent,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
        <span className={`size-2.5 shrink-0 rounded-full ${accent}`} aria-hidden />
        <div>
          <h2 className="text-base font-semibold text-[#002147]">{title}</h2>
          <p className="text-xs text-slate-muted">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function DueList({ items, empty, overdue }: { items: DueItem[]; empty: string; overdue: boolean }) {
  if (items.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-slate-muted sm:px-6">{empty}</p>;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => (
        <li key={`${item.kind}-${item.id}`}>
          <Link
            href={item.href}
            className="flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50/80 sm:px-6"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[13px] font-semibold text-navy">{item.label}</span>
                <KindTag kind={item.kind} />
              </div>
              <p className="mt-0.5 truncate text-sm text-slate-700">{item.what}</p>
              <p className="truncate text-xs text-slate-muted">
                {[item.client, item.site].filter(Boolean).join(" · ") || "—"}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-medium tabular-nums text-slate-900">{item.dueUk}</p>
              <p className={`text-xs font-semibold ${overdue ? "text-danger" : "text-amber"}`}>
                {dueDetail(item.daysUntilDue)}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function DefectList({ items }: { items: OpenDefect[] }) {
  if (items.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-slate-muted sm:px-6">No open defects.</p>;
  }
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((d) => (
        <li key={`${d.kind}-${d.id}`}>
          <Link
            href={d.href}
            className="flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-50/80 sm:px-6"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[13px] font-semibold text-navy">{d.label}</span>
                <KindTag kind={d.kind} />
                {d.stopUse ? (
                  <span className="inline-flex rounded-full bg-danger-bg px-2 py-0.5 text-[11px] font-semibold text-danger ring-1 ring-danger/15">
                    Do not use
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-sm font-medium text-slate-900">{d.title}</p>
              <p className="line-clamp-2 text-sm text-slate-700">{d.detail}</p>
              {d.client ? <p className="truncate text-xs text-slate-muted">{d.client}</p> : null}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-slate-muted">Found</p>
              <p className="text-sm font-medium tabular-nums text-slate-900">{d.foundUk}</p>
              {d.remedyByUk ? (
                <p className={`text-xs font-semibold ${d.remedyOverdue ? "text-danger" : "text-amber"}`}>
                  {d.remedyOverdue ? "Remedy overdue" : "Remedy by"} {d.remedyByUk}
                </p>
              ) : null}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function Home() {
  const configured = isSupabaseConfigured();
  let inspections: DashboardInspectionRow[] = [];
  let summary: DashboardData | null = null;
  let loadError: string | null = null;

  if (configured) {
    try {
      const [rows, data] = await Promise.all([
        withTimeout(fetchRegisterAssets(), "Loading assets"),
        withTimeout(fetchDashboardData(), "Loading dashboard"),
      ]);
      inspections = mapRegister(rows).sort((a, b) => compareExpiry(a.expiry, b.expiry));
      summary = data;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load dashboard data.";
      loadError = message;
      inspections = [];
    }
  }

  const total = inspections.length;
  const noDate = inspections.filter((r) => r.expiry.level === "none").length;
  const overdue = summary?.overdue ?? [];
  const dueThisMonth = summary?.dueThisMonth ?? [];
  const openDefects = summary?.openDefects ?? [];
  const stopUseCount = openDefects.filter((d) => d.stopUse).length;
  const monthLabel = summary?.monthLabel ?? "this month";

  const cards = [
    {
      href: "#overdue",
      title: "Overdue",
      count: overdue.length,
      hint: "Past their due date",
      accent: "bg-danger",
      tone: overdue.length > 0 ? "text-danger" : "text-[#002147]",
    },
    {
      href: "#due-this-month",
      title: "Due this month",
      count: dueThisMonth.length,
      hint: `Still to do in ${monthLabel}`,
      accent: "bg-amber-500",
      tone: "text-[#002147]",
    },
    {
      href: "#open-defects",
      title: "Open defects",
      count: openDefects.length,
      hint: stopUseCount > 0 ? `${stopUseCount} not safe to use` : "None stopping use",
      accent: "bg-danger",
      tone: openDefects.length > 0 ? "text-danger" : "text-[#002147]",
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 shadow-sm md:px-8">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#002147]">Been Compliance</h1>
          <p className="hidden text-[12px] text-slate-muted sm:block">
            Operations dashboard · Testing, Inspection, Certification &amp; Compliance
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="hidden rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 md:inline-flex"
          >
            Search
          </button>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-muted hover:bg-slate-100 hover:text-slate-900"
            aria-label="Notifications"
          >
            <svg className="size-5" fill="none" viewBox="0 0 24 24" aria-hidden>
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6 6 0 1 0-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 1 1-6 0"
              />
            </svg>
          </button>
          <span className="h-8 w-px bg-slate-200" aria-hidden />
          <button
            type="button"
            className="flex items-center gap-2 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            aria-label="Open profile menu"
          >
            <span className="hidden text-right text-xs sm:block">
              <span className="block font-medium text-slate-900">Jane Smith</span>
              <span className="text-slate-muted">Lead Inspector</span>
            </span>
            <span className="flex size-10 items-center justify-center rounded-full bg-navy text-sm font-semibold text-white shadow-sm ring-2 ring-white">
              BC
            </span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-8">
        {loadError ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
            <span className="font-semibold">Dashboard data unavailable.</span> {loadError}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {cards.map((card) => (
            <a
              key={card.href}
              href={card.href}
              className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50 sm:p-6"
            >
              <div className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${card.accent}`} aria-hidden />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-muted">{card.title}</p>
              <p className={`mt-2 text-3xl font-semibold tracking-tight ${card.tone}`}>{formatInt(card.count)}</p>
              <p className="mt-1 text-xs text-slate-muted">{card.hint}</p>
            </a>
          ))}

          <article className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6">
            <div className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-navy" aria-hidden />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-muted">Total assets</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-[#002147]">{formatInt(total)}</p>
            <p className="mt-1 text-xs text-slate-muted">
              {!configured
                ? "Configure database"
                : noDate > 0
                  ? `${noDate} with no due date yet`
                  : "All have a due date"}
            </p>
          </article>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <SectionShell
            id="overdue"
            title="Overdue"
            subtitle="Inspections and factory bookings past their due date, most overdue first"
            accent="bg-danger"
          >
            <DueList items={overdue} overdue empty="Nothing overdue." />
          </SectionShell>

          <SectionShell
            id="due-this-month"
            title={`Due this month · ${monthLabel}`}
            subtitle="From today to the end of the month, soonest first"
            accent="bg-amber-500"
          >
            <DueList items={dueThisMonth} overdue={false} empty="Nothing else due this month." />
          </SectionShell>
        </div>

        <div className="mt-6">
          <SectionShell
            id="open-defects"
            title="Open defects"
            subtitle="Failed inspections, defects with a remedy date, pre-use faults and failed factory inspections. A defect clears when the next inspection of that kind passes."
            accent="bg-danger"
          >
            <DefectList items={openDefects} />
          </SectionShell>
        </div>

        <section
          id="recent-inspections"
          className="mt-6 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm"
        >
          <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#002147]">Expiry status</h2>
              <p className="text-sm text-slate-muted">Most urgent first · next thorough examination due</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/assets"
                className="rounded-lg border border-[#002147]/20 bg-navy/[0.04] px-3 py-1.5 text-xs font-semibold text-[#002147] hover:bg-navy/[0.08]"
              >
                Asset register
              </Link>
              <Link
                href="/assets/new"
                className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#00306a]"
              >
                Add asset
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                    Asset ID
                  </th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                    Machinery type
                  </th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                    Site
                  </th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                    Status
                  </th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                    Next due date
                  </th>
                  <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                    Expiry
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inspections.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-14 text-center text-sm text-slate-muted">
                      {loadError
                        ? "No assets found — check your account access or try again."
                        : configured
                          ? "No assets in the database yet."
                          : "Connect Supabase to load your live register."}{" "}
                      <Link href="/assets/new" className="font-semibold text-navy underline-offset-2 hover:underline">
                        Add one
                      </Link>
                    </td>
                  </tr>
                ) : (
                  inspections.map((row) => (
                    <tr key={row.hrefId} className="transition-colors hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-6 py-3.5 font-mono text-[13px] font-medium">
                        <Link
                          href={`/assets/${encodeURIComponent(row.hrefId)}`}
                          className="text-navy underline decoration-navy/30 underline-offset-2 transition-colors hover:decoration-navy hover:text-[#00306a]"
                        >
                          {row.assetLabel}
                        </Link>
                      </td>
                      <td className="px-6 py-3.5 text-slate-muted">{row.machineryType}</td>
                      <td className="px-6 py-3.5 text-slate-muted">{row.site}</td>
                      <td className="whitespace-nowrap px-6 py-3.5">
                        {row.status === "Pending" ? (
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                            Pending
                          </span>
                        ) : row.status === "Monitor" ? (
                          <span className="inline-flex rounded-full bg-amber-bg px-2.5 py-0.5 text-xs font-semibold text-amber ring-1 ring-amber/20">
                            Monitor
                          </span>
                        ) : row.status === "Compliant" ? (
                          <span className="inline-flex rounded-full bg-success-bg px-2.5 py-0.5 text-xs font-semibold text-success ring-1 ring-success/15">
                            Compliant
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-danger-bg px-2.5 py-0.5 text-xs font-semibold text-danger ring-1 ring-danger/15">
                            Defect
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3.5 font-medium tabular-nums text-slate-muted">
                        {row.due}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3.5">
                        <div className="flex flex-col items-start gap-1">
                          <ExpiryBadge status={row.expiry} />
                          <span className="text-xs text-slate-muted">{row.expiry.detail}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
