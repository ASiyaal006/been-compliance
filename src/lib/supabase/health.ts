import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseEnvStatus } from "@/lib/supabase/env";

export type SupabaseHealthResult =
  | { ok: true; clientCount: number; assetCount: number }
  | { ok: false; reason: "missing_env" | "connection_error"; message: string };

export async function verifySupabaseConnection(): Promise<SupabaseHealthResult> {
  const env = getSupabaseEnvStatus();
  if (!env.ready) {
    return { ok: false, reason: "missing_env", message: env.message };
  }

  try {
    const sb = createSupabaseAdmin();

    const { count: clientCount, error: clientErr } = await sb
      .from("clients")
      .select("id", { count: "exact", head: true });

    if (clientErr) {
      return { ok: false, reason: "connection_error", message: clientErr.message };
    }

    const { count: assetCount, error: assetErr } = await sb
      .from("assets")
      .select("id", { count: "exact", head: true });

    if (assetErr) {
      return { ok: false, reason: "connection_error", message: assetErr.message };
    }

    return {
      ok: true,
      clientCount: clientCount ?? 0,
      assetCount: assetCount ?? 0,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown connection error";
    return { ok: false, reason: "connection_error", message };
  }
}
