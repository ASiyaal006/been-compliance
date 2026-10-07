"use server";

import { revalidatePath } from "next/cache";
import { normalizeIsoDate, parsedDocumentSchema, type ParsedDocumentData } from "@/lib/types/parsed-document";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { calculateNextInspectionDue } from "@/lib/inspection-intervals";

export type SaveCertificateResult =
  | { ok: true; message: string }
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

  const link = await findAssetForCertificate(supabase, data);

  const { error } = await supabase.from("certificates").insert({
    user_id: user.id,
    asset_id: link.asset?.id ?? null,
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

  let message = link.message;
  // Use the certificate's expiry date; when it has none, work it out from the
  // inspection date and the statutory interval (6 or 12 months).
  const expiry = toDateOrNull(data.expiryDate);
  const inspected = toDateOrNull(data.inspectionDate);
  const nextDue =
    expiry ??
    (inspected && link.asset
      ? calculateNextInspectionDue(inspected, link.asset.machinery_type || data.machineryType)
      : null);
  const dueSource = expiry ? "" : " (worked out from the inspection date)";
  // A failed examination never extends the due date, and an older certificate
  // never moves it backwards.
  if (link.asset && data.status !== "Fail") {
    const current = link.asset.next_inspection_due;
    if (!nextDue) {
      message = `${message} It has no expiry or inspection date, so the asset's due date wasn't changed.`;
    } else if (!current || nextDue > current) {
      const { data: updated, error: updateError } = await supabase
        .from("assets")
        .update({ next_inspection_due: nextDue })
        .eq("id", link.asset.id)
        .select("id");
      message = updateError
        ? `${message} Could not update its next due date: ${updateError.message}`
        : (updated?.length ?? 0) === 0
          ? `${message} You don't have permission to update this asset's due date.`
          : `${message} Next inspection due updated to ${formatUk(nextDue)}${dueSource}.`;
    } else {
      message = `${message} The asset already has a later due date (${formatUk(current)}), so it wasn't changed.`;
    }
  }

  revalidatePath("/certificates");
  if (link.asset) {
    revalidatePath("/assets");
    revalidatePath("/dashboard");
    revalidatePath(`/assets/${link.asset.id}`);
  }
  return { ok: true, message };
}

type MatchedAsset = {
  id: string;
  asset_id_serial: string;
  machinery_type: string;
  next_inspection_due: string | null;
};

function formatUk(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(Date.UTC(y!, m! - 1, d!)),
  );
}

/** Finds the one asset in the register whose serial matches the certificate (case-insensitive). */
async function findAssetForCertificate(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  data: ParsedDocumentData,
): Promise<{ asset: MatchedAsset | null; message: string }> {
  const serial = data.serialOrModelNumber.trim();
  if (!serial) {
    return { asset: null, message: "Certificate saved. No serial number, so it isn't linked to an asset." };
  }

  // Exact, case-insensitive match: escape LIKE wildcards in the serial.
  const pattern = serial.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data: rows, error } = await supabase
    .from("assets")
    .select("id, asset_id_serial, machinery_type, next_inspection_due, clients!assets_client_id_fkey ( name )")
    .ilike("asset_id_serial", pattern)
    .limit(10);

  if (error || !rows || rows.length === 0) {
    return {
      asset: null,
      message: `Certificate saved. No asset with serial ${serial} is in the Asset Register, so it isn't linked yet.`,
    };
  }

  let matches = rows as unknown as (MatchedAsset & { clients: { name: string } | null })[];
  if (matches.length > 1 && data.clientName.trim()) {
    const client = data.clientName.trim().toLowerCase();
    matches = matches.filter((m) => m.clients?.name.trim().toLowerCase() === client);
  }
  if (matches.length !== 1) {
    return {
      asset: null,
      message: `Certificate saved. More than one asset has serial ${serial}, so it isn't linked.`,
    };
  }

  const asset = matches[0]!;
  return { asset, message: `Certificate saved and linked to asset ${asset.asset_id_serial}.` };
}
