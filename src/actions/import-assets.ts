"use server";

import { revalidatePath } from "next/cache";
import {
  MAX_IMPORT_ROWS,
  EXAMPLE_ID_PREFIX,
  serialKey,
  validateRow,
  type ImportRowInput,
} from "@/lib/asset-import";
import { requireAuthenticatedContext, type AuthenticatedContext } from "@/lib/supabase/auth";
import type { Database } from "@/lib/supabase/database.types";

type AdminCheck = { ok: true; ctx: AuthenticatedContext } | { ok: false; error: string };

async function requireAdmin(): Promise<AdminCheck> {
  let ctx: AuthenticatedContext;
  try {
    ctx = await requireAuthenticatedContext();
  } catch {
    return { ok: false, error: "You must be signed in." };
  }
  if (!ctx.profile.isBeenAdmin) return { ok: false, error: "Only Been Compliance admins can import assets." };
  return { ok: true, ctx };
}

function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** Matches a customer by name ignoring case and spacing, as the database's unique rule does. */
async function findClientId(ctx: AuthenticatedContext, name: string): Promise<string | null> {
  const { data, error } = await ctx.supabase.from("clients").select("id, name");
  if (error) throw new Error(`Could not load customers: ${error.message}`);
  const key = name.toLowerCase();
  return (data ?? []).find((c) => normalizeName(c.name).toLowerCase() === key)?.id ?? null;
}

async function existingSerialKeys(ctx: AuthenticatedContext, clientId: string): Promise<Set<string>> {
  const keys = new Set<string>();
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await ctx.supabase
      .from("assets")
      .select("asset_id_serial")
      .eq("client_id", clientId)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Could not check existing assets: ${error.message}`);
    for (const a of data ?? []) keys.add(serialKey(a.asset_id_serial));
    if (!data || data.length < pageSize) break;
  }
  return keys;
}

export type ExistingCheckResult =
  | { ok: true; customerExists: boolean; existing: string[] }
  | { ok: false; error: string };

/** For the preview: which of these asset IDs the customer already has. */
export async function checkExistingAssets(input: { clientName: string; serials: string[] }): Promise<ExistingCheckResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const name = normalizeName(input.clientName);
  if (!name) return { ok: true, customerExists: false, existing: [] };
  try {
    const clientId = await findClientId(auth.ctx, name);
    if (!clientId) return { ok: true, customerExists: false, existing: [] };
    const keys = await existingSerialKeys(auth.ctx, clientId);
    return {
      ok: true,
      customerExists: true,
      existing: input.serials.filter((s) => keys.has(serialKey(s))),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not check existing assets." };
  }
}

export type ImportAssetsResult =
  | {
      ok: true;
      imported: number;
      clientName: string;
      /** Rows not imported, with the reason. */
      skipped: { rowNumber: number; assetIdSerial: string; reason: string }[];
    }
  | { ok: false; error: string };

/**
 * Saves every valid row as an asset for one customer (created if new).
 * Rows with problems, template sample rows and asset IDs the customer already has are
 * skipped, so re-uploading a corrected sheet only adds what's missing.
 */
export async function importAssets(input: {
  clientName: string;
  clientAddress: string;
  rows: ImportRowInput[];
}): Promise<ImportAssetsResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const { ctx } = auth;

  const clientName = normalizeName(input.clientName);
  if (!clientName) return { ok: false, error: "Choose or type the customer's name." };
  if (!Array.isArray(input.rows) || input.rows.length === 0) return { ok: false, error: "The sheet has no rows to import." };
  if (input.rows.length > MAX_IMPORT_ROWS)
    return { ok: false, error: `Import up to ${MAX_IMPORT_ROWS} rows at a time. Split the sheet and import each part.` };

  let clientId: string | null;
  try {
    clientId = await findClientId(ctx, clientName);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not load customers." };
  }

  if (!clientId) {
    const { data: created, error } = await ctx.supabase.from("clients").insert({ name: clientName }).select("id").single();
    if (error || !created) {
      if (error?.code === "23505") clientId = await findClientId(ctx, clientName).catch(() => null);
      if (!clientId) return { ok: false, error: `Could not create the customer: ${error?.message ?? "unknown error"}` };
    } else clientId = created.id;
  }

  const address = input.clientAddress?.trim();
  if (address) {
    // Only fills a missing address, as the Add asset form does.
    await ctx.supabase.from("clients").update({ address }).eq("id", clientId).is("address", null);
  }

  let existing: Set<string>;
  try {
    existing = await existingSerialKeys(ctx, clientId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not check existing assets." };
  }

  const skipped: { rowNumber: number; assetIdSerial: string; reason: string }[] = [];
  const toInsert: Database["public"]["Tables"]["assets"]["Insert"][] = [];
  const seen = new Set<string>();

  for (const raw of input.rows) {
    const clean = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");
    const rowInput: ImportRowInput = {
      rowNumber: Number(raw.rowNumber) || 0,
      assetIdSerial: clean(raw.assetIdSerial),
      machineryTypeRaw: clean(raw.machineryTypeRaw),
      siteLocation: clean(raw.siteLocation),
      commissioningDate: clean(raw.commissioningDate),
      swl: clean(raw.swl),
      description: clean(raw.description),
      manufactureDate: clean(raw.manufactureDate),
      nextInspectionDue: clean(raw.nextInspectionDue),
      notes: typeof raw.notes === "string" ? raw.notes.trim() : "",
    };
    const skip = (reason: string) =>
      skipped.push({ rowNumber: rowInput.rowNumber, assetIdSerial: rowInput.assetIdSerial, reason });

    if (rowInput.assetIdSerial.toUpperCase().startsWith(EXAMPLE_ID_PREFIX)) {
      skip("Example row from the template.");
      continue;
    }
    const row = validateRow(rowInput);
    if (row.errors.length > 0 || !row.machineryType) {
      skip(row.errors.join(" "));
      continue;
    }
    const key = serialKey(row.assetIdSerial);
    if (existing.has(key)) {
      skip("Already in this customer's register.");
      continue;
    }
    if (seen.has(key)) {
      skip("Same asset ID appears earlier in the sheet.");
      continue;
    }
    seen.add(key);

    toInsert.push({
      client_id: clientId,
      asset_id_serial: row.assetIdSerial,
      machinery_type: row.machineryType,
      site_location: row.siteLocation,
      commissioning_date: row.commissioningDate,
      next_inspection_due: row.nextInspectionDue || null,
      swl: row.swl || null,
      description: row.description || null,
      manufacture_date: row.manufactureDate || null,
      notes: row.notes || null,
    });
  }

  let imported = 0;
  const chunk = 500;
  for (let i = 0; i < toInsert.length; i += chunk) {
    const batch = toInsert.slice(i, i + chunk);
    const { error } = await ctx.supabase.from("assets").insert(batch);
    if (error) {
      if (imported > 0) revalidateRegister();
      const why =
        error.code === "23505"
          ? "An asset ID already exists for this customer (someone may have added it just now). Upload the sheet again: existing assets are skipped."
          : error.message;
      return {
        ok: false,
        error: imported > 0 ? `${imported} assets were imported, then the import stopped: ${why}` : `Nothing was imported: ${why}`,
      };
    }
    imported += batch.length;
  }

  if (imported > 0) revalidateRegister();
  return { ok: true, imported, clientName, skipped };
}

function revalidateRegister() {
  revalidatePath("/assets");
  revalidatePath("/dashboard");
  revalidatePath("/admin/customers");
}
