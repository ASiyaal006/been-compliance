import type { ReactNode } from "react";
import { Suspense } from "react";
import { DbConnectionBanner } from "@/components/db-connection-banner";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { AccountAccessBanner } from "@/components/account-access-banner";
import { requireAuthenticatedContext } from "@/lib/supabase/auth";

async function DashboardChrome({ children }: { children: ReactNode }) {
  const { user, profile, profileError } = await requireAuthenticatedContext();

  return (
    <div className="grid min-h-dvh grid-cols-1 bg-slate-100 font-sans lg:grid-cols-[16rem_1fr]">
      <DashboardSidebar userEmail={user.email ?? ""} isBeenAdmin={profile.isBeenAdmin} />
      <div className="flex min-h-0 flex-col bg-slate-100">
        <AccountAccessBanner profile={profile} profileError={profileError} />
        <Suspense fallback={null}>
          <DbConnectionBanner />
        </Suspense>
        {children}
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<DashboardLayoutFallback />}>
      <DashboardChrome>{children}</DashboardChrome>
    </Suspense>
  );
}

function DashboardLayoutFallback() {
  return (
    <div className="grid min-h-dvh grid-cols-1 bg-slate-100 lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r border-navy-700/50 bg-navy lg:block" aria-hidden />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12" aria-busy="true">
        <div
          className="size-10 animate-spin rounded-full border-2 border-slate-200 border-t-navy"
          aria-hidden
        />
        <p className="text-sm font-medium text-slate-muted">Loading dashboard…</p>
      </div>
    </div>
  );
}
