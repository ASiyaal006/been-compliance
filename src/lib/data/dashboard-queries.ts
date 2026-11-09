import "server-only";

import { isMissingTableError } from "@/lib/data/pre-use-check-queries";
import { todayUk } from "@/lib/expiry";
import { isPreUseAnswer, type PreUseItemAnswer } from "@/lib/pre-use-checks";
import { requireAuthenticatedContext } from "@/lib/supabase/auth";
import { isFailureOutcome } from "@/lib/types/inspection";
import { INSPECTION_TYPE_CONFIG, inspectionTypeOf } from "@/lib/types/inspection-types";
import { isMachineryType } from "@/lib/types/machinery";

/** One thing on the dashboard that needs doing by a date: an asset inspection or a factory booking. */
export type DueItem = {
  kind: "asset" | "product";
  id: string;
  href: string;
  label: string;
  /** Machinery type, or the product and stage for a factory booking. */
  what: string;
  client: string;
  site: string;
  dueDate: string;
  dueUk: string;
  /** Days until due; negative when overdue. */
  daysUntilDue: number;
};

export type OpenDefect = {
  kind: "inspection" | "pre-use" | "product";
  id: string;
  href: string;
  label: string;
  client: string;
  /** Short heading, e.g. "Failed LOLER thorough examination". */
  title: string;
  /** What was found. */
  detail: string;
  foundUk: string;
  foundOn: string;
  /** "Remedy by" date for inspection defects, when one was given. */
  remedyByUk: string | null;
  remedyOverdue: boolean;
  /** True when equipment should not be used (failed exam or pre-use fault). */
  stopUse: boolean;
};

export type DashboardData = {
  today: string;
  monthLabel: string;
  overdue: DueItem[];
  dueThisMonth: DueItem[];
  openDefects: OpenDefect[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

function ymdToUtcMs(ymd: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function formatUk(ymd: string): string {
  const ms = ymdToUtcMs(ymd);
  if (ms === null) return ymd;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(ms));
}

function daysBetween(fromYmd: string, toYmd: string): number {
  return Math.round(((ymdToUtcMs(toYmd) ?? 0) - (ymdToUtcMs(fromYmd) ?? 0)) / DAY_MS);
}

/** Last day of the month that `today` falls in, as YYYY-MM-DD. */
export function endOfMonth(today: string): string {
  const [y, m] = today.split("-").map(Number);
  const last = new Date(Date.UTC(y!, m!, 0));
  return last.toISOString().slice(0, 10);
}

function monthLabelOf(today: string): string {
  const ms = ymdToUtcMs(today) ?? Date.now();
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(ms),
  );
}

/** Statuses where a factory booking no longer needs doing. */
const CLOSED_ORDER_STATUSES = new Set(["Report issued", "Cancelled"]);

type AssetRow = {
  id: string;
  asset_id_serial: string;
  machinery_type: string;
  site_location: string | null;
  next_inspection_due: string | null;
  clients: { name: string } | null;
};

type InspectionRow = {
  asset_id: string;
  outcome: string;
  inspection_date: string;
  inspection_type?: string | null;
  defects: string | null;
  defect_remedy_by: string | null;
  reference: string | null;
};

type PreUseRow = {
  id: string;
  asset_id: string;
  checked_on: string;
  checked_by: string;
  result: string;
  items: unknown;
  fault_notes: string | null;
};

type OrderRow = {
  id: string;
  reference: string | null;
  product_name: string;
  stage: string;
  status: string;
  target_date: string;
  factory_name: string;
  inspection_result?: string | null;
  clients: { name: string } | null;
};

type DefectCountRow = { order_id: string; severity: string; quantity: number };

async function loadInspections(
  sb: Awaited<ReturnType<typeof requireAuthenticatedContext>>["supabase"],
  assetIds: string[],
): Promise<InspectionRow[]> {
  if (assetIds.length === 0) return [];
  const base = "asset_id, outcome, inspection_date, defects, defect_remedy_by, reference";
  const query = (columns: string) =>
    sb.from("inspections").select(columns).in("asset_id", assetIds).order("inspection_date", { ascending: false });

  let { data, error } = await query(`${base}, inspection_type`);
  // 42703: the inspection types SQL hasn't been run, so treat every row as a thorough examination.
  if (error?.code === "42703") ({ data, error } = await query(base));
  if (error) throw new Error(`Could not load inspections: ${error.message}`);
  return (data ?? []) as unknown as InspectionRow[];
}

async function loadPreUseChecks(
  sb: Awaited<ReturnType<typeof requireAuthenticatedContext>>["supabase"],
  assetIds: string[],
): Promise<PreUseRow[]> {
  if (assetIds.length === 0) return [];
  const { data, error } = await sb
    .from("pre_use_checks")
    .select("id, asset_id, checked_on, checked_by, result, items, fault_notes")
    .in("asset_id", assetIds)
    .order("checked_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(`Could not load pre-use checks: ${error.message}`);
  }
  return (data ?? []) as unknown as PreUseRow[];
}

async function loadOrders(
  sb: Awaited<ReturnType<typeof requireAuthenticatedContext>>["supabase"],
): Promise<OrderRow[]> {
  const base = "id, reference, product_name, stage, status, target_date, factory_name, clients ( name )";
  const query = (columns: string) =>
    sb.from("inspection_orders").select(columns).order("target_date", { ascending: true });

  let { data, error } = await query(`${base}, inspection_result`);
  if (error?.code === "42703") ({ data, error } = await query(base));
  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(`Could not load inspection bookings: ${error.message}`);
  }
  return (data ?? []) as unknown as OrderRow[];
}

