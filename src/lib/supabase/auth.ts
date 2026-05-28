import "server-only";

import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppProfile = {
  id: string;
  clientId: string | null;
  isBeenAdmin: boolean;
  fullName: string | null;
  /** True when using a fallback profile (DB row missing or could not be created). */
  isFallback: boolean;
};

export type AuthenticatedContext = {
  supabase: SupabaseClient<Database>;
  user: User;
  profile: AppProfile;
  /** Set when profiles table is unreachable (migration not run, RLS, etc.). */
  profileError: string | null;
};

function fallbackProfile(user: User): AppProfile {
  return {
    id: user.id,
    clientId: null,
    isBeenAdmin: false,
    fullName: user.email?.split("@")[0] ?? null,
    isFallback: true,
  };
}

function mapProfileRow(data: {
  id: string;
  client_id: string | null;
  is_been_admin: boolean;
  full_name: string | null;
}): AppProfile {
  return {
    id: data.id,
    clientId: data.client_id,
    isBeenAdmin: data.is_been_admin,
    fullName: data.full_name,
    isFallback: false,
  };
}

export async function getSessionUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/** Load profile row; never redirects. */
export async function resolveUserProfile(
  supabase: SupabaseClient<Database>,
  user: User,
): Promise<{ profile: AppProfile; profileError: string | null }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, client_id, is_been_admin, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return {
      profile: fallbackProfile(user),
      profileError: error.message,
    };
  }

  if (data) {
    return { profile: mapProfileRow(data), profileError: null };
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      full_name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? null,
    })
    .select("id, client_id, is_been_admin, full_name")
    .single();

  if (!insertErr && inserted) {
    return { profile: mapProfileRow(inserted), profileError: null };
  }

  return {
    profile: fallbackProfile(user),
    profileError: insertErr?.message ?? null,
  };
}

/** Returns context when signed in (profile may be fallback). Null only when signed out. */
export async function getAuthenticatedContext(): Promise<AuthenticatedContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { profile, profileError } = await resolveUserProfile(supabase, user);
  return { supabase, user, profile, profileError };
}

/** Redirects to /login only when there is no auth session — never when profile is missing. */
export async function requireAuthenticatedContext(): Promise<AuthenticatedContext> {
  const ctx = await getAuthenticatedContext();
  if (!ctx) redirect("/login");
  return ctx;
}

export function profileAccessError(profile: AppProfile): string | null {
  if (profile.isBeenAdmin) return null;
  if (!profile.clientId) {
    return "Your account is not linked to a client organisation. Contact Been Compliance to assign access.";
  }
  return null;
}
