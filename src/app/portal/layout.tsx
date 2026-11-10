import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { signOutAction } from "@/actions/auth";
import Link from "next/link";
import { findContractorForUser } from "@/lib/contractors";
import { isCustomerProfile, PORTAL_HOME } from "@/lib/customers";
import { requireAuthenticatedContext } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Certificates · Been Compliance" };

/** Read-only portal for customer logins. Staff and contractors are sent to the dashboard. */
export default async function PortalLayout({ children }: { children: ReactNode }) {
  const { supabase, user, profile } = await requireAuthenticatedContext();
  const isContractor = !profile.isBeenAdmin && (await findContractorForUser(supabase, user.id)) !== null;
  if (!isCustomerProfile(profile, isContractor)) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col bg-slate-100 font-sans print:block print:min-h-0 print:bg-white">
      <div className="bg-navy text-white print:hidden">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 md:px-8">
          <Link href={PORTAL_HOME} className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-white/10 text-sm font-bold ring-1 ring-white/15">
              B
            </span>
            <span className="text-sm font-semibold tracking-tight">Been Compliance</span>
          </Link>
          <div className="flex min-w-0 items-center gap-4">
            <span className="hidden truncate text-xs text-white/70 sm:inline" title={user.email ?? ""}>
              {user.email}
            </span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="text-xs font-medium text-white/80 underline-offset-4 hover:text-white hover:underline"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col print:block">{children}</div>
    </div>
  );
}
