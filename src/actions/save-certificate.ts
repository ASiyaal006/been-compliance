"use server";

import { revalidatePath } from "next/cache";
import { normalizeIsoDate, parsedDocumentSchema, type ParsedDocumentData } from "@/lib/types/parsed-document";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SaveCertificateResult =
  | { ok: true }
  | { ok: false; error: string; duplicate?: true };

function toDateOrNull(value: string): string | null {
  const iso = normalizeIsoDate(value);
  return iso || null;
}

export async function saveCertificate(
  raw: ParsedDocumentData,
  options: { allowDuplicate?: boolean } = {},
): Promise<SaveCertificateResult> {
  const parsed = parsedDocumentSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the extracted fields." };
  }

  const data = parsed.data;

  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Supabase is not configured.";
    return { ok: false, error: message };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, error: "You must be signed in to save a certificate." };
  }

  const reference = data.certificateReference.trim();
  if (reference && !options.allowDuplicate) {
    const [certMatch, inspectionMatch] = await Promise.all([
      supabase.from("certificates").select("id").eq("certificate_reference", reference).limit(1),
      supabase.from("inspections").select("id").eq("reference", reference).limit(1),
    ]);
    const where = (certMatch.data?.length ?? 0) > 0
      ? "an uploaded certificate"
      : (inspectionMatch.data?.length ?? 0) > 0
        ? "an inspection report"
        : null;
    if (where) {
      return {
        ok: false,
        duplicate: true,
        error: `Certificate reference ${reference} is already on file as ${where}. Save it again anyway?`,
      };
    }
  }

  const { error } = await supabase.from("certificates").insert({
    user_id: user.id,
    asset_name: data.assetName.trim(),
    serial_or_model_number: data.serialOrModelNumber.trim(),
    inspection_date: toDateOrNull(data.inspectionDate),
    expiry_date: toDateOrNull(data.expiryDate),
    inspector_or_company: data.inspectorOrCompany.trim(),
    status: data.status,
    client_name: data.clientName.trim(),
    site_location: data.siteLocation.trim(),
    machinery_type: data.machineryType,
    certificate_reference: data.certificateReference.trim(),
    examiner_notes: data.examinerNotes.trim(),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/certificates");
  return { ok: true };
}
