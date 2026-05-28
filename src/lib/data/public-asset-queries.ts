import "server-only";

import {
  isFailureOutcome,
  isMonitorOutcome,
  isPassOutcome,
  outcomeLabel,
} from "@/lib/types/inspection";
/** Public QR route only — service role bypasses RLS (server-side, never sent to the browser). */
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { looksLikeUuid } from "@/lib/data/asset-queries";

const PUBLIC_ASSET_SELECT =
  "id, asset_id_serial, machinery_type, site_location, swl, next_inspection_due, clients!assets_client_id_fkey ( name )" as const;

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

export type PublicSafetyStatus = "safe" | "unsafe" | "monitor" | "unknown";

export type PublicAssetProfile = {
  assetId: string;
  serial: string;
  machineryType: string;
  swl: string;
  siteLocation: string;
  clientName: string;
  outcomeLabel: string;
  nextDueUk: string;
  safetyStatus: PublicSafetyStatus;
  safetyHeadline: string;
  safetyDetail: string;
};

function resolveSafety(
  outcome: string | undefined,
  hasInspection: boolean,
): Pick<PublicAssetProfile, "safetyStatus" | "safetyHeadline" | "safetyDetail" | "outcomeLabel"> {
  if (!hasInspection || !outcome) {
    return {
      outcomeLabel: "Not inspected",
      safetyStatus: "unknown",
      safetyHeadline: "Not verified",
      safetyDetail:
        "No statutory inspection is on file for this asset. Do not assume it is safe to use until verified by Been Compliance.",
    };
  }

  const label = outcomeLabel(outcome);

  if (isFailureOutcome(outcome)) {
    return {
      outcomeLabel: label,
      safetyStatus: "unsafe",
      safetyHeadline: "Do not use",
      safetyDetail:
        "Latest inspection outcome is Fail. This equipment must not be commissioned until remedial work is completed and a passing inspection is recorded.",
    };
  }

  if (isMonitorOutcome(outcome)) {
    return {
      outcomeLabel: label,
      safetyStatus: "monitor",
      safetyHeadline: "Use with caution",
      safetyDetail:
        "Latest outcome is Monitor. Operate only within documented restrictions and ensure follow-up inspection is scheduled before the due date.",
    };
  }

  if (isPassOutcome(outcome)) {
    return {
      outcomeLabel: label,
      safetyStatus: "safe",
      safetyHeadline: "Safe to use",
      safetyDetail:
        "Latest statutory inspection is Pass. Continue normal operation subject to site rules, OEM guidance, and the next due inspection date shown below.",
    };
  }

  return {
    outcomeLabel: label,
    safetyStatus: "unknown",
    safetyHeadline: "Review required",
    safetyDetail: "Inspection outcome could not be classified. Contact Been Compliance before use.",
  };
}

export async function fetchPublicAssetProfile(assetId: string): Promise<PublicAssetProfile | null> {
  if (!looksLikeUuid(assetId)) return null;

  const sb = createSupabaseAdmin();

  const { data: asset, error } = await sb
    .from("assets")
    .select(PUBLIC_ASSET_SELECT)
    .eq("id", assetId)
    .maybeSingle();

  if (error || !asset) return null;

  const { data: latestInsp } = await sb
    .from("inspections")
    .select("outcome, inspection_date")
    .eq("asset_id", assetId)
    .order("inspection_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const outcome = latestInsp?.outcome;
  const safety = resolveSafety(outcome, Boolean(latestInsp));

  const clientEmbed = asset.clients as { name: string } | null;

  return {
    assetId: asset.id,
    serial: asset.asset_id_serial,
    machineryType: asset.machinery_type,
    swl: asset.swl ?? "Not recorded",
    siteLocation: asset.site_location ?? "—",
    clientName: clientEmbed?.name ?? "—",
    outcomeLabel: safety.outcomeLabel,
    nextDueUk: asset.next_inspection_due
      ? formatUkFromIsoLocal(asset.next_inspection_due)
      : outcome && isFailureOutcome(outcome)
        ? "Invalidated"
        : "To be scheduled",
    safetyStatus: safety.safetyStatus,
    safetyHeadline: safety.safetyHeadline,
    safetyDetail: safety.safetyDetail,
  };
}
