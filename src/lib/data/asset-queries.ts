import "server-only";

import type { InspectionTimelineEntry } from "@/lib/assets";
import { getAssetById as getLegacyAssetById } from "@/lib/assets";
import {
  isFailureOutcome,
  isMonitorOutcome,
  isPassOutcome,
  outcomeLabel,
} from "@/lib/types/inspection";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MachineryTypeDb } from "@/lib/types/machinery";
import { requireAuthenticatedContext } from "@/lib/supabase/auth";
import type { Database } from "@/lib/supabase/database.types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ASSET_LIST_SELECT =
  "id, asset_id_serial, machinery_type, site_location, next_inspection_due, clients!assets_client_id_fkey ( name )" as const;

const ASSET_DETAIL_SELECT =
  "id, asset_id_serial, machinery_type, site_location, next_inspection_due, commissioning_date, swl, clients!assets_client_id_fkey ( name )" as const;

type AssetListRow = Database["public"]["Tables"]["assets"]["Row"] & {
  clients: { name: string } | null;
};

type AssetDetailRow = AssetListRow & {
  commissioning_date: string;
  swl: string | null;
};

type InspectionRowDb = Pick<
  Database["public"]["Tables"]["inspections"]["Row"],
  "outcome" | "inspection_date" | "reference" | "examiner_notes"
>;

export function looksLikeUuid(id: string): boolean {
  return UUID_REGEX.test(id.trim());
}

function formatUkFromIsoLocal(isoOrYmd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoOrYmd);
  if (!m?.[1]) return isoOrYmd;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y + mo + d)) return isoOrYmd;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(y, mo - 1, d)));
}

export type RegisterRow = {
  id: string;
  assetLabel: string;
  machineryType: MachineryTypeDb;
  site: string;
  outcomeLabel: "Pass" | "Fail" | "Monitor" | "Pending inspection";
  nextDueUk: string;
};

function embeddedClientName(embed: AssetListRow["clients"]): string {
  if (!embed) return "Unknown client";
  return embed.name;
}

function isMachineryType(value: string): value is MachineryTypeDb {
  return value === "LOLER" || value === "PSSR" || value === "COSHH" || value === "Other";
}

export async function fetchRegisterAssets(): Promise<RegisterRow[]> {
  const { supabase: sb } = await requireAuthenticatedContext();

  const { data: rows, error } = await sb
    .from("assets")
    .select(ASSET_LIST_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    if (error.code === "PGRST301" || error.message.toLowerCase().includes("permission")) {
      return [];
    }
    throw new Error(`Could not load assets: ${error.message}`);
  }

  const assets = (rows ?? []) as unknown as AssetListRow[];
  if (assets.length === 0) return [];

  const ids = assets.map((r) => r.id);
  const inspectionsByAsset = await fetchLatestInspectionsForAssets(sb, ids);

  return assets.map((r) => {
    const machineryType = isMachineryType(r.machinery_type) ? r.machinery_type : "Other";
    const latest = inspectionsByAsset[r.id]?.[0];
    const outcome = latest?.outcome;

    return {
      id: r.id,
      assetLabel: r.asset_id_serial,
      machineryType,
      site: r.site_location ?? "",
      outcomeLabel: !outcome
        ? "Pending inspection"
        : isFailureOutcome(outcome)
          ? "Fail"
          : isMonitorOutcome(outcome)
            ? "Monitor"
            : isPassOutcome(outcome)
              ? "Pass"
              : "Pending inspection",
      nextDueUk: r.next_inspection_due
        ? formatUkFromIsoLocal(r.next_inspection_due)
        : outcome && isFailureOutcome(outcome)
          ? "Invalidated"
          : "TBC",
    };
  });
}

