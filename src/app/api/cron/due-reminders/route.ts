import { NextResponse, type NextRequest } from "next/server";
import { runDueReminders } from "@/lib/due-reminders-job";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily due-date reminders. Vercel Cron calls this (see vercel.json) with
 * "Authorization: Bearer <CRON_SECRET>". Add ?dryRun=1 to see who would be emailed without sending.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not set." }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = ["1", "true"].includes(request.nextUrl.searchParams.get("dryRun") ?? "");
  try {
    const summary = await runDueReminders({ dryRun });
    return NextResponse.json(summary);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Reminder run failed.";
    console.error("[due-reminders]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
