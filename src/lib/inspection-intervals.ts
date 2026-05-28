import type { InspectionOutcomeForm } from "@/lib/types/inspection";

/** Statutory re-inspection intervals (months from inspection_date). */
export type StatutoryIntervalMonths = 6 | 12;

/**
 * Resolve inspection interval from machinery_type (case-insensitive substring match).
 * - LOLER (Personnel) / LOLER (Accessory) → 6 months
 * - LOLER (Standard) / PUWER / PSSR → 12 months
 * - Unknown (incl. plain LOLER, COSHH, Other) → 12 months
 */
export function statutoryIntervalMonths(machineryType: string): StatutoryIntervalMonths {
  const t = machineryType.trim().toLowerCase();

  if (t.includes("loler (personnel)") || t.includes("loler (accessory)")) {
    return 6;
  }

  if (
    t.includes("loler (standard)") ||
    t.includes("puwer") ||
    t.includes("pssr")
  ) {
    return 12;
  }

  return 12;
}

/** Add calendar months to an ISO date (YYYY-MM-DD), returned as YYYY-MM-DD (UTC-safe). */
export function addMonthsToIsoDate(isoDate: string, months: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m?.[1]) {
    throw new Error(`Invalid inspection date: ${isoDate}`);
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(Date.UTC(y, mo - 1, d));
  date.setUTCMonth(date.getUTCMonth() + months);
  const outY = date.getUTCFullYear();
  const outM = String(date.getUTCMonth() + 1).padStart(2, "0");
  const outD = String(date.getUTCDate()).padStart(2, "0");
  return `${outY}-${outM}-${outD}`;
}

export function calculateNextInspectionDue(
  inspectionDate: string,
  machineryType: string,
): string {
  const months = statutoryIntervalMonths(machineryType);
  return addMonthsToIsoDate(inspectionDate, months);
}

/**
 * Pass / Monitor → computed next due; Fail → null (clears statutory due on asset).
 */
export function resolveNextInspectionDueUpdate(
  inspectionDate: string,
  machineryType: string,
  outcome: InspectionOutcomeForm,
): string | null {
  if (outcome === "Fail") {
    return null;
  }
  if (outcome === "Pass" || outcome === "Monitor") {
    return calculateNextInspectionDue(inspectionDate, machineryType);
  }
  return null;
}
