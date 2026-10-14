"use client";

import { useOnline } from "@/lib/use-online";

/** Pinned warning shown while the device has no connection (e.g. factory Wi-Fi drops). */
export function OfflineBadge() {
  const online = useOnline();
  if (online) return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-20 mx-auto mb-4 flex max-w-3xl items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-950 shadow-sm print:hidden"
    >
      <svg className="mt-0.5 size-4 shrink-0" aria-hidden fill="none" viewBox="0 0 24 24">
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 3l18 18M8.5 16.4a5 5 0 017 0M5 12.9a10 10 0 015.4-2.8m3.9.1A10 10 0 0119 12.9M1.4 9a15 15 0 015.9-3.4m4.7-.6A15 15 0 0122.6 9M12 20h.01"
        />
      </svg>
      <p>
        <span className="font-semibold">You&apos;re offline.</span> Keep this page open and your answers stay on screen,
        but nothing can be saved until the connection is back.
      </p>
    </div>
  );
}
