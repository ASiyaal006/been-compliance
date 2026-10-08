import "server-only";

import { pendingInviteIds } from "@/lib/contractor-invite";
import { approvedFor, coversFactory, findContractorForUser } from "@/lib/contractors";
import { isMissingTableError } from "@/lib/data/pre-use-check-queries";
import { requireAuthenticatedContext } from "@/lib/supabase/auth";
import type { InspectionStage, OrderStatus } from "@/lib/types/product-inspection";

function formatUk(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return ymd;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))),
  );
}

/** 42703: contractor_id column missing; the others: contractors table missing. */
function contractorsNotSetUp(error: { code?: string }): boolean {
  return isMissingTableError(error) || error.code === "42703";
}

export type ContractorRow = {
  id: string;
  name: string;
  regions: string[];
  approvedCategories: string[];
  /** Category names; empty means all categories. */
  categoryNames: string[];
  activeJobs: number;
  userId: string;
  /** Invited but hasn't chosen a password yet (only filled in on the Contractors page). */
  invitePending: boolean;
};

type ContractorDbRow = { id: string; user_id: string; name: string; regions: string[]; approved_categories: string[] };

async function loadContractors(): Promise<{ contractors: ContractorRow[]; notSetUp: boolean }> {
  const { supabase } = await requireAuthenticatedContext();
  const [contractorsRes, categoriesRes, jobsRes] = await Promise.all([
    supabase.from("contractors").select("id, user_id, name, regions, approved_categories").order("name"),
    supabase.from("product_categories").select("id, name"),
    supabase
      .from("inspection_orders")
      .select("contractor_id")
      .in("status", ["Confirmed", "In progress"])
      .not("contractor_id", "is", null),
  ]);
  if (contractorsRes.error) {
    if (contractorsNotSetUp(contractorsRes.error)) return { contractors: [], notSetUp: true };
    throw new Error(`Could not load contractors: ${contractorsRes.error.message}`);
  }
  const categoryNames = new Map((categoriesRes.data ?? []).map((c) => [c.id, c.name]));
  const jobs = new Map<string, number>();
  for (const j of jobsRes.data ?? []) {
    if (j.contractor_id) jobs.set(j.contractor_id, (jobs.get(j.contractor_id) ?? 0) + 1);
  }
  return {
    notSetUp: false,
    contractors: ((contractorsRes.data ?? []) as ContractorDbRow[]).map((c) => ({
      id: c.id,
      name: c.name,
      regions: c.regions ?? [],
      approvedCategories: c.approved_categories ?? [],
      categoryNames: (c.approved_categories ?? []).map((id) => categoryNames.get(id) ?? "Unknown category"),
      activeJobs: jobs.get(c.id) ?? 0,
      userId: c.user_id,
      invitePending: false,
    })),
  };
}

export async function fetchContractorsPage(): Promise<{
  contractors: ContractorRow[];
  categories: { id: string; name: string }[];
  notSetUp: boolean;
}> {
  const { supabase } = await requireAuthenticatedContext();
  const [{ contractors, notSetUp }, cats] = await Promise.all([
    loadContractors(),
    supabase.from("product_categories").select("id, name").order("sort_order").order("name"),
  ]);
  const pending = await pendingInviteIds(contractors.map((c) => c.userId));
  return {
    contractors: contractors.map((c) => ({ ...c, invitePending: pending.has(c.userId) })),
    notSetUp,
    categories: cats.data ?? [],
  };
}

export type DispatchOption = { id: string; name: string; coversRegion: boolean; activeJobs: number };

export type DispatchOrder = {
  id: string;
  reference: string | null;
  productName: string;
  categoryName: string;
  clientName: string | null;
  stage: InspectionStage;
  status: OrderStatus;
  targetDateUk: string;
  factory: string;
  contractorId: string | null;
  contractorName: string | null;
  /** Contractors approved for this order's category; ones covering the factory's region first. */
  options: DispatchOption[];
};

type DispatchDbRow = {
  id: string;
  reference: string | null;
  product_name: string;
  category_id: string;
  stage: InspectionStage;
  status: OrderStatus;
  target_date: string;
  factory_name: string;
  factory_city: string | null;
  factory_country: string | null;
  contractor_id: string | null;
  product_categories: { name: string } | null;
  clients: { name: string } | null;
};

