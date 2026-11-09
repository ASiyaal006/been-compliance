import type { InspectionOutcomeForm } from "@/lib/types/inspection";
import {
  primaryInspectionTypeFor,
  type InspectionType,
  type TestResults,
} from "@/lib/types/inspection-types";

/** Statutory re-inspection intervals (months from inspection_date). */
export type StatutoryIntervalMonths = 6 | 12;

/**
 * Resolve inspection interval from machinery_type (case-insensitive substring match).
 * - LOLER (Personnel) / LOLER (Accessory) → 6 months
 * - LOLER (Standard) / PUWER / PSSR / Electrical → 12 months
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

/**
 * Months until the next inspection of this kind, or null when the kind sets no due date
 * (load tests follow the thorough examination, so they never set one).
 */
export function intervalMonthsForInspection(
  type: InspectionType,
  machineryType: string,
  results: TestResults,
): number | null {
  if (type === "Load test") return null;
  if (type === "PUWER inspection") return 12;
  if (type === "Electrical test") {
    const months = Number(results.retestMonths);
    return Number.isInteger(months) && months > 0 ? months : 12;
  }
  return statutoryIntervalMonths(machineryType);
}

/**
 * Next due for an inspection, and whether it should replace the asset's due date.
 * Only the asset's main kind of inspection (e.g. PAT for electrical equipment) moves the
 * asset's due date; a PAT test on a hoist does not reset its LOLER due date.
 */
export function resolveInspectionDue(
  type: InspectionType,
  machineryType: string,
  inspectionDate: string,
  outcome: InspectionOutcomeForm,
  results: TestResults,
): { recordDue: string | null; updatesAsset: boolean } {
  const updatesAsset = primaryInspectionTypeFor(machineryType) === type;
  const months = intervalMonthsForInspection(type, machineryType, results);
  const recordDue = outcome === "Fail" || months === null ? null : addMonthsToIsoDate(inspectionDate, months);
  return { recordDue, updatesAsset };
}
