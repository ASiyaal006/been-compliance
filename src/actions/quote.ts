"use server";

import { z } from "zod";
import { sendEmail } from "@/lib/email/send-email";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { QUOTE_SERVICES } from "@/lib/marketing";

export type QuoteState = { status: "idle" } | { status: "sent" } | { status: "error"; message: string };

const serviceValues = QUOTE_SERVICES.map((s) => s.value) as [string, ...string[]];

const QuoteSchema = z.object({
  service: z.enum(serviceValues, { message: "Choose a service." }),
  name: z.string().trim().min(2, "Enter your name.").max(120),
  company: z.string().trim().max(160).optional().default(""),
  email: z.string().trim().email("Enter a valid email address.").max(200),
  phone: z.string().trim().max(40).optional().default(""),
  location: z.string().trim().max(200).optional().default(""),
  quantity: z.string().trim().max(200).optional().default(""),
  timing: z.string().trim().max(200).optional().default(""),
  details: z.string().trim().min(10, "Tell us a little about what you need.").max(5000),
});

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Where enquiries go: QUOTE_TO_EMAIL if set, otherwise every Been Compliance admin login. */
async function enquiryRecipients(): Promise<string[]> {
  const configured = (process.env.QUOTE_TO_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (configured.length) return configured;

  const admin = createSupabaseAdmin();
  const { data: profiles, error } = await admin.from("profiles").select("id").eq("is_been_admin", true);
  if (error) throw new Error(error.message);
  const ids = new Set((profiles ?? []).map((p) => p.id));
  const emails: string[] = [];
  for (const id of ids) {
    const { data } = await admin.auth.admin.getUserById(id);
    if (data.user?.email) emails.push(data.user.email);
  }
  return emails;
}

export async function submitQuote(_prev: QuoteState, formData: FormData): Promise<QuoteState> {
  // Spam traps: a hidden field people never fill, and a form filled in under 3 seconds.
  if (String(formData.get("website") ?? "").trim()) return { status: "sent" };
  const startedAt = Number(formData.get("started_at") ?? 0);
  if (startedAt && Date.now() - startedAt < 3000) return { status: "sent" };

  const parsed = QuoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Please check the form." };
  }
  const q = parsed.data;
  const serviceLabel = QUOTE_SERVICES.find((s) => s.value === q.service)?.label ?? q.service;

  let to: string[];
  try {
    to = await enquiryRecipients();
  } catch (e) {
    console.error("[quote] could not load recipients", e);
    to = [];
  }
  if (!to.length) {
    return {
      status: "error",
      message: "Sorry, we couldn't send your request just now. Please try again in a few minutes.",
    };
  }

  const rows: [string, string][] = [
    ["Service", serviceLabel],
    ["Name", q.name],
    ["Company", q.company],
    ["Email", q.email],
    ["Phone", q.phone],
    ["Location / factory", q.location],
    ["Quantity / items", q.quantity],
    ["Timing", q.timing],
  ];
  const filled = rows.filter(([, v]) => v);
  const text = `${filled.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nDetails:\n${q.details}\n\nReply to this email to answer ${q.name} directly.`;
  const html = `<h2 style="font-family:sans-serif;color:#002147">New quote request</h2>
<table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">${filled
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#64748b">${escapeHtml(k)}</td><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`,
    )
    .join("")}</table>
<p style="font-family:sans-serif;font-size:14px;white-space:pre-wrap;margin-top:16px">${escapeHtml(q.details)}</p>
<p style="font-family:sans-serif;font-size:12px;color:#64748b">Reply to this email to answer ${escapeHtml(q.name)} directly.</p>`;

  const res = await sendEmail({
    to,
    replyTo: q.email,
    subject: `Quote request: ${serviceLabel} from ${q.company || q.name}`,
    html,
    text,
  });
  if (!res.ok) {
    console.error("[quote] send failed", res.error);
    return {
      status: "error",
      message: "Sorry, we couldn't send your request just now. Please try again in a few minutes.",
    };
  }

  // Automatic acknowledgement to the enquirer, so nobody has to send one by hand.
  const ack = await sendEmail({
    to: [q.email],
    replyTo: to[0],
    subject: "We've received your quote request",
    text: `Hi ${q.name},\n\nThanks for getting in touch with Been Compliance. We've received your request for: ${serviceLabel}.\n\nWe'll come back to you with a fixed price, usually within one working day. If you have anything to add, such as photos, specifications or an equipment list, just reply to this email.\n\nBeen Compliance`,
    html: `<div style="font-family:sans-serif;font-size:15px;line-height:1.5;color:#0f172a">
<p>Hi ${escapeHtml(q.name)},</p>
<p>Thanks for getting in touch with Been Compliance. We've received your request for: <strong>${escapeHtml(serviceLabel)}</strong>.</p>
<p>We'll come back to you with a fixed price, usually within one working day. If you have anything to add, such as photos, specifications or an equipment list, just reply to this email.</p>
<p>Been Compliance</p></div>`,
  });
  if (!ack.ok) console.error("[quote] acknowledgement failed", ack.error);

  return { status: "sent" };
}
