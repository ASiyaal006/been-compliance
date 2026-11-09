import "server-only";

import { fetchRegisterAssets, type RegisterRow } from "@/lib/data/asset-queries";
import { fetchSavedCertificates, type InspectionReportListItem } from "@/lib/data/inspection-queries";
import { fetchProductOrders, type ProductOrderRow } from "@/lib/data/product-inspection-queries";
import { compareExpiry } from "@/lib/expiry";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuthenticatedContext } from "@/lib/supabase/auth";

export type CustomerLoginRow = {
  userId: string;
  name: string;
  email: string;
  /** Invited but hasn't chosen a password yet. */
  invitePending: boolean;
  lastSignInUk: string | null;
};

export type CustomerGroup = {
  clientId: string;
  clientName: string;
  logins: CustomerLoginRow[];
};

function formatUkDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(new Date(iso));
}

/** Admin → Customers: every client with the portal logins linked to it. */
export async function fetchCustomersPage(): Promise<{ groups: CustomerGroup[]; serviceKeyMissing: boolean }> {
  const { supabase } = await requireAuthenticatedContext();

  const { data: clients, error } = await supabase.from("clients").select("id, name").order("name");
  if (error) throw new Error(`Could not load customers: ${error.message}`);

  const groups = new Map<string, CustomerGroup>(
    (clients ?? []).map((c) => [c.id, { clientId: c.id, clientName: c.name, logins: [] }]),
  );

  let admin;
  try {
    admin = createSupabaseAdmin();
  } catch {
    return { groups: [...groups.values()], serviceKeyMissing: true };
  }

  const [{ data: profiles, error: profileError }, { data: contractors }, usersRes] = await Promise.all([
    admin.from("profiles").select("id, full_name, client_id").eq("is_been_admin", false).not("client_id", "is", null),
    admin.from("contractors").select("user_id"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  if (profileError) throw new Error(`Could not load customer logins: ${profileError.message}`);

  const contractorIds = new Set((contractors ?? []).map((c) => c.user_id));
  const users = new Map((usersRes.data?.users ?? []).map((u) => [u.id, u]));

  for (const p of profiles ?? []) {
    if (!p.client_id || contractorIds.has(p.id)) continue;
    const group = groups.get(p.client_id);
    if (!group) continue;
    const u = users.get(p.id);
    group.logins.push({
      userId: p.id,
      name: p.full_name?.trim() || u?.email?.split("@")[0] || "Customer",
      email: u?.email ?? "",
      invitePending: Boolean(u?.invited_at && !u.last_sign_in_at),
      lastSignInUk: u?.last_sign_in_at ? formatUkDateTime(u.last_sign_in_at) : null,
    });
  }
  for (const g of groups.values()) g.logins.sort((a, b) => a.name.localeCompare(b.name));

  return { groups: [...groups.values()], serviceKeyMissing: false };
}

export type PortalHome = {
  clientName: string;
  assets: RegisterRow[];
  /** Uploaded certificates linked to the customer's assets that have a stored file. */
  uploaded: InspectionReportListItem[];
  /** Product inspection bookings with an issued report. */
  productReports: ProductOrderRow[];
  counts: { assets: number; overdue: number; dueSoon: number };
};

/** Everything a customer sees on their portal home. RLS limits every query to their own client. */
export async function fetchPortalHome(): Promise<PortalHome> {
  const { supabase, profile } = await requireAuthenticatedContext();

  const [clientRes, assets, uploaded, orders] = await Promise.all([
    profile.clientId
      ? supabase.from("clients").select("name").eq("id", profile.clientId).maybeSingle()
      : Promise.resolve({ data: null }),
    fetchRegisterAssets(),
    fetchSavedCertificates().catch(() => [] as InspectionReportListItem[]),
    fetchProductOrders().catch(() => ({ orders: [] as ProductOrderRow[], notSetUp: true })),
  ]);

  const sortedAssets = [...assets].sort((a, b) => compareExpiry(a.expiry, b.expiry));

  return {
    clientName: clientRes.data?.name ?? "Your company",
    assets: sortedAssets,
    uploaded: uploaded.filter((c) => c.hasFile && c.assetId),
    productReports: orders.orders.filter((o) => o.status === "Report issued"),
    counts: {
      assets: assets.length,
      overdue: assets.filter((a) => a.expiry.level === "red").length,
      dueSoon: assets.filter((a) => a.expiry.level === "yellow").length,
    },
  };
}
