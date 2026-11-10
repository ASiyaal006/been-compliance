import type { AppProfile } from "@/lib/supabase/auth";

/** Where customer logins land: their certificate portal. */
export const PORTAL_HOME = "/portal";

/**
 * A customer login is linked to one client and is neither a Been admin nor a contractor.
 * Customers use the read-only portal instead of the staff dashboard.
 */
export function isCustomerProfile(profile: Pick<AppProfile, "clientId" | "isBeenAdmin">, isContractor: boolean): boolean {
  return Boolean(profile.clientId) && !profile.isBeenAdmin && !isContractor;
}
