import { getExpiryStatus } from "@/lib/expiry";
import { INSPECTION_TYPE_CONFIG, primaryInspectionTypeFor } from "@/lib/types/inspection-types";

/** Reminder stages, in the order they are reached as the due date gets closer. */
export type ReminderStage = "30_days" | "7_days" | "overdue";

const STAGE_RANK: Record<ReminderStage, number> = { "30_days": 1, "7_days": 2, overdue: 3 };

/** First reminder goes this many days before the due date. */
export const FIRST_REMINDER_DAYS = 30;
/** Second reminder goes this many days before the due date. */
export const FINAL_REMINDER_DAYS = 7;
/** Overdue reminders are sent for assets that became overdue within this many days (avoids emailing old history). */
export const OVERDUE_WINDOW_DAYS = 30;

/** Which reminder an asset is due for today, or null when it needs none. */
export function stageForDays(daysUntilDue: number | null): ReminderStage | null {
  if (daysUntilDue === null) return null;
  if (daysUntilDue < 0) return daysUntilDue >= -OVERDUE_WINDOW_DAYS ? "overdue" : null;
  if (daysUntilDue <= FINAL_REMINDER_DAYS) return "7_days";
  if (daysUntilDue <= FIRST_REMINDER_DAYS) return "30_days";
  return null;
}

/**
 * True when this stage still needs sending: nothing at this stage or a later one has gone out
 * for the same due date. (If the job missed a few days, it sends the latest stage only.)
 */
export function needsReminder(stage: ReminderStage, alreadySent: ReminderStage[]): boolean {
  return !alreadySent.some((s) => STAGE_RANK[s] >= STAGE_RANK[stage]);
}

export type ReminderAsset = {
  assetId: string;
  clientId: string;
  clientName: string;
  serial: string;
  description: string | null;
  machineryType: string;
  siteLocation: string;
  dueDate: string;
  daysUntilDue: number;
  stage: ReminderStage;
};

export function daysUntil(dueDate: string, today: string): number | null {
  return getExpiryStatus(dueDate, { today }).daysUntilDue;
}

