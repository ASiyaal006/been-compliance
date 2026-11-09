import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getSiteOrigin } from "@/lib/site-url";
import { todayUk } from "@/lib/expiry";
import { sendEmail, isEmailConfigured } from "@/lib/email/send-email";
import {
  buildCustomerEmail,
  buildInspectorEmail,
  daysUntil,
  FIRST_REMINDER_DAYS,
  needsReminder,
  OVERDUE_WINDOW_DAYS,
  stageForDays,
  type ReminderAsset,
  type ReminderStage,
} from "@/lib/due-reminders";

export type ReminderRunSummary = {
  today: string;
  dryRun: boolean;
  assetsDue: number;
  customerEmails: { client: string; to: string[]; assets: number; ok: boolean; error?: string }[];
  inspectorEmail: { to: string[]; assets: number; ok: boolean; error?: string } | null;
  clientsWithoutLogin: string[];
};

function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Every login's email address, by user id. */
async function emailsByUserId(admin: ReturnType<typeof createSupabaseAdmin>): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Could not list users: ${error.message}`);
    for (const u of data.users) if (u.email) out.set(u.id, u.email);
    if (data.users.length < 1000) break;
  }
  return out;
}

/**
 * Finds assets that reached a reminder point today (30 days before, 7 days before, overdue),
 * emails each customer about their own equipment and sends inspectors one digest.
 * Each reminder is recorded so it is never sent twice for the same due date.
 */
export async function runDueReminders(options: { dryRun?: boolean; now?: Date } = {}): Promise<ReminderRunSummary> {
  const dryRun = Boolean(options.dryRun);
  const today = todayUk(options.now);
  const admin = createSupabaseAdmin();
  const origin = getSiteOrigin();

  if (!dryRun && !isEmailConfigured()) {
    throw new Error("RESEND_API_KEY is not set, so reminder emails can't be sent.");
  }

  const { data: assetRows, error: assetError } = await admin
    .from("assets")
    .select("id, client_id, asset_id_serial, description, machinery_type, site_location, next_inspection_due, clients(name)")
    .not("next_inspection_due", "is", null)
    .gte("next_inspection_due", addDays(today, -OVERDUE_WINDOW_DAYS))
    .lte("next_inspection_due", addDays(today, FIRST_REMINDER_DAYS));
  if (assetError) throw new Error(`Could not load assets: ${assetError.message}`);

  const candidates = (assetRows ?? []).flatMap((a) => {
    const dueDate = a.next_inspection_due as string;
    const days = daysUntil(dueDate, today);
    const stage = stageForDays(days);
    if (!stage || days === null) return [];
    const client = a.clients as unknown as { name: string } | { name: string }[] | null;
    const clientName = (Array.isArray(client) ? client[0]?.name : client?.name) ?? "Unknown customer";
    const asset: ReminderAsset = {
      assetId: a.id,
      clientId: a.client_id,
      clientName,
      serial: a.asset_id_serial,
      description: a.description,
      machineryType: a.machinery_type,
      siteLocation: a.site_location,
      dueDate,
      daysUntilDue: days,
      stage,
    };
    return [asset];
  });

  // Drop anything already reminded at this stage (or a later one) for the same due date.
  const sent = new Map<string, ReminderStage[]>();
  if (candidates.length) {
    const { data: logRows, error: logError } = await admin
      .from("due_reminders")
      .select("asset_id, due_date, stage")
      .in("asset_id", candidates.map((a) => a.assetId));
    if (logError) throw new Error(`Could not read sent reminders (has sql/due-reminders.sql been run?): ${logError.message}`);
    for (const r of logRows ?? []) {
      const key = `${r.asset_id}|${r.due_date}`;
      sent.set(key, [...(sent.get(key) ?? []), r.stage]);
    }
  }
  const due = candidates.filter((a) => needsReminder(a.stage, sent.get(`${a.assetId}|${a.dueDate}`) ?? []));

  const summary: ReminderRunSummary = {
    today,
    dryRun,
    assetsDue: due.length,
    customerEmails: [],
    inspectorEmail: null,
    clientsWithoutLogin: [],
  };
  if (due.length === 0) return summary;

  // Recipients: customer logins linked to each client, and Been Compliance admins (the inspectors).
  const clientIds = [...new Set(due.map((a) => a.clientId))];
  const [{ data: customerProfiles, error: custError }, { data: adminProfiles, error: adminError }, emails] =
    await Promise.all([
      admin.from("profiles").select("id, client_id").in("client_id", clientIds).eq("is_been_admin", false),
      admin.from("profiles").select("id").eq("is_been_admin", true),
      emailsByUserId(admin),
    ]);
  if (custError || adminError) throw new Error(`Could not load recipients: ${(custError ?? adminError)!.message}`);

  const byClient = new Map<string, ReminderAsset[]>();
  for (const a of due) byClient.set(a.clientId, [...(byClient.get(a.clientId) ?? []), a]);

  const logged: ReminderAsset[] = [];
  const customerEmailsFor = new Map<string, string[]>();

  for (const [clientId, assets] of byClient) {
    const clientName = assets[0].clientName;
    const to = [
      ...new Set(
        (customerProfiles ?? [])
          .filter((p) => p.client_id === clientId)
          .map((p) => emails.get(p.id))
          .filter((e): e is string => Boolean(e)),
      ),
    ];
    if (to.length === 0) {
      summary.clientsWithoutLogin.push(clientName);
      logged.push(...assets);
      continue;
    }
    const email = buildCustomerEmail(clientName, assets, origin);
    let ok = true;
    let error: string | undefined;
    if (!dryRun) {
      // One email per person, so customers never see each other's addresses.
      for (const addr of to) {
        const res = await sendEmail({ to: [addr], ...email });
        if (!res.ok) {
          ok = false;
          error = res.error;
        }
      }
    }
    summary.customerEmails.push({ client: clientName, to, assets: assets.length, ok, error });
    // A failed send is tried again tomorrow.
    if (ok) {
      logged.push(...assets);
      customerEmailsFor.set(clientId, to);
    }
  }

  const adminTo = [
    ...new Set((adminProfiles ?? []).map((p) => emails.get(p.id)).filter((e): e is string => Boolean(e))),
  ];
  if (adminTo.length) {
    const email = buildInspectorEmail(due, origin, summary.clientsWithoutLogin);
    let ok = true;
    let error: string | undefined;
    if (!dryRun) {
      for (const addr of adminTo) {
        const res = await sendEmail({ to: [addr], ...email });
        if (!res.ok) {
          ok = false;
          error = res.error;
        }
      }
    }
    summary.inspectorEmail = { to: adminTo, assets: due.length, ok, error };
  }

  if (!dryRun && logged.length) {
    const { error } = await admin.from("due_reminders").upsert(
      logged.map((a) => ({
        asset_id: a.assetId,
        due_date: a.dueDate,
        stage: a.stage,
        customer_emails: customerEmailsFor.get(a.clientId) ?? [],
      })),
      { onConflict: "asset_id,due_date,stage", ignoreDuplicates: true },
    );
    if (error) throw new Error(`Emails sent but could not record them: ${error.message}`);
  }

  return summary;
}