async function loadDefectCounts(
  sb: Awaited<ReturnType<typeof requireAuthenticatedContext>>["supabase"],
  orderIds: string[],
): Promise<DefectCountRow[]> {
  if (orderIds.length === 0) return [];
  const { data, error } = await sb
    .from("defect_logs")
    .select("order_id, severity, quantity")
    .in("order_id", orderIds);
  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(`Could not load defects: ${error.message}`);
  }
  return (data ?? []) as unknown as DefectCountRow[];
}

function faultItemsFrom(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return (items as Partial<PreUseItemAnswer>[])
    .filter((i) => isPreUseAnswer(i?.answer) && i.answer === "Fault" && typeof i.item === "string")
    .map((i) => i.item as string);
}

function byDueDate(a: DueItem, b: DueItem): number {
  return a.daysUntilDue - b.daysUntilDue || a.label.localeCompare(b.label);
}

/**
 * Everything the dashboard shows. Row level security decides what each user sees,
 * so a customer or contractor only gets their own assets and bookings.
 *
 * Overdue: asset due date has passed, or a factory booking's target date has passed and no report is issued.
 * Due this month: due from today to the end of this calendar month (UK time).
 * Open defects: an inspection type whose latest result on an asset failed or listed defects with a remedy date;
 * a pre-use check fault not yet followed by an inspection; a failed factory inspection not yet cancelled.
 */
