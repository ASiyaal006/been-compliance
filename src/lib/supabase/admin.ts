import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseEnvStatus } from "@/lib/supabase/env";

export function assertSupabaseAdminEnv(): void {
  const status = getSupabaseEnvStatus();
  if (!status.ready) {
    throw new Error(status.message);
  }
}

/** Server-only Supabase client (service role — bypasses RLS). Never import in client bundles. */
export function createSupabaseAdmin(): SupabaseClient<Database> {
  assertSupabaseAdminEnv();
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}
