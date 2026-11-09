"use server";

import { emailPasswordReset } from "@/lib/password-reset";

/** "Forgot password?" form. Always reports success for a valid email so it can't be used to check who has a login. */
export async function requestPasswordReset(rawEmail: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = rawEmail.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter the email you sign in with." };

  const res = await emailPasswordReset(email);
  if (!res.ok && res.rateLimited) return { ok: false, error: res.error };
  if (!res.ok) console.error("Password reset email failed:", res.error);
  return { ok: true };
}
