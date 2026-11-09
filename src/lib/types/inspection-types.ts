/**
 * The kinds of inspection an inspector can log against an asset.
 * Each kind has its own reasons, result fields and report wording.
 * The LOLER thorough examination is the original kind; older rows with no
 * inspection_type are treated as one.
 */

import { REASONS_FOR_EXAM } from "@/lib/types/inspection";

export const INSPECTION_TYPES = [
  "Thorough examination",
  "PUWER inspection",
  "Electrical test",
  "Load test",
] as const;
export type InspectionType = (typeof INSPECTION_TYPES)[number];

export const DEFAULT_INSPECTION_TYPE: InspectionType = "Thorough examination";

export type ResultField = {
  key: string;
  label: string;
  /** "check" is a Pass / Fail / N/A choice. */
  kind: "text" | "select" | "check";
  options?: readonly string[];
  required?: boolean;
  placeholder?: string;
};

export const CHECK_ANSWERS = ["Pass", "Fail", "N/A"] as const;

/** Electrical retest intervals offered on the form (months). */
export const ELECTRICAL_RETEST_MONTHS = ["3", "6", "12", "24", "48"] as const;

type InspectionTypeConfig = {
  /** Short name shown in menus and history. */
  label: string;
  /** Report heading on the PDF. */
  reportTitle: string;
  /** Regulation line under the heading. */
  regulation: string;
  reasons: readonly string[];
  /** Structured results captured on the form and printed on the report. */
  fields: ResultField[];
  /** Whether the free-text "Tests carried out" box is shown. */
  showTestDetails: boolean;
};

export const INSPECTION_TYPE_CONFIG: Record<InspectionType, InspectionTypeConfig> = {
  "Thorough examination": {
    label: "LOLER thorough examination",
    reportTitle: "Report of Thorough Examination",
    regulation: "Lifting Operations and Lifting Equipment Regulations 1998 · Regulation 9 and Schedule 1",
    reasons: REASONS_FOR_EXAM,
    fields: [],
    showTestDetails: true,
  },
  "PUWER inspection": {
    label: "PUWER inspection",
    reportTitle: "Report of Inspection of Work Equipment",
    regulation: "Provision and Use of Work Equipment Regulations 1998 · Regulation 6",
    reasons: [
      "Routine inspection at a suitable interval",
      "After installation, before first use",
      "After assembly at a new site or location",
      "After exceptional circumstances (damage, misuse, long period out of use)",
    ],
    fields: [
      { key: "guards", label: "Guards and protection devices", kind: "check", required: true },
      { key: "controls", label: "Start and operating controls", kind: "check", required: true },
      { key: "stops", label: "Stop and emergency stop controls", kind: "check", required: true },
      { key: "isolation", label: "Isolation from energy sources", kind: "check", required: true },
      { key: "stability", label: "Stability, anchoring and mounting", kind: "check", required: true },
      { key: "condition", label: "Condition: damage, wear, corrosion", kind: "check", required: true },
      { key: "markings", label: "Markings and warning signs", kind: "check", required: true },
      { key: "lighting", label: "Lighting of the work area", kind: "check", required: true },
      { key: "maintenance", label: "Maintenance log up to date", kind: "check", required: true },
    ],
    showTestDetails: true,
  },
  "Electrical test": {
    label: "Electrical test (PAT)",
    reportTitle: "Electrical Equipment Test Report",
    regulation:
      "Electricity at Work Regulations 1989 · IET Code of Practice for In-service Inspection and Testing of Electrical Equipment",
    reasons: [
      "Routine retest",
      "New equipment, first test",
      "After repair or modification",
      "After damage or a suspected fault",
    ],
    fields: [
      {
        key: "equipmentClass",
        label: "Equipment class",
        kind: "select",
        options: ["Class I (earthed)", "Class II (double insulated)", "Class III / 110V CTE", "Fixed or hard-wired"],
        required: true,
      },
      { key: "visual", label: "Visual inspection (plug, lead, casing)", kind: "check", required: true },
      { key: "earthContinuity", label: "Earth continuity (Ω)", kind: "text", placeholder: "e.g. 0.08" },
      { key: "insulation", label: "Insulation resistance (MΩ)", kind: "text", placeholder: "e.g. >299" },
      { key: "polarity", label: "Polarity", kind: "check", required: true },
      { key: "functional", label: "Functional check", kind: "check", required: true },
      { key: "fuse", label: "Fuse rating (A)", kind: "text", placeholder: "e.g. 13" },
      {
        key: "instrument",
        label: "Test instrument (make and serial)",
        kind: "text",
        placeholder: "e.g. Seaward PrimeTest 250+ · 1A2345",
        required: true,
      },
      {
        key: "retestMonths",
        label: "Retest interval (months)",
        kind: "select",
        options: ELECTRICAL_RETEST_MONTHS,
        required: true,
      },
    ],
    showTestDetails: false,
  },
  "Load test": {
    label: "Load test",
    reportTitle: "Load Test Certificate",
    regulation: "Lifting Operations and Lifting Equipment Regulations 1998 · Regulation 9 · Proof load test",
    reasons: [
      "Before first use",
      "After repair or modification",
      "As required by the examination scheme",
      "After exceptional circumstances",
    ],
    fields: [
      { key: "testLoad", label: "Test load applied", kind: "text", placeholder: "e.g. 1.25 t (125% of SWL)", required: true },
      {
        key: "testMethod",
        label: "Test method",
        kind: "select",
        options: ["Static", "Dynamic", "Static and dynamic"],
        required: true,
      },
      { key: "duration", label: "Time load held", kind: "text", placeholder: "e.g. 10 minutes" },
      { key: "brakes", label: "Brakes and holding devices", kind: "check", required: true },
      { key: "deformation", label: "No permanent deformation", kind: "check", required: true },
      {
        key: "loadEquipment",
        label: "Test weights / load cell (and cert ref)",
        kind: "text",
        placeholder: "e.g. Water bags, load cell LC-0091 cal cert 4471",
        required: true,
      },
    ],
    showTestDetails: false,
  },
};

