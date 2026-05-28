import { requireAuthenticatedContext } from "@/lib/supabase/auth";

export default async function SettingsPage() {
  const { user, profile } = await requireAuthenticatedContext();

  const roleLabel = profile.isBeenAdmin
    ? "Been Compliance Admin"
    : profile.clientId
      ? "Tenant user"
      : "Unassigned (limited access)";

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 shadow-sm md:px-8">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#002147]">Account settings</h1>
          <p className="hidden text-[12px] text-slate-muted sm:block">
            Your Been Compliance platform identity
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-8">
        <div className="mx-auto max-w-lg">
          <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4">
              <h2 className="text-sm font-semibold text-[#002147]">Signed-in account</h2>
              <p className="mt-0.5 text-xs text-slate-muted">Details from Supabase Auth and your profile</p>
            </div>

            <dl className="divide-y divide-slate-100 px-6 py-2">
              <div className="flex flex-col gap-1 py-4 sm:flex-row sm:justify-between sm:gap-8">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-muted">Email</dt>
                <dd className="text-sm font-medium text-[#002147]">{user.email ?? "—"}</dd>
              </div>
              <div className="flex flex-col gap-1 py-4 sm:flex-row sm:justify-between sm:gap-8">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                  Admin status
                </dt>
                <dd>
                  {profile.isBeenAdmin ? (
                    <span className="inline-flex rounded-full bg-navy/10 px-2.5 py-1 text-xs font-semibold text-navy ring-1 ring-navy/15">
                      Been Compliance Admin
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                      Standard user
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex flex-col gap-1 py-4 sm:flex-row sm:justify-between sm:gap-8">
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-muted">Access role</dt>
                <dd className="text-sm text-slate-700">{roleLabel}</dd>
              </div>
              {profile.fullName ? (
                <div className="flex flex-col gap-1 py-4 sm:flex-row sm:justify-between sm:gap-8">
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-muted">Name</dt>
                  <dd className="text-sm font-medium text-[#002147]">{profile.fullName}</dd>
                </div>
              ) : null}
              {profile.clientId && !profile.isBeenAdmin ? (
                <div className="flex flex-col gap-1 py-4 sm:flex-row sm:justify-between sm:gap-8">
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                    Client scope
                  </dt>
                  <dd className="font-mono text-xs text-slate-muted">{profile.clientId}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <p className="mt-6 text-center text-xs text-slate-muted">
            Profile changes (client assignment, admin flag) are managed in Supabase by Been Compliance.
          </p>
        </div>
      </main>
    </>
  );
}
