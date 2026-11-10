"use server";

import { revalidatePath } from "next/cache";
import type { InviteOutcome } from "@/actions/contractors";
import { inviteUser, userEmail } from "@/lib/contractor-invite";
import { PORTAL_HOME } from "@/lib/customers";
import { looksLikeUuid } from "@/lib/data/asset-queries";
import { sendPasswordLink } from "@/lib/password-reset";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAuthenticatedContext, type AuthenticatedContext } from "@/lib/supabase/auth";

type Fail = { ok: false; error: string };

async function adminContext(): Promise<{ ok: true; ctx: AuthenticatedContext } | Fail> {
  let ctx;
  try {
    ctx = await requireAuthenticatedContext();
  } catch {
    return { ok: false, error: "You must be signed in to do this." };
  }
  if (!ctx.profile.isBeenAdmin) return { ok: false, error: "Only Been Compliance admins can do this." };
  return { ok: true, ctx };
}

function serviceClient() {
  try {
    return createSupabaseAdmin();
  } catch {
    return null;
  }
}

const NO_SERVICE_KEY = "The app's Supabase service key isn't configured, so it can't manage customer logins.";

/** Links a login to a client (creating the profile row if the sign-up trigger didn't). */
async function linkLoginToClient(userId: string, clientId: string | null, fullName?: string): Promise<string | null> {
  const admin = serviceClient();
  if (!admin) return NO_SERVICE_KEY;
  const { data: updated, error } = await admin
    .from("profiles")
    .update({ client_id: clientId })
    .eq("id", userId)
    .select("id");
  if (error) return error.message;
  if ((updated ?? []).length > 0 || clientId === null) return null;
  const { error: insertError } = await admin
    .from("profiles")
    .insert({ id: userId, client_id: clientId, full_name: fullName ?? null });
  return insertError?.message ?? null;
}

/** The customer's profile, checked to really be a customer login (not an admin). */
async function loadCustomer(userId: string): Promise<{ ok: true; name: string } | Fail> {
  if (!looksLikeUuid(userId)) return { ok: false, error: "Invalid customer login." };
  const admin = serviceClient();
  if (!admin) return { ok: false, error: NO_SERVICE_KEY };
  const { data, error } = await admin
    .from("profiles")
    .select("full_name, client_id, is_been_admin")
    .eq("id", userId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data || !data.client_id || data.is_been_admin) return { ok: false, error: "Customer login not found." };
  return { ok: true, name: data.full_name ?? "this customer" };
}

export type AddCustomerInput = { clientId: string; email: string; name: string };

/** Gives someone at a client a portal login: invites them by email, or links their existing login. */
export async function addCustomerLogin(raw: AddCustomerInput): Promise<{ ok: true; invite: InviteOutcome } | Fail> {
  const email = raw.email.trim();
  const name = raw.name.trim().slice(0, 120);
  if (!looksLikeUuid(raw.clientId)) return { ok: false, error: "Choose which customer they work for." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter their email address." };
  if (!name) return { ok: false, error: "Enter their name." };

  const auth = await adminContext();
  if (!auth.ok) return auth;
  const { supabase } = auth.ctx;

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("id", raw.clientId)
    .maybeSingle();
  if (clientError) return { ok: false, error: clientError.message };
  if (!client) return { ok: false, error: "That customer no longer exists." };

  const { data: users, error: lookupError } = await supabase.rpc("find_user_by_email", { p_email: email });
  if (lookupError) return { ok: false, error: lookupError.message };
  let userId = users?.[0]?.id;
  let invite: InviteOutcome = { kind: "existing" };

  if (userId) {
    const admin = serviceClient();
    if (!admin) return { ok: false, error: NO_SERVICE_KEY };
    const [{ data: profile }, { data: contractor }] = await Promise.all([
      admin.from("profiles").select("is_been_admin, client_id").eq("id", userId).maybeSingle(),
      admin.from("contractors").select("id").eq("user_id", userId).maybeSingle(),
    ]);
    if (profile?.is_been_admin) return { ok: false, error: "That email belongs to a Been Compliance admin." };
    if (contractor) return { ok: false, error: "That email belongs to one of your contractors. Use a different email." };
    if (profile?.client_id && profile.client_id !== raw.clientId) {
      return { ok: false, error: "That person already has a portal login for another customer." };
    }
  } else {
    const invited = await inviteUser(email, name, PORTAL_HOME);
    if (!invited.ok) return invited;
    userId = invited.userId;
    invite = invited.emailed ? { kind: "emailed" } : { kind: "link", link: invited.link };
  }

  const linkError = await linkLoginToClient(userId, raw.clientId, name);
  if (linkError) return { ok: false, error: linkError };

  revalidatePath("/admin/customers");
  return { ok: true, invite };
}

/** Sends a fresh invite to a customer who hasn't set their password yet. */
export async function resendCustomerInvite(userId: string): Promise<{ ok: true; invite: InviteOutcome } | Fail> {
  const auth = await adminContext();
  if (!auth.ok) return auth;
  const customer = await loadCustomer(userId);
  if (!customer.ok) return customer;
  const email = await userEmail(userId);
  if (!email) return { ok: false, error: "Couldn't find their login email." };

  const invited = await inviteUser(email, customer.name, PORTAL_HOME);
  if (!invited.ok) return invited;
  return { ok: true, invite: invited.emailed ? { kind: "emailed" } : { kind: "link", link: invited.link } };
}

/** Emails a customer a link to choose a new password. */
export async function sendCustomerPasswordLink(
  userId: string,
): Promise<{ ok: true; invite: InviteOutcome; email: string } | Fail> {
  const auth = await adminContext();
  if (!auth.ok) return auth;
  const customer = await loadCustomer(userId);
  if (!customer.ok) return customer;
  const email = await userEmail(userId);
  if (!email) return { ok: false, error: "Couldn't find their login email." };

  const sent = await sendPasswordLink(email, PORTAL_HOME);
  if (!sent.ok) return { ok: false, error: sent.error };
  return { ok: true, email, invite: sent.emailed ? { kind: "emailed" } : { kind: "link", link: sent.link } };
}

/** Stops a login from seeing the customer's certificates. The login itself is kept but sees nothing. */
export async function removeCustomerLogin(userId: string): Promise<{ ok: true } | Fail> {
  const auth = await adminContext();
  if (!auth.ok) return auth;
  const customer = await loadCustomer(userId);
  if (!customer.ok) return customer;

  const linkError = await linkLoginToClient(userId, null);
  if (linkError) return { ok: false, error: linkError };
  revalidatePath("/admin/customers");
  return { ok: true };
}
