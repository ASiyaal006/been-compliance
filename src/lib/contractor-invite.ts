import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getSiteOrigin } from "@/lib/site-url";

export type InviteResult =
  | { ok: true; userId: string; emailed: true }
  /** Supabase couldn't send the email (its built-in sender only mails the project's own team), so the admin sends this link. */
  | { ok: true; userId: string; emailed: false; link: string }
  | { ok: false; error: string };

function welcomeUrl(): string {
  return `${getSiteOrigin()}/auth/welcome?next=/inspector/queue`;
}

/**
 * Creates a login for someone new (or one who never accepted an earlier invite) and emails them a link
 * to choose a password. Falls back to returning the link when Supabase can't send email.
 */
export async function inviteUser(email: string, fullName: string): Promise<InviteResult> {
  let admin;
  try {
    admin = createSupabaseAdmin();
  } catch {
    return { ok: false, error: "The app's Supabase service key isn't configured, so it can't create logins." };
  }
  const redirectTo = welcomeUrl();
  const data = { full_name: fullName };

  const invited = await admin.auth.admin.inviteUserByEmail(email, { redirectTo, data });
  if (!invited.error && invited.data.user) {
    return { ok: true, userId: invited.data.user.id, emailed: true };
  }
  if (invited.error?.code === "email_exists") {
    return { ok: false, error: "That person has already set up their login." };
  }

  const generated = await admin.auth.admin.generateLink({ type: "invite", email, options: { redirectTo, data } });
  if (generated.error || !generated.data.user || !generated.data.properties?.action_link) {
    if (generated.error?.code === "email_exists") {
      return { ok: false, error: "That person has already set up their login." };
    }
    return { ok: false, error: generated.error?.message ?? invited.error?.message ?? "Could not create the login." };
  }
  return { ok: true, userId: generated.data.user.id, emailed: false, link: generated.data.properties.action_link };
}

/** Auth user ids that were invited but haven't chosen a password yet. */
export async function pendingInviteIds(userIds: string[]): Promise<Set<string>> {
  const pending = new Set<string>();
  if (userIds.length === 0) return pending;
  let admin;
  try {
    admin = createSupabaseAdmin();
  } catch {
    return pending;
  }
  const results = await Promise.all(userIds.map((id) => admin.auth.admin.getUserById(id)));
  for (const { data } of results) {
    const u = data.user;
    if (u && u.invited_at && !u.last_sign_in_at) pending.add(u.id);
  }
  return pending;
}

export async function userEmail(userId: string): Promise<string | null> {
  try {
    const { data } = await createSupabaseAdmin().auth.admin.getUserById(userId);
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}
