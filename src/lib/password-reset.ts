import "server-only";

import { createClient } from "@supabase/supabase-js";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getSiteOrigin } from "@/lib/site-url";

export type ResetResult =
  | { ok: true; emailed: true }
  /** The email couldn't be sent, so the admin sends this one-time link themselves. */
  | { ok: true; emailed: false; link: string }
  | { ok: false; error: string; rateLimited?: boolean };

/** Where the reset email lands: the same set-password page the invite uses, in "reset" wording. */
export function resetUrl(next = "/dashboard"): string {
  return `${getSiteOrigin()}/auth/welcome?mode=reset&next=${encodeURIComponent(next)}`;
}

function isRateLimit(error: { status?: number; code?: string }): boolean {
  return error.status === 429 || error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit";
}

/**
 * Emails a "choose a new password" link through Supabase (and so through the Resend SMTP sender).
 * Uses the implicit flow so the link works on any device, not only the browser that asked for it.
 * Supabase answers the same way whether or not the email has a login, so this never reveals who has one.
 */
export async function emailPasswordReset(email: string, next?: string): Promise<ResetResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return { ok: false, error: "Supabase isn't configured for this app." };

  const supabase = createClient(url, anonKey, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: resetUrl(next) });
  if (!error) return { ok: true, emailed: true };
  if (isRateLimit(error)) {
    return { ok: false, rateLimited: true, error: "Too many reset emails were sent just now. Wait a minute and try again." };
  }
  return { ok: false, error: error.message };
}

/** For admins: emails a reset link, or hands back a copyable link if the email can't be sent. */
export async function sendPasswordLink(email: string, next?: string): Promise<ResetResult> {
  const emailed = await emailPasswordReset(email, next);
  if (emailed.ok) return emailed;

  let admin;
  try {
    admin = createSupabaseAdmin();
  } catch {
    return emailed;
  }
  const generated = await admin.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo: resetUrl(next) } });
  const link = generated.data.properties?.action_link;
  if (generated.error || !link) return emailed;
  return { ok: true, emailed: false, link };
}