export function isInspectionType(v: unknown): v is InspectionType {
  return typeof v === "string" && (INSPECTION_TYPES as readonly string[]).includes(v);
}

/** Read the stored type; older rows have none and are thorough examinations. */
export function inspectionTypeOf(stored: string | null | undefined): InspectionType {
  return isInspectionType(stored) ? stored : DEFAULT_INSPECTION_TYPE;
}

/** The inspection that drives an asset's statutory due date. */
export function primaryInspectionTypeFor(machineryType: string): InspectionType {
  const t = machineryType.trim().toUpperCase();
  if (t === "PUWER") return "PUWER inspection";
  if (t === "ELECTRICAL") return "Electrical test";
  return "Thorough examination";
}

/** Types offered for an asset: its main type first, load tests only for lifting gear. */
export function inspectionTypesFor(machineryType: string): InspectionType[] {
  const primary = primaryInspectionTypeFor(machineryType);
  const lifting = machineryType.trim().toUpperCase().startsWith("LOLER");
  const others = INSPECTION_TYPES.filter((t) => t !== primary && (t !== "Load test" || lifting));
  return [primary, ...others];
}

export type TestResults = Record<string, string>;

/** Keeps only known fields with allowed values; returns an error for missing required ones. */
export function cleanTestResults(
  type: InspectionType,
  raw: Record<string, unknown>,
): { ok: true; results: TestResults } | { ok: false; error: string } {
  const results: TestResults = {};
  for (const field of INSPECTION_TYPE_CONFIG[type].fields) {
    const value = typeof raw[field.key] === "string" ? (raw[field.key] as string).trim() : "";
    const allowed = field.kind === "check" ? CHECK_ANSWERS : field.options;
    if (value && allowed && !allowed.includes(value)) {
      return { ok: false, error: `Choose a valid answer for "${field.label}".` };
    }
    if (!value) {
      if (field.required) return { ok: false, error: `Fill in "${field.label}".` };
      continue;
    }
    results[field.key] = value;
  }
  return { ok: true, results };
}

/** Reads saved results from the database JSON. */
export function parseTestResults(json: unknown): TestResults {
  if (!json || typeof json !== "object" || Array.isArray(json)) return {};
  const out: TestResults = {};
  for (const [k, v] of Object.entries(json as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

/** Results as label / value rows, in form order, for the report and history. */
export function resultRows(type: InspectionType, results: TestResults): { label: string; value: string }[] {
  return INSPECTION_TYPE_CONFIG[type].fields.flatMap((f) =>
    results[f.key] ? [{ label: f.label, value: results[f.key]! }] : [],
  );
}
