"use server";

import { revalidatePath } from "next/cache";
import { resolveNextInspectionDueUpdate } from "@/lib/inspection-intervals";
import {
  INSPECTION_OUTCOMES_FORM,
  type InspectionOutcomeForm,
} from "@/lib/types/inspection";
import { looksLikeUuid } from "@/lib/data/asset-queries";
import { profileAccessError, requireAuthenticatedContext } from "@/lib/supabase/auth";

export type CreateInspectionInput = {
  assetId: string;
  inspectionDate: string;
  outcome: InspectionOutcomeForm;
  reference: string;
  notes: string;
};

export type CreateInspectionResult = { ok: true } | { ok: false; error: string };

export async function createInspectionRecord(
  raw: CreateInspectionInput,
): Promise<CreateInspectionResult> {
  const assetId = raw.assetId.trim();
  const inspectionDate = raw.inspectionDate.trim();
  const reference = raw.reference.trim();
  const notes = raw.notes.trim();

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

  const { error: insErr } = await ctx.supabase.from("inspections").insert({
    asset_id: assetId,
    inspection_date: inspectionDate,
    outcome: raw.outcome,
    reference,
    examiner_notes: notes || null,
  });

  if (insErr) {
    return { ok: false, error: insErr.message };
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
