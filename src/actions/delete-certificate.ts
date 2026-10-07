"use server";

import { revalidatePath } from "next/cache";
import { CERTIFICATE_FILES_BUCKET } from "@/lib/certificate-files";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type DeleteCertificateResult = { ok: true } | { ok: false; error: string };

export async function deleteCertificate(id: string): Promise<DeleteCertificateResult> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return { ok: false, error: "Invalid certificate." };
  }

  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Supabase is not configured.";
    return { ok: false, error: message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You must be signed in to delete a certificate." };
  }

  const { data, error } = await supabase.from("certificates").delete().eq("id", id).select("*");

  if (error) {
    return { ok: false, error: error.message };
  }
  // RLS hides rows the user can't delete, so nothing comes back instead of an error.
  if (!data || data.length === 0) {
    return {
      ok: false,
      error:
        "Could not delete this certificate. Make sure the certificates delete migration has been run in Supabase.",
    };
  }

  // Remove the stored original too; a leftover file is harmless if this fails.
  const filePath = (data[0] as { file_path?: string | null }).file_path;
  if (filePath) {
    await supabase.storage.from(CERTIFICATE_FILES_BUCKET).remove([filePath]);
  }

  revalidatePath("/certificates");
  return { ok: true };
}
