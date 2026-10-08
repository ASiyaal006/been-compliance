"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { startInspection } from "@/actions/product-inspection";

function readPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
    });
  });
}

function locationError(err: unknown): string {
  const code = (err as GeolocationPositionError | null)?.code;
  if (code === 1) {
    return "Location is blocked for this site. Allow location in your browser or phone settings, then press Start inspection again.";
  }
  if (code === 3) return "Finding your location took too long. Move near a window or outside and try again.";
  return "Your location couldn't be found. Turn on location services and try again.";
}

/** The locked state before an inspection starts: one button that records where the inspector is. */
export function StartInspectionCard({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"locating" | "saving" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    if (!("geolocation" in navigator) || !window.isSecureContext) {
      setError("This browser can't share your location. Open the app over https on your phone or a recent browser.");
      return;
    }
    setBusy("locating");
    let position: GeolocationPosition;
    try {
      position = await readPosition();
    } catch (err) {
      setBusy(null);
      setError(locationError(err));
      return;
    }
    setBusy("saving");
    const res = await startInspection({
      orderId,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    });
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <section className="overflow-hidden rounded-xl border-2 border-navy/20 bg-white shadow-sm">
      <div className="flex flex-col items-center gap-4 px-6 py-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-navy/10 text-navy">
          <svg className="size-6" aria-hidden fill="none" viewBox="0 0 24 24">
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 21s-7-6.2-7-11.5A7 7 0 0112 2.5a7 7 0 017 7C19 14.8 12 21 12 21z"
            />
            <circle cx="12" cy="9.5" r="2.5" stroke="currentColor" strokeWidth={2} />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-[#002147]">Start the inspection on site</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-muted">
            Press Start when you are at the factory. Your location and the time are recorded once, can&apos;t be changed,
            and appear on the client report. The checklist and defect log unlock after that.
          </p>
        </div>
        <button
          type="button"
          onClick={start}
          disabled={busy !== null}
          className="w-full max-w-xs rounded-lg bg-navy px-6 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-[#00306a] disabled:opacity-60"
        >
          {busy === "locating" ? "Finding your location…" : busy === "saving" ? "Starting…" : "Start inspection"}
        </button>
        {error ? (
          <p className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-sm text-red-900" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
