import "server-only";

import { isMissingTableError } from "@/lib/data/pre-use-check-queries";
import { requireAuthenticatedContext } from "@/lib/supabase/auth";
import {
  isAqlInspectionLevel,
  parseChecklist,
  parseChecklistResults,
  type AqlInspectionLevel,
  type ChecklistResults,
  type ChecklistSection,
  type DefectSeverity,
  type InspectionStage,
  type OrderStatus,
} from "@/lib/types/product-inspection";

export type ProductOrderRow = {
  id: string;
  reference: string | null;
  productName: string;
  categoryName: string;
  clientName: string | null;
  stage: InspectionStage;
  status: OrderStatus;
  targetDate: string;
  targetDateUk: string;
  factory: string;
  inspectionResult: "Pass" | "Fail" | null;
};

export type BookingFormOptions = {
  categories: { id: string; name: string }[];
  clients: { id: string; name: string }[];
  isAdmin: boolean;
  /** The customer's own client, when the user is not an admin. */
  ownClientId: string | null;
  notSetUp: boolean;
};

function formatUk(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return ymd;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))),
  );
}

type OrderListRow = {
  id: string;
  reference: string | null;
  product_name: string;
  stage: InspectionStage;
  status: OrderStatus;
  target_date: string;
  factory_name: string;
  factory_city: string | null;
  factory_country: string | null;
  inspection_result?: "Pass" | "Fail" | null;
  product_categories: { name: string } | null;
  clients: { name: string } | null;
};

