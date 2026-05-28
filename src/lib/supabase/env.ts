export type SupabaseEnvStatus =
  | { ready: true }
  | { ready: false; message: string };

export function getSupabasePublicEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local");
  }
  if (!anonKey || anonKey === "PASTE_ANON_KEY_HERE") {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  }

  return { url, anonKey };
}

/** True when server-side Supabase credentials are present (anon + service role). */
export function isSupabaseConfigured(): boolean {
  return getSupabaseEnvStatus().ready;
}

export function getSupabaseEnvStatus(): SupabaseEnvStatus {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url) {
    return { ready: false, message: "Missing NEXT_PUBLIC_SUPABASE_URL in .env.local" };
  }

  if (!anonKey || anonKey === "PASTE_ANON_KEY_HERE") {
    return {
      ready: false,
      message: "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (Project Settings → API → anon key).",
    };
  }

  if (!serviceRole || serviceRole === "PASTE_SERVICE_ROLE_KEY_HERE") {
    return {
      ready: false,
      message:
        "Missing SUPABASE_SERVICE_ROLE_KEY in .env.local (required for public QR reads and health checks).",
    };
  }

  if (serviceRole.startsWith("sb_publishable_")) {
    return {
      ready: false,
      message:
        "SUPABASE_SERVICE_ROLE_KEY must be the secret service_role key, not the publishable/anon key.",
    };
  }

  return { ready: true };
}
