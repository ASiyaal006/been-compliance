"use server";

import { extractAssetUuid } from "@/lib/scan-code";
import { profileAccessError, requireAuthenticatedContext } from "@/lib/supabase/auth";

export type FindAssetResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Turns a scanned QR/barcode into an asset id. QR tags carry the UUID; a plain
 * barcode is matched against the asset's serial / ID.
 */
export async function findAssetByCode(rawCode: string): Promise<FindAssetResult> {
  const code = rawCode.trim();
  if (!code) return { ok: false, error: "The code was empty. Try again." };

  const uuid = extractAssetUuid(code);
  if (uuid) return { ok: true, id: uuid };

  let ctx;
  try {
    ctx = await requireAuthenticatedContext();
  } catch {
    return { ok: false, error: "You must be signed in to look up assets." };
  }
  const accessErr = profileAccessError(ctx.profile);
  if (accessErr) return { ok: false, error: accessErr };

  // Exact, case-insensitive match: escape LIKE wildcards in the scanned text.
  const pattern = code.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data, error } = await ctx.supabase
    .from("assets")
    .select("id")
    .ilike("asset_id_serial", pattern)
    .limit(2);

  if (error) return { ok: false, error: "Couldn't look up the asset. Check your connection and try again." };
  if (!data || data.length === 0) {
    return { ok: false, error: `No asset found for code “${code}”.` };
  }
  if (data.length > 1) {
    return { ok: false, error: `More than one asset uses “${code}”. Open it from the register instead.` };
  }
  return { ok: true, id: data[0]!.id };
}
