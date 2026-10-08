import { profileAccessError, type AppProfile } from "@/lib/supabase/auth";

export function AccountAccessBanner({
  profile,
  profileError,
  isContractor = false,
}: {
  profile: AppProfile;
  profileError: string | null;
  /** Contractors work on assigned jobs without a client link, so that warning doesn't apply. */
  isContractor?: boolean;
}) {
  const accessErr = isContractor ? null : profileAccessError(profile);

  if (!profileError && !accessErr && !profile.isFallback) {
    return null;
  }

  return (
    <div className="space-y-0">
      {profileError ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 md:px-8" role="alert">
          <span className="font-semibold">Profile setup incomplete.</span> {profileError}
          <span className="mt-1 block text-xs">
            Run the RLS migration in Supabase if you have not already, then set{" "}
            <span className="font-mono">profiles.client_id</span> or{" "}
            <span className="font-mono">is_been_admin</span> for your user.
          </span>
        </div>
      ) : null}
      {accessErr ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 md:px-8" role="alert">
          <span className="font-semibold">Limited access.</span> {accessErr}
        </div>
      ) : null}
    </div>
  );
}
