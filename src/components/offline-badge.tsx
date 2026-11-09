"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { flushOutbox, useOutbox } from "@/lib/offline/outbox";
import { useOnline } from "@/lib/use-online";

/** How often to try again while something is waiting and the phone says it has signal. */
const RETRY_MS = 30_000;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Connection and upload status for the whole dashboard. It also runs the uploads: on opening the app,
 * when the signal comes back, when the app is brought back to the front, and every 30 seconds while
 * anything is still waiting.
 */
export function OfflineBadge() {
  const router = useRouter();
  const online = useOnline();
  const { items, syncing, uploadedRuns } = useOutbox();
  const [justUploaded, setJustUploaded] = useState(false);
  const seenRuns = useRef(uploadedRuns);

  const pending = items?.filter((i) => i.status === "pending") ?? [];
  const failed = items?.filter((i) => i.status === "failed") ?? [];
  const waiting = pending.length > 0;

  useEffect(() => {
    if (online) void flushOutbox();
  }, [online]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && navigator.onLine) void flushOutbox();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    if (!online || !waiting) return;
    const timer = window.setInterval(() => void flushOutbox(), RETRY_MS);
    return () => window.clearInterval(timer);
  }, [online, waiting]);

  // Something went up: show the server's copy and say so for a moment.
  useEffect(() => {
    if (uploadedRuns === seenRuns.current) return;
    seenRuns.current = uploadedRuns;
    router.refresh();
    const show = window.setTimeout(() => setJustUploaded(true), 0);
    const hide = window.setTimeout(() => setJustUploaded(false), 5000);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [uploadedRuns, router]);

  const stuck = pending.some((i) => i.attempts >= 3);
  const failedOrder = failed[0]?.orderId;

  let tone: "amber" | "red" | "green" | null = null;
  let body: React.ReactNode = null;

  if (failed.length > 0) {
    tone = "red";
    body = (
      <>
        <span className="font-semibold">{plural(failed.length, "change", "changes")} couldn&apos;t upload.</span>{" "}
        {failed[0].error}{" "}
        <Link href={`/product-inspections/${failedOrder}`} className="font-semibold underline underline-offset-2">
          Open the inspection
        </Link>{" "}
        to fix it.
      </>
    );
  } else if (!online) {
    tone = "amber";
    body = waiting ? (
      <>
        <span className="font-semibold">You&apos;re offline.</span> {plural(pending.length, "change is", "changes are")} saved on
        this phone and will upload by themselves when the signal is back.
      </>
    ) : (
      <>
        <span className="font-semibold">You&apos;re offline.</span> Keep going: inspections and defects are saved on this
        phone and upload by themselves when the signal is back.
      </>
    );
  } else if (waiting) {
    tone = "amber";
    body = (
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          <span className="font-semibold">
            {syncing ? "Uploading" : "Waiting to upload"} {plural(pending.length, "saved change", "saved changes")}
            {syncing ? "…" : "."}
          </span>{" "}
          {stuck ? "The connection is weak, so it keeps trying. Keep the app open." : null}
        </span>
        {!syncing ? (
          <button
            type="button"
            onClick={() => void flushOutbox()}
            className="font-semibold underline underline-offset-2"
          >
            Try now
          </button>
        ) : null}
      </span>
    );
  } else if (justUploaded) {
    tone = "green";
    body = <span className="font-semibold">Everything saved on this phone has been uploaded.</span>;
  }

  if (!tone) return null;
  const toneCls = {
    amber: "border-amber-300 bg-amber-50 text-amber-950",
    red: "border-red-300 bg-red-50 text-red-950",
    green: "border-emerald-300 bg-emerald-50 text-emerald-950",
  }[tone];

  return (
    <div
      role="status"
      className={`mx-4 mt-4 flex items-start gap-2 rounded-lg border px-4 py-2.5 text-sm shadow-sm md:mx-8 print:hidden ${toneCls}`}
    >
      <svg className="mt-0.5 size-4 shrink-0" aria-hidden fill="none" viewBox="0 0 24 24">
        {online ? (
          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16V4m0 0l-4 4m4-4l4 4M5 20h14" />
        ) : (
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3l18 18M8.5 16.4a5 5 0 017 0M5 12.9a10 10 0 015.4-2.8m3.9.1A10 10 0 0119 12.9M1.4 9a15 15 0 015.9-3.4m4.7-.6A15 15 0 0122.6 9M12 20h.01"
          />
        )}
      </svg>
      <div>{body}</div>
    </div>
  );
}