async function fetchLatestInspectionsForAssets(
  sb: SupabaseClient<Database>,
  assetIds: string[],
): Promise<Record<string, InspectionRowDb[]>> {
  if (assetIds.length === 0) return {};

  const { data: inspections, error } = await sb
    .from("inspections")
    .select("asset_id, outcome, inspection_date, reference, examiner_notes")
    .in("asset_id", assetIds)
    .order("inspection_date", { ascending: false });

  if (error) {
    throw new Error(`Could not load inspections: ${error.message}`);
  }

  const map: Record<string, InspectionRowDb[]> = {};

  for (const row of inspections ?? []) {
    const aid = row.asset_id;
    if (!map[aid]) map[aid] = [];
    map[aid].push({
      outcome: row.outcome,
      inspection_date: row.inspection_date,
      reference: row.reference,
      examiner_notes: row.examiner_notes,
    });
  }

  for (const key of Object.keys(map)) {
    map[key]!.sort((a, b) => b.inspection_date.localeCompare(a.inspection_date));
  }

  return map;
}

export type AssetInspectionViewModel = {
  headlineId: string;
  badge:
    | { kind: "compliant" | "defect" | "monitor"; text: string }
    | { kind: "registered"; text: string };
  clientName: string;
  machineryTypeLabel: string;
  siteLocation: string;
  fileReference: string;
  inspectionDateLine: string;
  nextDueLine: string;
  timeline: InspectionTimelineEntry[];
  /** Full history for certificate downloads (most recent first). */
  inspectionHistory: InspectionHistoryRecord[];
  serialLine: string;
  swlLine: string;
  lastTestDateLine: string;
  commissioningLine: string;
  inspectorNotes: string;
};

export type InspectionHistoryRecord = {
  date: string;
  outcome: string;
  reference: string;
  examinerNotes: string;
};

function mapInspectionHistory(inspections: InspectionRowDb[]): InspectionHistoryRecord[] {
  return inspections.map((i) => ({
    date: formatUkFromIsoLocal(i.inspection_date),
    outcome: outcomeLabel(i.outcome),
    reference: i.reference ?? "—",
    examinerNotes: i.examiner_notes?.trim() ?? "",
  }));
}

function mapInspectionsToTimeline(inspections: InspectionRowDb[]): InspectionTimelineEntry[] {
  return mapInspectionHistory(inspections).map(({ date, outcome, reference }) => ({
    date,
    outcome,
    reference,
  }));
}

function notesFromDb(latest: InspectionRowDb | undefined): string {
  if (!latest) {
    return "Asset is registered but no statutory inspection outcome is on file yet. Schedule the first periodic examination according to regime and commissioning date.";
  }
  if (latest.examiner_notes?.trim()) {
    return latest.examiner_notes.trim();
  }
  if (isFailureOutcome(latest.outcome)) {
    const ref = latest.reference ? ` (${latest.reference})` : "";
    return `Recorded fail${ref}. Client advised not to commission until corrective actions are evidenced and inspected.`;
  }
  if (isMonitorOutcome(latest.outcome)) {
    return `Outcome: monitor. Continue observation and schedule follow-up before the next statutory interval. Reference ${latest.reference ?? "on file"}.`;
  }
  const ref = latest.reference ? ` Reference ${latest.reference}.` : "";
  return `Inspection passed.${ref} Continue planned maintenance intervals and statutory renewals aligned to OEM and regulatory guidance.`;
}