export function inspectionLabel(machineryType: string): string {
  return INSPECTION_TYPE_CONFIG[primaryInspectionTypeFor(machineryType)].label;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** "Tue 9 Dec 2026" */
export function formatUkDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function whenText(days: number): string {
  if (days < 0) return `${-days} day${days === -1 ? "" : "s"} overdue`;
  if (days === 0) return "due today";
  return `due in ${days} day${days === 1 ? "" : "s"}`;
}

function assetName(a: ReminderAsset): string {
  return a.description?.trim() ? `${a.description.trim()} (${a.serial})` : a.serial;
}

function sortByDue(assets: ReminderAsset[]): ReminderAsset[] {
  return [...assets].sort((a, b) => a.daysUntilDue - b.daysUntilDue || a.serial.localeCompare(b.serial));
}

type Row = { name: string; link: string; inspection: string; site: string; due: string; when: string; overdue: boolean; client?: string };

function toRows(assets: ReminderAsset[], origin: string, withClient: boolean): Row[] {
  return sortByDue(assets).map((a) => ({
    name: assetName(a),
    link: `${origin}/assets/${encodeURIComponent(a.assetId)}`,
    inspection: inspectionLabel(a.machineryType),
    site: a.siteLocation,
    due: formatUkDate(a.dueDate),
    when: whenText(a.daysUntilDue),
    overdue: a.daysUntilDue < 0,
    client: withClient ? a.clientName : undefined,
  }));
}

function htmlTable(rows: Row[], withClient: boolean): string {
  const th = (t: string) =>
    `<th style="text-align:left;padding:8px;border-bottom:2px solid #e2e8f0;font-size:12px;color:#475569">${t}</th>`;
  const td = (t: string, extra = "") => `<td style="padding:8px;border-bottom:1px solid #e2e8f0;font-size:14px;${extra}">${t}</td>`;
  const head = `<tr>${withClient ? th("Customer") : ""}${th("Equipment")}${th("Inspection")}${th("Site")}${th("Due")}</tr>`;
  const body = rows
    .map(
      (r) =>
        `<tr>${withClient ? td(escapeHtml(r.client ?? "")) : ""}${td(
          `<a href="${escapeHtml(r.link)}" style="color:#002147">${escapeHtml(r.name)}</a>`,
        )}${td(escapeHtml(r.inspection))}${td(escapeHtml(r.site))}${td(
          `${escapeHtml(r.due)}<br><span style="font-size:12px">${escapeHtml(r.when)}</span>`,
          r.overdue ? "color:#b91c1c;font-weight:600" : "",
        )}</tr>`,
    )
    .join("");
  return `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%">${head}${body}</table>`;
}

function textList(rows: Row[], withClient: boolean): string {
  return rows
    .map((r) => `- ${withClient ? `${r.client}: ` : ""}${r.name} · ${r.inspection} · ${r.site} · ${r.due} (${r.when})\n  ${r.link}`)
    .join("\n");
}

function wrapHtml(intro: string, table: string, outro: string): string {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:24px">
<p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#002147">Been Compliance</p>
${intro}
${table}
${outro}
</div></body></html>`;
}

export type BuiltEmail = { subject: string; html: string; text: string };

/** Reminder to a customer about their own equipment. */
export function buildCustomerEmail(clientName: string, assets: ReminderAsset[], origin: string): BuiltEmail {
  const rows = toRows(assets, origin, false);
  const overdue = assets.filter((a) => a.daysUntilDue < 0).length;
  const n = assets.length;
  const items = `${n} inspection${n === 1 ? "" : "s"}`;
  const subject = overdue
    ? `Action needed: ${overdue === n ? items : `${overdue} of ${items}`} overdue for ${clientName}`
    : `Reminder: ${items} due soon for ${clientName}`;
  const lead =
    overdue === n
      ? "The statutory inspections below are now overdue. The equipment should not be used until it has been inspected."
      : overdue
        ? "Some of the statutory inspections below are overdue and the rest are due soon. Overdue equipment should not be used until it has been inspected."
        : "The statutory inspections below are coming up soon.";
  const close = "Please contact Been Compliance to arrange a visit.";
  const html = wrapHtml(
    `<h1 style="margin:0 0 12px;font-size:20px;color:#002147">${escapeHtml(subject)}</h1><p style="font-size:14px;line-height:1.5">${escapeHtml(lead)}</p>`,
    htmlTable(rows, false),
    `<p style="font-size:14px;line-height:1.5;margin-top:16px">${escapeHtml(close)}</p>`,
  );
  const text = `${subject}\n\n${lead}\n\n${textList(rows, false)}\n\n${close}\n\nBeen Compliance`;
  return { subject, html, text };
}

/** Daily digest for Been Compliance inspectors (admins): every reminder that went out today. */
export function buildInspectorEmail(
  assets: ReminderAsset[],
  origin: string,
  clientsWithoutLogin: string[],
): BuiltEmail {
  const rows = toRows(assets, origin, true);
  const overdue = assets.filter((a) => a.daysUntilDue < 0).length;
  const n = assets.length;
  const subject = `Inspections to book: ${n} due${overdue ? `, ${overdue} overdue` : ""}`;
  const lead = "These inspections reached a reminder point today. Customers with a login have been emailed too.";
  const missing = clientsWithoutLogin.length
    ? `No customer login yet, so not emailed: ${clientsWithoutLogin.join(", ")}.`
    : "";
  const html = wrapHtml(
    `<h1 style="margin:0 0 12px;font-size:20px;color:#002147">${escapeHtml(subject)}</h1><p style="font-size:14px;line-height:1.5">${escapeHtml(lead)}</p>`,
    htmlTable(rows, true),
    missing ? `<p style="font-size:13px;line-height:1.5;margin-top:16px;color:#92400e">${escapeHtml(missing)}</p>` : "",
  );
  const text = `${subject}\n\n${lead}\n\n${textList(rows, true)}${missing ? `\n\n${missing}` : ""}\n\nBeen Compliance`;
  return { subject, html, text };
}
