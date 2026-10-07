import Link from "next/link";
import { ExpiryBadge } from "@/components/expiry-badge";
import { fetchRegisterAssets, type RegisterRow } from "@/lib/data/asset-queries";
import { compareExpiry, DUE_SOON_DAYS, type ExpiryLevel, type ExpiryStatus } from "@/lib/expiry";
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

const EXPIRY_CARDS: {
  level: ExpiryLevel;
  title: string;
  hint: string;
  accent: string;
  pill: string;
}[] = [
  {
    level: "red",
    title: "Expired",
    hint: "Overdue or failed · stop use",
    accent: "bg-danger",
    pill: "bg-danger-bg text-danger ring-danger/15",
  },
  {
    level: "yellow",
    title: "Due soon",
    hint: `Due within ${DUE_SOON_DAYS} days`,
    accent: "bg-amber-500",
    pill: "bg-amber-bg text-amber ring-amber/20",
  },
  {
    level: "green",
    title: "In date",
    hint: `Due in more than ${DUE_SOON_DAYS} days`,
    accent: "bg-success",
    pill: "bg-success-bg text-success ring-success/15",
  },
];

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

export default async function Home() {
  const configured = isSupabaseConfigured();
  let inspections: DashboardInspectionRow[] = [];
  let loadError: string | null = null;

  if (configured) {
    try {
      const rows = await withTimeout(fetchRegisterAssets(), "Loading assets");
      inspections = mapRegister(rows).sort((a, b) => compareExpiry(a.expiry, b.expiry));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load dashboard data.";
      loadError = message;
      inspections = [];
    }
  }

  const total = inspections.length;
  const countByLevel: Record<ExpiryLevel, number> = { red: 0, yellow: 0, green: 0, none: 0 };
  for (const row of inspections) countByLevel[row.expiry.level] += 1;

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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {EXPIRY_CARDS.map((card) => (
            <article
              key={card.level}
              className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm"
            >
              <div className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${card.accent}`} aria-hidden />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-muted">{card.title}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-[#002147]">
                {formatInt(countByLevel[card.level])}
              </p>
              <span className={`mt-2 inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${card.pill}`}>
                {card.hint}
              </span>
            </article>
          ))}

          <article className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-navy" aria-hidden />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-muted">Total assets</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-[#002147]">{formatInt(total)}</p>
            <p className="mt-1 text-xs text-slate-muted">
              {!configured
                ? "Configure database"
                : countByLevel.none > 0
                  ? `${countByLevel.none} with no due date yet`
                  : "All have a due date"}
            </p>
          </article>
        </div>

        <section
          id="recent-inspections"
          className="mt-8 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm"
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