export async function fetchDashboardData(): Promise<DashboardData> {
  const { supabase: sb } = await requireAuthenticatedContext();
  const today = todayUk();
  const monthEnd = endOfMonth(today);

  const { data: assetData, error: assetError } = await sb
    .from("assets")
    .select("id, asset_id_serial, machinery_type, site_location, next_inspection_due, clients!assets_client_id_fkey ( name )");
  if (assetError && !(assetError.code === "PGRST301" || assetError.message.toLowerCase().includes("permission"))) {
    throw new Error(`Could not load assets: ${assetError.message}`);
  }
  const assets = (assetData ?? []) as unknown as AssetRow[];
  const assetIds = assets.map((a) => a.id);

  const [inspections, preUseChecks, orders] = await Promise.all([
    loadInspections(sb, assetIds),
    loadPreUseChecks(sb, assetIds),
    loadOrders(sb),
  ]);
  const failedOrders = orders.filter((o) => o.inspection_result === "Fail" && o.status !== "Cancelled");
  const defectCounts = await loadDefectCounts(
    sb,
    failedOrders.map((o) => o.id),
  );

  const overdue: DueItem[] = [];
  const dueThisMonth: DueItem[] = [];
  const openDefects: OpenDefect[] = [];

  // Asset due dates
  for (const a of assets) {
    if (!a.next_inspection_due) continue;
    const due = a.next_inspection_due.slice(0, 10);
    if (due > monthEnd) continue;
    const item: DueItem = {
      kind: "asset",
      id: a.id,
      href: `/assets/${encodeURIComponent(a.id)}`,
      label: a.asset_id_serial,
      what: isMachineryType(a.machinery_type) ? a.machinery_type : "Other",
      client: a.clients?.name ?? "",
      site: a.site_location ?? "",
      dueDate: due,
      dueUk: formatUk(due),
      daysUntilDue: daysBetween(today, due),
    };
    (due < today ? overdue : dueThisMonth).push(item);
  }

  // Factory booking target dates
  for (const o of orders) {
    if (CLOSED_ORDER_STATUSES.has(o.status) || o.target_date > monthEnd) continue;
    const item: DueItem = {
      kind: "product",
      id: o.id,
      href: `/product-inspections/${encodeURIComponent(o.id)}`,
      label: o.reference || o.product_name,
      what: `${o.product_name} · ${o.stage}`,
      client: o.clients?.name ?? "",
      site: o.factory_name,
      dueDate: o.target_date,
      dueUk: formatUk(o.target_date),
      daysUntilDue: daysBetween(today, o.target_date),
    };
    (o.target_date < today ? overdue : dueThisMonth).push(item);
  }

  // Inspection defects: the latest result of each inspection type on each asset.
  const assetById = new Map(assets.map((a) => [a.id, a]));
  const latestByAssetAndType = new Map<string, InspectionRow>();
  const latestInspectionDate = new Map<string, string>();
  for (const i of inspections) {
    const key = `${i.asset_id}|${inspectionTypeOf(i.inspection_type)}`;
    if (!latestByAssetAndType.has(key)) latestByAssetAndType.set(key, i);
    const prev = latestInspectionDate.get(i.asset_id);
    if (!prev || i.inspection_date > prev) latestInspectionDate.set(i.asset_id, i.inspection_date);
  }
  for (const i of latestByAssetAndType.values()) {
    const asset = assetById.get(i.asset_id);
    if (!asset) continue;
    const failed = isFailureOutcome(i.outcome);
    const defects = i.defects?.trim() ?? "";
    if (!failed && !(defects && i.defect_remedy_by)) continue;
    const typeLabel = INSPECTION_TYPE_CONFIG[inspectionTypeOf(i.inspection_type)].label;
    const remedyBy = i.defect_remedy_by?.slice(0, 10) ?? null;
    openDefects.push({
      kind: "inspection",
      id: `${i.asset_id}-${typeLabel}`,
      href: `/assets/${encodeURIComponent(i.asset_id)}`,
      label: asset.asset_id_serial,
      client: asset.clients?.name ?? "",
      title: failed ? `Failed ${typeLabel}` : `Defect noted on ${typeLabel}`,
      detail: defects || "No defect details recorded",
      foundOn: i.inspection_date.slice(0, 10),
      foundUk: formatUk(i.inspection_date),
      remedyByUk: remedyBy ? formatUk(remedyBy) : null,
      remedyOverdue: !!remedyBy && remedyBy < today,
      stopUse: failed,
    });
  }

  // Pre-use faults: the latest check on an asset found a fault and no inspection has happened since.
  const seenPreUse = new Set<string>();
  for (const c of preUseChecks) {
    if (seenPreUse.has(c.asset_id)) continue;
    seenPreUse.add(c.asset_id);
    if (c.result !== "Fault") continue;
    const asset = assetById.get(c.asset_id);
    if (!asset) continue;
    const lastInspection = latestInspectionDate.get(c.asset_id);
    if (lastInspection && lastInspection.slice(0, 10) > c.checked_on.slice(0, 10)) continue;
    const faults = faultItemsFrom(c.items);
    const detail = [faults.join("; "), c.fault_notes?.trim()].filter(Boolean).join(" · ");
    openDefects.push({
      kind: "pre-use",
      id: c.id,
      href: `/assets/${encodeURIComponent(c.asset_id)}`,
      label: asset.asset_id_serial,
      client: asset.clients?.name ?? "",
      title: `Pre-use check fault (by ${c.checked_by})`,
      detail: detail || "Fault reported",
      foundOn: c.checked_on.slice(0, 10),
      foundUk: formatUk(c.checked_on),
      remedyByUk: null,
      remedyOverdue: false,
      stopUse: true,
    });
  }

  // Failed factory inspections
  const countsByOrder = new Map<string, Record<string, number>>();
  for (const d of defectCounts) {
    const counts = countsByOrder.get(d.order_id) ?? {};
    counts[d.severity] = (counts[d.severity] ?? 0) + (d.quantity || 1);
    countsByOrder.set(d.order_id, counts);
  }
  for (const o of failedOrders) {
    const counts = countsByOrder.get(o.id) ?? {};
    const summary = (["Critical", "Major", "Minor"] as const)
      .filter((s) => counts[s])
      .map((s) => `${counts[s]} ${s.toLowerCase()}`)
      .join(", ");
    openDefects.push({
      kind: "product",
      id: o.id,
      href: `/product-inspections/${encodeURIComponent(o.id)}`,
      label: o.reference || o.product_name,
      client: o.clients?.name ?? "",
      title: `Failed ${o.stage} at ${o.factory_name}`,
      detail: summary ? `${o.product_name}: ${summary} defects` : `${o.product_name}: failed checklist`,
      foundOn: o.target_date,
      foundUk: formatUk(o.target_date),
      remedyByUk: null,
      remedyOverdue: false,
      stopUse: false,
    });
  }

  overdue.sort(byDueDate);
  dueThisMonth.sort(byDueDate);
  // Stop-use first, then overdue remedies, then newest.
  openDefects.sort(
    (a, b) =>
      Number(b.stopUse) - Number(a.stopUse) ||
      Number(b.remedyOverdue) - Number(a.remedyOverdue) ||
      b.foundOn.localeCompare(a.foundOn),
  );

  return { today, monthLabel: monthLabelOf(today), overdue, dueThisMonth, openDefects };
}
