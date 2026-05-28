import "server-only";

import { outcomeLabel } from "@/lib/types/inspection";
import { requireAuthenticatedContext } from "@/lib/supabase/auth";

const INSPECTION_REPORT_SELECT = `
  id,
  inspection_date,
  outcome,
  reference,
  examiner_notes,
  created_at,
  assets!inspections_asset_id_fkey (
    id,
    asset_id_serial,
    machinery_type,
    site_location,
    clients!assets_client_id_fkey ( name )
  )
` as const;

type InspectionReportRow = {
  id: string;
  inspection_date: string;
  outcome: string;
  reference: string | null;
  examiner_notes: string | null;
  created_at: string;
  assets: {
    id: string;
    asset_id_serial: string;
    machinery_type: string;
    site_location: string | null;
    clients: { name: string } | null;
  } | null;
};

function formatUkFromIsoLocal(isoOrYmd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoOrYmd);
  if (!m?.[1]) return isoOrYmd;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(y, mo - 1, d)));
}

export type InspectionReportListItem = {
  id: string;
  inspectionDateUk: string;
  outcome: string;
  outcomeLabel: string;
  reference: string;
  notesPreview: string;
  assetId: string;
  assetLabel: string;
  machineryType: string;
  site: string;
  clientName: string;
};

export async function fetchAllInspectionReports(): Promise<InspectionReportListItem[]> {
  const { supabase: sb } = await requireAuthenticatedContext();

  const { data: rows, error } = await sb
    .from("inspections")
    .select(INSPECTION_REPORT_SELECT)
    .order("inspection_date", { ascending: false });

  if (error) {
    throw new Error(`Could not load inspection reports: ${error.message}`);
  }

  return ((rows ?? []) as unknown as InspectionReportRow[]).map((row) => {
    const asset = row.assets;
    const notes = row.examiner_notes?.trim() ?? "";
    return {
      id: row.id,
      inspectionDateUk: formatUkFromIsoLocal(row.inspection_date),
      outcome: row.outcome,
      outcomeLabel: outcomeLabel(row.outcome),
      reference: row.reference ?? "—",
      notesPreview: notes.length > 80 ? `${notes.slice(0, 80)}…` : notes || "—",
      assetId: asset?.id ?? "",
      assetLabel: asset?.asset_id_serial ?? "Unknown asset",
      machineryType: asset?.machinery_type ?? "—",
      site: asset?.site_location ?? "—",
      clientName: asset?.clients?.name ?? "Unknown client",
    };
  });
}
