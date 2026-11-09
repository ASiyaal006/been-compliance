import "server-only";

/** Sender for app emails; the domain is verified in Resend. */
const DEFAULT_FROM = "Been Compliance <invites@beencompliance.com>";

export type EmailMessage = {
  to: string[];
  subject: string;
  html: string;
  text: string;
};

export type SendResult = { ok: true } | { ok: false; error: string };

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/**
 * Sends one email through the Resend API (the same account Supabase uses for login emails).
 * Needs RESEND_API_KEY in the environment; REMINDER_FROM_EMAIL can override the sender.
 */
export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY is not set." };
  if (message.to.length === 0) return { ok: false, error: "No recipients." };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.REMINDER_FROM_EMAIL?.trim() || DEFAULT_FROM,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });
    if (res.ok) return { ok: true };
    const body = await res.text().catch(() => "");
    return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 300)}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not reach Resend." };
  }
}
