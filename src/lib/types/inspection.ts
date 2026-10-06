/** Values collected on the Log Inspection form (stored in Supabase). */
export const INSPECTION_OUTCOMES_FORM = ["Pass", "Fail", "Monitor"] as const;
export type InspectionOutcomeForm = (typeof INSPECTION_OUTCOMES_FORM)[number];

/** All values allowed in the inspections.outcome column. */
export type InspectionOutcomeDb =
  | InspectionOutcomeForm
  | "Compliant"
  | "Defect";

export function isFailureOutcome(outcome: string): boolean {
  return outcome === "Fail" || outcome === "Defect";
}

export function isPassOutcome(outcome: string): boolean {
  return outcome === "Pass" || outcome === "Compliant";
}

export function isMonitorOutcome(outcome: string): boolean {
  return outcome === "Monitor";
}

export function outcomeLabel(outcome: string): string {
  if (isFailureOutcome(outcome)) return "Fail";
  if (isMonitorOutcome(outcome)) return "Monitor";
  if (isPassOutcome(outcome)) return "Pass";
  return outcome;
}

/** LOLER Schedule 1: why the thorough examination was carried out. */
export const REASONS_FOR_EXAM = [
  "Within an interval of 6 months",
  "Within an interval of 12 months",
  "In accordance with an examination scheme",
  "After the occurrence of exceptional circumstances",
  "First examination after installation or assembly",
] as const;
export type ReasonForExam = (typeof REASONS_FOR_EXAM)[number];