/** Requested jobs to assign, and confirmed jobs that haven't started (so they can be reassigned). */
export async function fetchDispatchBoard(): Promise<{
  toAssign: DispatchOrder[];
  assigned: DispatchOrder[];
  contractorCount: number;
  notSetUp: boolean;
}> {
  const { supabase } = await requireAuthenticatedContext();
  const [{ contractors, notSetUp }, ordersRes] = await Promise.all([
    loadContractors(),
    supabase
      .from("inspection_orders")
      .select(
        "id, reference, product_name, category_id, stage, status, target_date, factory_name, factory_city, factory_country, contractor_id, product_categories ( name ), clients ( name )",
      )
      .in("status", ["Requested", "Confirmed"])
      .order("target_date", { ascending: true }),
  ]);
  if (notSetUp) return { toAssign: [], assigned: [], contractorCount: 0, notSetUp: true };
  if (ordersRes.error) {
    if (contractorsNotSetUp(ordersRes.error)) return { toAssign: [], assigned: [], contractorCount: 0, notSetUp: true };
    throw new Error(`Could not load bookings: ${ordersRes.error.message}`);
  }

  const byId = new Map(contractors.map((c) => [c.id, c]));
  const orders = ((ordersRes.data ?? []) as unknown as DispatchDbRow[]).map((r): DispatchOrder => {
    const place = { city: r.factory_city, country: r.factory_country };
    const options = contractors
      .filter((c) => approvedFor(c.approvedCategories, r.category_id) || c.id === r.contractor_id)
      .map((c) => ({ id: c.id, name: c.name, coversRegion: coversFactory(c.regions, place), activeJobs: c.activeJobs }))
      .sort((a, b) => Number(b.coversRegion) - Number(a.coversRegion) || a.activeJobs - b.activeJobs || a.name.localeCompare(b.name));
    return {
      id: r.id,
      reference: r.reference,
      productName: r.product_name,
      categoryName: r.product_categories?.name ?? "",
      clientName: r.clients?.name ?? null,
      stage: r.stage,
      status: r.status,
      targetDateUk: formatUk(r.target_date),
      factory: [r.factory_name, r.factory_city, r.factory_country].filter(Boolean).join(", "),
      contractorId: r.contractor_id,
      contractorName: r.contractor_id ? (byId.get(r.contractor_id)?.name ?? "Removed contractor") : null,
      options,
    };
  });

  return {
    notSetUp: false,
    contractorCount: contractors.length,
    toAssign: orders.filter((o) => o.status === "Requested"),
    assigned: orders.filter((o) => o.status === "Confirmed"),
  };
}

export type QueueJob = {
  id: string;
  productName: string;
  categoryName: string;
  stage: InspectionStage;
  status: OrderStatus;
  targetDate: string;
  targetDateUk: string;
  factory: string;
  factoryAddress: string | null;
  factoryContact: string | null;
  inspectionResult: "Pass" | "Fail" | null;
};

type QueueDbRow = {
  id: string;
  product_name: string;
  stage: InspectionStage;
  status: OrderStatus;
  target_date: string;
  factory_name: string;
  factory_address: string | null;
  factory_city: string | null;
  factory_country: string | null;
  factory_contact: string | null;
  inspection_result: "Pass" | "Fail" | null;
  product_categories: { name: string } | null;
};

/** Jobs assigned to the signed-in contractor; contractor is null when the user isn't one. */
export async function fetchMyJobs(): Promise<{
  contractor: { id: string; name: string } | null;
  jobs: QueueJob[];
}> {
  const { supabase, user } = await requireAuthenticatedContext();
  const contractor = await findContractorForUser(supabase, user.id);
  if (!contractor) return { contractor: null, jobs: [] };

  const { data, error } = await supabase
    .from("inspection_orders")
    .select(
      "id, product_name, stage, status, target_date, factory_name, factory_address, factory_city, factory_country, factory_contact, inspection_result, product_categories ( name )",
    )
    .eq("contractor_id", contractor.id)
    .neq("status", "Cancelled")
    .order("target_date", { ascending: true });
  if (error) throw new Error(`Could not load your jobs: ${error.message}`);

  return {
    contractor,
    jobs: ((data ?? []) as unknown as QueueDbRow[]).map((r) => ({
      id: r.id,
      productName: r.product_name,
      categoryName: r.product_categories?.name ?? "",
      stage: r.stage,
      status: r.status,
      targetDate: r.target_date,
      targetDateUk: formatUk(r.target_date),
      factory: [r.factory_name, r.factory_city, r.factory_country].filter(Boolean).join(", "),
      factoryAddress: r.factory_address,
      factoryContact: r.factory_contact,
      inspectionResult: r.inspection_result,
    })),
  };
}
