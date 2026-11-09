"use server";

import { revalidatePath } from "next/cache";
import { resolveInspectionDue } from "@/lib/inspection-intervals";
import { INSPECTION_OUTCOMES_FORM, type InspectionOutcomeForm } from "@/lib/types/inspection";
import {
  DEFAULT_INSPECTION_TYPE,
  INSPECTION_TYPE_CONFIG,
  cleanTestResults,
  inspectionTypesFor,
  isInspectionType,
  type InspectionType,
} from "@/lib/types/inspection-types";
import { looksLikeUuid } from "@/lib/data/asset-queries";
import { profileAccessError, requireAuthenticatedContext } from "@/lib/supabase/auth";

export type CreateInspectionInput = {
  assetId: string;
  /** Missing on saves queued offline before inspection types existed. */
  inspectionType?: InspectionType;
  inspectionDate: string;
  outcome: InspectionOutcomeForm;
  reference: string;
  notes: string;
  reasonForExam: string;
  examinerName: string;
  examinerQualifications: string;
  examinerEmployer: string;
  defects: string;
  defectRemedyBy: string;
  testDetails: string;
  /** Structured results for the chosen type (see INSPECTION_TYPE_CONFIG). */
  testResults?: Record<string, string>;
};

export type CreateInspectionResult = { ok: true } | { ok: false; error: string };

export async function createInspectionRecord(
  raw: CreateInspectionInput,
): Promise<CreateInspectionResult> {
  const assetId = raw.assetId.trim();
  const inspectionDate = raw.inspectionDate.trim();
  const reference = raw.reference.trim();
  const notes = raw.notes.trim();
  const examinerName = raw.examinerName.trim();
  const examinerQualifications = raw.examinerQualifications.trim();
  const examinerEmployer = raw.examinerEmployer.trim();
  const defects = raw.defects.trim();
  const defectRemedyBy = raw.defectRemedyBy.trim();
  const testDetails = raw.testDetails.trim();

  if (!looksLikeUuid(assetId)) {
    return { ok: false, error: "Invalid asset identifier." };
  }
  if (!inspectionDate) {
    return { ok: false, error: "Inspection date is required." };
  }
  if (!INSPECTION_OUTCOMES_FORM.includes(raw.outcome)) {
    return { ok: false, error: "Invalid outcome." };
  }
  if (!reference) {
    return { ok: false, error: "Certificate / reference number is required." };
  }
  // Saves queued offline before inspection types existed have no type: treat them as LOLER exams.
  const type = raw.inspectionType ?? DEFAULT_INSPECTION_TYPE;
  if (!isInspectionType(type)) {
    return { ok: false, error: "Select the type of inspection." };
  }
  if (!INSPECTION_TYPE_CONFIG[type].reasons.includes(raw.reasonForExam)) {
    return { ok: false, error: "Select the reason for the examination." };
  }
  if (!examinerName) {
    return { ok: false, error: "Examiner name is required." };
  }
  if (!examinerEmployer) {
    return { ok: false, error: "Examiner's employer (name and address) is required." };
  }
  if (raw.outcome !== "Pass" && !defects) {
    return { ok: false, error: "Describe the defects found and the repair required." };
  }
  if (raw.outcome === "Monitor" && !defectRemedyBy) {
    return { ok: false, error: "Enter the date by which the defect must be remedied." };
  }
  const cleaned = cleanTestResults(type, raw.testResults ?? {});
  if (!cleaned.ok) {
    return { ok: false, error: cleaned.error };
  }
  if (raw.outcome === "Pass" && Object.values(cleaned.results).includes("Fail")) {
    return { ok: false, error: "One of the checks failed, so the outcome can't be Pass." };
  }

  let ctx;
  try {
    ctx = await requireAuthenticatedContext();
  } catch {
    return { ok: false, error: "You must be signed in to log inspections." };
  }

  const accessErr = profileAccessError(ctx.profile);
  if (accessErr) {
    return { ok: false, error: accessErr };
  }

  const { data: asset, error: assetErr } = await ctx.supabase
    .from("assets")
    .select("id, machinery_type")
    .eq("id", assetId)
    .maybeSingle();

  if (assetErr) {
    return { ok: false, error: assetErr.message };
  }
  if (!asset) {
    return { ok: false, error: "Asset not found or you do not have access." };
  }

  if (!inspectionTypesFor(asset.machinery_type).includes(type)) {
    return { ok: false, error: `A ${INSPECTION_TYPE_CONFIG[type].label} can't be logged on this asset.` };
  }

  let due: { recordDue: string | null; updatesAsset: boolean };
  try {
    due = resolveInspectionDue(type, asset.machinery_type, inspectionDate, raw.outcome, cleaned.results);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not calculate next inspection due.";
    return { ok: false, error: msg };
  }

  const { error: insErr } = await ctx.supabase.from("inspections").insert({
    asset_id: assetId,
    inspection_type: type,
    inspection_date: inspectionDate,
    outcome: raw.outcome,
    reference,
    examiner_notes: notes || null,
    reason_for_exam: raw.reasonForExam,
    examiner_name: examinerName,
    examiner_qualifications: examinerQualifications || null,
    examiner_employer: examinerEmployer,
    defects: defects || null,
    defect_remedy_by: raw.outcome === "Pass" ? null : defectRemedyBy || null,
    test_details: INSPECTION_TYPE_CONFIG[type].showTestDetails ? testDetails || null : null,
    test_results: Object.keys(cleaned.results).length ? cleaned.results : null,
    next_examination_due: due.recordDue,
  });

  if (insErr) {
    return { ok: false, error: insErr.message };
  }

  if (due.updatesAsset) {
    const { error: assetUpdateErr } = await ctx.supabase
      .from("assets")
      .update({ next_inspection_due: due.recordDue })
      .eq("id", assetId);

    if (assetUpdateErr) {
      return { ok: false, error: `Inspection saved but asset update failed: ${assetUpdateErr.message}` };
    }
  }

  revalidatePath("/inspections");
  revalidatePath("/assets");
  revalidatePath("/dashboard");
  revalidatePath(`/assets/${assetId}`);

  return { ok: true };
}
