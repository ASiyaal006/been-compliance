import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddCustomerLoginForm, CustomerLoginActions } from "@/components/customer-admin";
import { fetchCustomersPage } from "@/lib/data/customer-queries";
import { requireAuthenticatedContext } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Customers · Been Compliance" };

export default async function CustomersPage() {
  const { profile } = await requireAuthenticatedContext();
  if (!profile.isBeenAdmin) notFound();

  const { groups, serviceKeyMissing } = await fetchCustomersPage();
  const withLogins = groups.filter((g) => g.logins.length > 0);
  const loginCount = withLogins.reduce((n, g) => n + g.logins.length, 0);

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 shadow-sm md:px-8">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-[#002147]">Customers</h1>
          <p className="hidden text-[12px] text-slate-muted sm:block">
            Portal logins so customers download their own certificates
          </p>
        </div>
      </header>

      <main className="flex-1 space-y-6 overflow-auto p-4 md:p-8">
        {serviceKeyMissing ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
            The Supabase service key isn&apos;t set for this app, so customer logins can&apos;t be listed or invited.
          </div>
        ) : null}

        <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-[#002147]">
              {loginCount} portal {loginCount === 1 ? "login" : "logins"}
            </h2>
            <p className="text-sm text-slate-muted">
              Each login sees only its own company&apos;s equipment, certificates and product inspection reports. They
              can view and download, but not change anything.
            </p>
          </div>
          {withLogins.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-slate-muted">
              No customer logins yet. Invite someone below.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {withLogins.map((g) => (
                <li key={g.clientId} className="px-6 py-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-muted">{g.clientName}</p>
                  <ul className="mt-2 space-y-4">
                    {g.logins.map((l) => (
                      <li key={l.userId} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-medium text-[#002147]">{l.name}</p>
                          <p className="truncate text-sm text-slate-muted">{l.email}</p>
                        </div>
                        <div className="flex shrink-0 flex-col gap-1 sm:items-end">
                          <span className="text-xs text-slate-500">
                            {l.lastSignInUk ? `Last signed in ${l.lastSignInUk}` : "Never signed in"}
                          </span>
                          <CustomerLoginActions userId={l.userId} name={l.name} invitePending={l.invitePending} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>

        {!serviceKeyMissing ? (
          <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-base font-semibold text-[#002147]">Invite a customer</h2>
            </div>
            <AddCustomerLoginForm clients={groups.map((g) => ({ id: g.clientId, name: g.clientName }))} />
          </section>
        ) : null}
      </main>
    </>
  );
}