export async function fetchProductOrders(): Promise<{ orders: ProductOrderRow[]; notSetUp: boolean }> {
  const { supabase } = await requireAuthenticatedContext();

  const listColumns =
    "id, reference, product_name, stage, status, target_date, factory_name, factory_city, factory_country, product_categories ( name ), clients ( name )";
  const query = (columns: string) =>
    supabase
      .from("inspection_orders")
      .select(columns)
      .order("target_date", { ascending: true })
      .order("created_at", { ascending: false });

  let { data, error } = await query(`${listColumns}, inspection_result`);
  // 42703: the inspection results SQL hasn't been run yet, so list without results.
  if (error?.code === "42703") ({ data, error } = await query(listColumns));

  if (error) {
    if (isMissingTableError(error)) return { orders: [], notSetUp: true };
    throw new Error(`Could not load inspection bookings: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as OrderListRow[];
  return {
    notSetUp: false,
    orders: rows.map((r) => ({
      id: r.id,
      reference: r.reference,
      productName: r.product_name,
      categoryName: r.product_categories?.name ?? "",
      clientName: r.clients?.name ?? null,
      stage: r.stage,
      status: r.status,
      targetDate: r.target_date,
      targetDateUk: formatUk(r.target_date),
      factory: [r.factory_name, r.factory_city, r.factory_country].filter(Boolean).join(", "),
      inspectionResult: r.inspection_result ?? null,
    })),
  };
}

export async function fetchBookingFormOptions(): Promise<BookingFormOptions> {
  const { supabase, profile } = await requireAuthenticatedContext();

  const [cats, clients] = await Promise.all([
    supabase.from("product_categories").select("id, name").order("sort_order").order("name"),
    supabase.from("clients").select("id, name").order("name"),
  ]);

  if (cats.error) {
    if (isMissingTableError(cats.error)) {
      return { categories: [], clients: [], isAdmin: profile.isBeenAdmin, ownClientId: profile.clientId, notSetUp: true };
    }
    throw new Error(`Could not load product categories: ${cats.error.message}`);
  }
  if (clients.error) {
    throw new Error(`Could not load clients: ${clients.error.message}`);
  }

  return {
    categories: cats.data ?? [],
    clients: clients.data ?? [],
    isAdmin: profile.isBeenAdmin,
    ownClientId: profile.clientId,
    notSetUp: false,
  };
}

export type DefectRow = {
  id: string;
  severity: DefectSeverity;
  description: string;
  checklistSection: string | null;
  quantity: number;
  hasPhoto: boolean;
  createdAtUk: string;
  canDelete: boolean;
};

export type ProductOrderDetail = {
  id: string;
  reference: string | null;
  productName: string;
  categoryName: string;
  clientName: string | null;
  stage: InspectionStage;
  status: OrderStatus;
  targetDateUk: string;
  poNumber: string | null;
  orderQuantity: number | null;
  factoryName: string;
  factoryAddress: string | null;
  factoryPlace: string;
  factoryContact: string | null;
  aql: { level: AqlInspectionLevel; critical: number; major: number; minor: number };
  notes: string | null;
  inspectionDate: string | null;
  inspectorName: string | null;
  inspectionResult: "Pass" | "Fail" | null;
  completedAtUk: string | null;
  checklist: ChecklistSection[];
  checklistResults: ChecklistResults;
  defects: DefectRow[];
  /** The booking's creator or a Been admin; customers viewing their client's orders can't edit. */
  canEdit: boolean;
};

const ORDER_DETAIL_COLUMNS =
  "id, reference, product_name, stage, status, target_date, po_number, order_quantity, factory_name, factory_address, factory_city, factory_country, factory_contact, aql_inspection_level, aql_critical, aql_major, aql_minor, notes, inspection_date, inspector_name, inspection_result, completed_at, checklist_results, created_by, product_categories ( name ), clients ( name ), inspection_templates ( checklist )";

type OrderDetailRow = {
  id: string;
  reference: string | null;
  product_name: string;
  stage: InspectionStage;
  status: OrderStatus;
  target_date: string;
  po_number: string | null;
  order_quantity: number | null;
  factory_name: string;
  factory_address: string | null;
  factory_city: string | null;
  factory_country: string | null;
  factory_contact: string | null;
  aql_inspection_level: string;
  aql_critical: number | string;
  aql_major: number | string;
  aql_minor: number | string;
  notes: string | null;
  inspection_date: string | null;
  inspector_name: string | null;
  inspection_result: "Pass" | "Fail" | null;
  completed_at: string | null;
  checklist_results: unknown;
  created_by: string;
  product_categories: { name: string } | null;
  clients: { name: string } | null;
  inspection_templates: { checklist: unknown } | null;
};

/** Loads one booking with its checklist and defects; null when missing or not visible. */
export async function fetchProductOrder(
  id: string,
): Promise<{ order: ProductOrderDetail | null; notSetUp: boolean }> {
  const { supabase, user, profile } = await requireAuthenticatedContext();

  const [orderRes, defectsRes] = await Promise.all([
    supabase.from("inspection_orders").select(ORDER_DETAIL_COLUMNS).eq("id", id).maybeSingle(),
    supabase
      .from("defect_logs")
      .select("id, severity, description, checklist_section, quantity, photo_url, created_by, created_at")
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (orderRes.error) {
    // 42703: a column from the inspection results SQL is missing.
    if (isMissingTableError(orderRes.error) || orderRes.error.code === "42703") return { order: null, notSetUp: true };
    throw new Error(`Could not load the booking: ${orderRes.error.message}`);
  }
  if (defectsRes.error) throw new Error(`Could not load defects: ${defectsRes.error.message}`);

  const r = orderRes.data as unknown as OrderDetailRow | null;
  if (!r) return { order: null, notSetUp: false };

  const canEdit = profile.isBeenAdmin || r.created_by === user.id;
  const level = isAqlInspectionLevel(r.aql_inspection_level) ? r.aql_inspection_level : "II";

  return {
    notSetUp: false,
    order: {
      id: r.id,
      reference: r.reference,
      productName: r.product_name,
      categoryName: r.product_categories?.name ?? "",
      clientName: r.clients?.name ?? null,
      stage: r.stage,
      status: r.status,
      targetDateUk: formatUk(r.target_date),
      poNumber: r.po_number,
      orderQuantity: r.order_quantity,
      factoryName: r.factory_name,
      factoryAddress: r.factory_address,
      factoryPlace: [r.factory_city, r.factory_country].filter(Boolean).join(", "),
      factoryContact: r.factory_contact,
      aql: {
        level,
        critical: Number(r.aql_critical),
        major: Number(r.aql_major),
        minor: Number(r.aql_minor),
      },
      notes: r.notes,
      inspectionDate: r.inspection_date,
      inspectorName: r.inspector_name,
      inspectionResult: r.inspection_result,
      completedAtUk: r.completed_at ? formatUk(r.completed_at.slice(0, 10)) : null,
      checklist: parseChecklist(r.inspection_templates?.checklist),
      checklistResults: parseChecklistResults(r.checklist_results),
      defects: (defectsRes.data ?? []).map((d) => ({
        id: d.id,
        severity: d.severity,
        description: d.description,
        checklistSection: d.checklist_section,
        quantity: d.quantity,
        hasPhoto: Boolean(d.photo_url),
        createdAtUk: formatUk(d.created_at.slice(0, 10)),
        canDelete: profile.isBeenAdmin || d.created_by === user.id,
      })),
      canEdit,
    },
  };
}
