"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/actions/auth";

type NavRole = "everyone" | "admin" | "contractor";

const nav: {
  label: string;
  href: string;
  match: (p: string) => boolean;
  role: NavRole;
}[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    match: (p: string) => p === "/dashboard",
    role: "everyone",
  },
  {
    label: "Asset Register",
    href: "/assets",
    match: (p: string) =>
      p === "/assets" || (p.startsWith("/assets/") && p !== "/assets/new" && !p.startsWith("/inspections")),
    role: "everyone",
  },
  {
    label: "Inspection Reports",
    href: "/inspections",
    match: (p: string) => p.startsWith("/inspections"),
    role: "everyone",
  },
  {
    label: "Certificates",
    href: "/certificates",
    match: (p: string) => p.startsWith("/certificates"),
    role: "everyone",
  },
  {
    label: "Product Inspections",
    href: "/product-inspections",
    match: (p: string) => p.startsWith("/product-inspections"),
    role: "everyone",
  },
  {
    label: "My jobs",
    href: "/inspector/queue",
    match: (p: string) => p.startsWith("/inspector"),
    role: "contractor",
  },
  {
    label: "Dispatch",
    href: "/admin/dispatch",
    match: (p: string) => p.startsWith("/admin"),
    role: "admin",
  },
  {
    label: "Settings",
    href: "/settings",
    match: (p: string) => p === "/settings" || p.startsWith("/settings/"),
    role: "everyone",
  },
];

function NavIconDashboard() {
  return (
    <svg className="size-5 shrink-0 opacity-90" aria-hidden fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 10.9 11.94 5.3a1 1 0 0 1 1.12 0l7.94 5.59A1 1 0 0 1 21 12.58V19a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-3.5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0-.5.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6.42a1 1 0 0 1 .52-.88z"
      />
    </svg>
  );
}

function NavIconAssets() {
  return (
    <svg className="size-5 shrink-0 opacity-90" aria-hidden fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 8a2 2 0 0 1 2-2h3l2-2h2l2 2h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Zm4 14h11"
      />
    </svg>
  );
}

function NavIconReports() {
  return (
    <svg className="size-5 shrink-0 opacity-90" aria-hidden fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"
      />
    </svg>
  );
}

function NavIconCertificates() {
  return (
    <svg className="size-5 shrink-0 opacity-90" aria-hidden fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

function NavIconProducts() {
  return (
    <svg className="size-5 shrink-0 opacity-90" aria-hidden fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9"
      />
    </svg>
  );
}

function NavIconSettings() {
  return (
    <svg className="size-5 shrink-0 opacity-90" aria-hidden fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.894 3.31.878 2.417 2.417a1.724 1.724 0 0 0 1.065 2.572c1.756.427 1.756 2.924 0 3.351a1.724 1.724 0 0 0-1.065 2.573c.893 1.542-.878 3.31-2.418 2.417a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.351 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.894-3.31-.878-2.418-2.418a1.724 1.724 0 0 0-1.065-2.572c-1.756-.427-1.756-2.924 0-3.351a1.724 1.724 0 0 0 1.065-2.573c-.893-1.542.878-3.31 2.418-2.417.996.608 2.296.057 2.572-1.065Z"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

function NavIconJobs() {
  return (
    <svg className="size-5 shrink-0 opacity-90" aria-hidden fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4"
      />
    </svg>
  );
}

function NavIconDispatch() {
  return (
    <svg className="size-5 shrink-0 opacity-90" aria-hidden fill="none" viewBox="0 0 24 24">
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M17 20h5v-2a3 3 0 0 0-5.36-1.86M17 20H7m10 0v-2c0-.66-.13-1.28-.36-1.86M7 20H2v-2a3 3 0 0 1 5.36-1.86M7 20v-2c0-.66.13-1.28.36-1.86m0 0a5 5 0 0 1 9.28 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
    </svg>
  );
}

const navIcons: Record<string, () => React.ReactElement> = {
  Dashboard: NavIconDashboard,
  "Asset Register": NavIconAssets,
  "Inspection Reports": NavIconReports,
  Certificates: NavIconCertificates,
  "Product Inspections": NavIconProducts,
  "My jobs": NavIconJobs,
  Dispatch: NavIconDispatch,
  Settings: NavIconSettings,
};

export function DashboardSidebar({
  userEmail,
  isBeenAdmin,
  isContractor = false,
}: {
  userEmail: string;
  isBeenAdmin: boolean;
  isContractor?: boolean;
}) {
  const pathname = usePathname() ?? "/";

  return (
    <aside className="flex flex-col print:hidden border-b border-navy-700/50 bg-navy text-white lg:border-b-0 lg:border-r lg:border-white/10">
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-6">
        <Link
          href="/dashboard"
          className="flex size-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15"
        >
          <span className="text-sm font-bold tracking-tight">B</span>
        </Link>
        <div>
          <p className="text-sm font-semibold tracking-tight">Been Compliance</p>
          <p className="text-[11px] font-medium uppercase tracking-wider text-white/65">TICC Platform</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-3 lg:gap-1 lg:p-4" aria-label="Primary">
        {nav
          .filter((item) => item.role === "everyone" || (item.role === "admin" ? isBeenAdmin : isContractor))
          .map((item) => {
            const Icon = navIcons[item.label] ?? NavIconDashboard;
            const active = item.match(pathname);
            const base =
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors";
            const activeCls = active
              ? "bg-white/[0.12] text-white shadow-inner ring-1 ring-white/[0.08] before:pointer-events-none before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-white before:shadow-sm relative pl-4"
              : "text-white/70 hover:bg-white/[0.06] hover:text-white";
            const content = (
              <>
                <Icon />
                {item.label}
              </>
            );
            return (
              <Link key={item.label} href={item.href} className={`${base} ${activeCls}`}>
                {content}
              </Link>
            );
          })}
      </nav>

      <div className="mt-auto border-t border-white/10 p-4">
        <p className="truncate text-xs font-medium text-white/90" title={userEmail}>
          {userEmail}
        </p>
        {isBeenAdmin ? (
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200/90">
            Been Compliance Admin
          </p>
        ) : isContractor ? (
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-200/90">Contractor</p>
        ) : (
          <p className="mt-0.5 text-[10px] text-white/55">Tenant access</p>
        )}
        <form action={signOutAction} className="mt-3">
          <button
            type="submit"
            className="text-xs font-medium text-white/70 underline-offset-4 hover:text-white hover:underline"
          >
            Sign out
          </button>
        </form>
        <p className="mt-4 hidden text-[11px] leading-relaxed text-white/55 lg:block">
          ISO-aligned inspections · UK coverage
        </p>
      </div>
    </aside>
  );
}
