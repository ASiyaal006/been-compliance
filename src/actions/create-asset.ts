"use server";

import { revalidatePath } from "next/cache";
import { MACHINERY_TYPES_DB, type MachineryTypeDb } from "@/lib/types/machinery";
import {
  profileAccessError,
  requireAuthenticatedContext,
  type AuthenticatedContext,
} from "@/lib/supabase/auth";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type CreateAssetInput = {
  clientName: string;
  siteLocation: string;
  assetIdSerial: string;
  machineryType: MachineryTypeDb;
  commissioningDate: string;
};

export type CreateAssetResult =
  | { ok: true; assetId: string }
  | { ok: false; error: string };

function normalizeClientName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

function normalizeSerial(raw: string): string {
  return raw.trim();
}

async function resolveClientIdForAdmin(
  sb: SupabaseClient<Database>,
  name: string,
): Promise<{ id: string | null; error?: string }> {
  const { data: existing, error: selErr } = await sb.from("clients").select("id").eq("name", name).maybeSingle();
  if (selErr) {
    return { id: null, error: selErr.message };
  }
  if (existing?.id) return { id: existing.id };

  const { data: created, error: insErr } = await sb.from("clients").insert({ name }).select("id").single();
  if (!insErr && created?.id) return { id: created.id };

  if (insErr?.code === "23505") {
    const { data: raced, error: rErr } = await sb.from("clients").select("id").eq("name", name).maybeSingle();
    if (raced?.id) return { id: raced.id };
    return {
      id: null,
      error: rErr?.message ?? "Duplicate client name conflict resolved unsuccessfully.",
    };
  }

  return { id: null, error: insErr?.message ?? "Could not create client." };
}

async function resolveClientId(
  ctx: AuthenticatedContext,
  clientName: string,
): Promise<{ id: string | null; error?: string }> {
  const accessErr = profileAccessError(ctx.profile);
  if (accessErr) return { id: null, error: accessErr };

  if (ctx.profile.isBeenAdmin) {
    return resolveClientIdForAdmin(ctx.supabase, clientName);
  }

  if (!ctx.profile.clientId) {
    return { id: null, error: "Your account is not assigned to a client." };
  }

  return { id: ctx.profile.clientId };
}

export async function createAssetRecord(raw: CreateAssetInput): Promise<CreateAssetResult> {
  const clientName = normalizeClientName(raw.clientName);
  const assetIdSerial = normalizeSerial(raw.assetIdSerial);
  const siteLocation = raw.siteLocation.trim();
  const commissioningDate = raw.commissioningDate.trim();

  if (!clientName) return { ok: false, error: "Client name is required." };
  if (!siteLocation) return { ok: false, error: "Site location is required." };
  if (!assetIdSerial) return { ok: false, error: "Asset ID / serial is required." };
  if (!commissioningDate) return { ok: false, error: "Commissioning date is required." };
  if (!MACHINERY_TYPES_DB.includes(raw.machineryType)) {
    return { ok: false, error: "Invalid machinery type." };
  }

  let ctx: AuthenticatedContext;
  try {
    ctx = await requireAuthenticatedContext();
  } catch {
    return { ok: false, error: "You must be signed in to add assets." };
  }

  const { id: clientId, error: clientErr } = await resolveClientId(ctx, clientName);
  if (!clientId) {
    return { ok: false, error: clientErr ?? "Unable to resolve client." };
  }

  const payload = {
    client_id: clientId,
    asset_id_serial: assetIdSerial,
    machinery_type: raw.machineryType,
    site_location: siteLocation,
    commissioning_date: commissioningDate,
  };

  const { data: inserted, error: aErr } = await ctx.supabase.from("assets").insert(payload).select("id").single();

  if (aErr) {
    if (aErr.code === "23505") {
      return {
        ok: false,
        error: "That asset reference already exists for this client. Adjust the Asset ID / serial or pick the existing register entry.",
      };
    }
    return { ok: false, error: aErr.message ?? "Could not save asset." };
  }
  if (!inserted?.id) {
    return { ok: false, error: "Save returned no identifier." };
  }

  revalidatePath("/assets");
  revalidatePath("/dashboard");

  return { ok: true, assetId: inserted.id };
}