export async function fetchAssetInspectionViewModel(uuid: string): Promise<AssetInspectionViewModel | null> {
  const { supabase: sb } = await requireAuthenticatedContext();

  const { data: asset, error } = await sb
    .from("assets")
    .select(ASSET_DETAIL_SELECT)
    .eq("id", uuid)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load asset: ${error.message}`);
  }
  if (!asset) return null;

  const a = asset as unknown as AssetDetailRow;

  const { data: inspRows, error: inspErr } = await sb
    .from("inspections")
    .select("outcome, inspection_date, reference, examiner_notes")
    .eq("asset_id", uuid)
    .order("inspection_date", { ascending: false });

  if (inspErr) {
    throw new Error(`Could not load inspections: ${inspErr.message}`);
  }

  const inspectionsOrdered = (inspRows ?? []) as InspectionRowDb[];

  const latest = inspectionsOrdered[0];
  const nextDueLine = a.next_inspection_due
    ? formatUkFromIsoLocal(a.next_inspection_due)
    : latest && isFailureOutcome(latest.outcome)
      ? "Invalidated"
      : "TBC";
  const assetContext = {
    assetIdSerial: a.asset_id_serial,
    machineryType: isMachineryType(a.machinery_type) ? a.machinery_type : "Other",
    siteLocation: a.site_location ?? "",
    swl: a.swl ?? "Not recorded",
    clientName: embeddedClientName(a.clients),
    nextInspectionDue: nextDueLine,
  };
  const inspectionHistory = mapInspectionHistory(inspectionsOrdered);
  const timeline = mapInspectionsToTimeline(inspectionsOrdered);

  let badge: AssetInspectionViewModel["badge"];
  if (!latest) {
    badge = { kind: "registered", text: "REGISTERED · AWAITING INSPECTION" };
  } else if (isFailureOutcome(latest.outcome)) {
    badge = { kind: "defect", text: "FAIL — ACTION REQUIRED" };
  } else if (isMonitorOutcome(latest.outcome)) {
    badge = { kind: "monitor", text: "MONITOR — UNDER REVIEW" };
  } else {
    badge = { kind: "compliant", text: "PASS — COMPLIANT" };
  }

  return {
    headlineId: a.asset_id_serial,
    badge,
    clientName: assetContext.clientName,
    machineryTypeLabel: assetContext.machineryType,
    siteLocation: assetContext.siteLocation,
    fileReference: latest?.reference ?? "— Pending issuance",
    inspectionDateLine: latest ? formatUkFromIsoLocal(latest.inspection_date) : "—",
    nextDueLine,
    timeline,
    inspectionHistory,
    serialLine: a.asset_id_serial,
    swlLine: a.swl ?? "Not recorded",
    lastTestDateLine: latest ? formatUkFromIsoLocal(latest.inspection_date) : "No inspection yet",
    commissioningLine: a.commissioning_date ? formatUkFromIsoLocal(a.commissioning_date) : "—",
    inspectorNotes: notesFromDb(latest),
  };
}

/** Legacy mock slugs (e.g. CDW-1042) when bookmarks pre-date Supabase UUIDs. */
export function fetchLegacyInspectionViewModel(slug: string): AssetInspectionViewModel | null {
  const legacy = getLegacyAssetById(slug);
  if (!legacy) return null;
  const defect = legacy.status === "Defect";

  return {
    headlineId: legacy.id,
    badge: defect
      ? { kind: "defect", text: "DEFECT DETECTED" }
      : { kind: "compliant", text: "COMPLIANT — PASSED" },
    clientName: legacy.client,
    machineryTypeLabel: legacy.type,
    siteLocation: legacy.site,
    fileReference: legacy.fileRef,
    inspectionDateLine: legacy.inspectionDate,
    nextDueLine: legacy.due,
    timeline: [...legacy.timeline],
    inspectionHistory: legacy.timeline.map((e) => ({
      date: e.date,
      outcome: e.outcome,
      reference: e.reference,
      examinerNotes: "",
    })),
    serialLine: legacy.serialNo,
    swlLine: legacy.swl,
    lastTestDateLine: legacy.lastTestDate,
    commissioningLine: "—",
    inspectorNotes: defect
      ? `Recorded defect under ${legacy.fileRef}. Client advised to withdraw from operation until corrective work is completed and witnessed re-inspection arranged.`
      : `Thorough examination completed in accordance with the applicable statutory regime. Certificate issuance recommended subject to ongoing maintenance per OEM schedule.`,
  };
}
