"use server";

import { revalidatePath } from "next/cache";
import { resolveNextInspectionDueUpdate } from "@/lib/inspection-intervals";
import {
  INSPECTION_OUTCOMES_FORM,
  REASONS_FOR_EXAM,
  type InspectionOutcomeForm,
  type ReasonForExam,
} from "@/lib/types/inspection";
import { looksLikeUuid } from "@/lib/data/asset-queries";
import { profileAccessError, requireAuthenticatedContext } from "@/lib/supabase/auth";

export type CreateInspectionInput = {
  assetId: string;
  inspectionDate: string;
  outcome: InspectionOutcomeForm;
  reference: string;
  notes: string;
  reasonForExam: ReasonForExam;
  examinerName: string;
  examinerQualifications: string;
  examinerEmployer: string;
  defects: string;
  defectRemedyBy: string;
  testDetails: string;
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
  if (!REASONS_FOR_EXAM.includes(raw.reasonForExam)) {
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

  let nextDue: string | null;
  try {
    nextDue = resolveNextInspectionDueUpdate(
      inspectionDate,
      asset.machinery_type,
      raw.outcome,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not calculate next inspection due.";
    return { ok: false, error: msg };
  }

  const { error: insErr } = await ctx.supabase.from("inspections").insert({
    asset_id: assetId,
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
    test_details: testDetails || null,
    next_examination_due: nextDue,
  });

  if (insErr) {
    return { ok: false, error: insErr.message };
  }

  const { error: assetUpdateErr } = await ctx.supabase
    .from("assets")
    .update({ next_inspection_due: nextDue })
    .eq("id", assetId);

  if (assetUpdateErr) {
    return { ok: false, error: `Inspection saved but asset update failed: ${assetUpdateErr.message}` };
  }

  revalidatePath("/inspections");
  revalidatePath("/assets");
  revalidatePath("/dashboard");
  revalidatePath(`/assets/${assetId}`);

  return { ok: true };
}
