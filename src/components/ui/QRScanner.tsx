"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { BarcodeDetector as PonyfillDetector, BarcodeFormat } from "barcode-detector/ponyfill";

type Props = {
  open: boolean;
  onClose: () => void;
  /**
   * Called once per captured code. Resolve to null when the code was accepted
   * (the scanner keeps showing the success state), or to an error message to
   * show with a "Scan again" button.
   */
  onDetected: (text: string) => Promise<string | null>;
  title?: string;
};

type Phase =
  | { kind: "starting" }
  | { kind: "scanning" }
  | { kind: "found" }
  | { kind: "failed"; message: string }
  | { kind: "camera-error"; message: string };

type Detector = Pick<PonyfillDetector, "detect">;

const FORMATS: BarcodeFormat[] = [
  "qr_code",
  "data_matrix",
  "code_128",
  "code_39",
  "ean_13",
  "ean_8",
  "upc_a",
  "itf",
];

const SCAN_INTERVAL_MS = 150;

const noopSubscribe = () => () => {};

/**
 * Uses the browser's own barcode reader where it exists (Android Chrome) and
 * the ZXing-C++ WebAssembly ponyfill everywhere else (iPhone Safari).
 */
async function createDetector(): Promise<Detector> {
  const native = (globalThis as { BarcodeDetector?: typeof PonyfillDetector }).BarcodeDetector;
  if (native) {
    try {
      const supported = await native.getSupportedFormats();
      if (supported.includes("qr_code")) {
        return new native({ formats: FORMATS.filter((f) => supported.includes(f)) });
      }
    } catch {
      // Fall through to the ponyfill.
    }
  }
  const { BarcodeDetector } = await import("barcode-detector/ponyfill");
  return new BarcodeDetector({ formats: FORMATS });
}

function cameraErrorMessage(e: unknown): string {
  const name = e instanceof DOMException || e instanceof Error ? e.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Camera access is blocked. Allow the camera for this app in your phone's settings, then try again.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No camera was found on this device.";
  }
  if (name === "NotReadableError") {
    return "The camera is being used by another app. Close it and try again.";
  }
  return "The camera couldn't be started. Try again.";
}

function vibrate() {
  try {
    navigator.vibrate?.(120);
  } catch {
    // Not supported (e.g. iPhone); the on-screen tick is enough.
  }
}

/** Full-screen QR / barcode scanner using the rear camera. */
export function QRScanner({ open, onClose, onDetected, title = "Scan a tag" }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  const [phase, setPhase] = useState<Phase>({ kind: "starting" });
  const [attempt, setAttempt] = useState(0);
  // Portals need document; render nothing during SSR and hydration.
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function stopCamera() {
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
    }

    async function start() {
      setPhase({ kind: "starting" });
      if (!navigator.mediaDevices?.getUserMedia) {
        setPhase({
          kind: "camera-error",
          message: "This browser can't use the camera here. Open the app from its home screen icon or in Safari/Chrome.",
        });
        return;
      }

      let detector: Detector;
      try {
        [stream, detector] = await Promise.all([
          navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          }),
          createDetector(),
        ]);
      } catch (e) {
        stopCamera();
        if (!cancelled) setPhase({ kind: "camera-error", message: cameraErrorMessage(e) });
        return;
      }

      const video = videoRef.current;
      if (cancelled || !video) {
        stopCamera();
        return;
      }
      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        // Autoplay of a muted inline video is allowed; ignore spurious aborts.
      }
      if (cancelled) return;
      setPhase({ kind: "scanning" });

      const tick = async () => {
        if (cancelled) return;
        let text: string | null = null;
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          try {
            const codes = await detector.detect(video);
            text = codes.find((c) => c.rawValue.trim())?.rawValue ?? null;
          } catch {
            // A frame that fails to decode is normal; try the next one.
          }
        }
        if (cancelled) return;
        if (!text) {
          timer = setTimeout(tick, SCAN_INTERVAL_MS);
          return;
        }

        stopCamera();
        vibrate();
        setPhase({ kind: "found" });
        try {
          const err = await onDetectedRef.current(text);
          if (err && !cancelled) setPhase({ kind: "failed", message: err });
        } catch {
          if (!cancelled) setPhase({ kind: "failed", message: "Something went wrong. Try again." });
        }
      };
      void tick();
    }

    void start();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, attempt]);

  // Escape closes; lock page scroll while the scanner covers it.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !isClient) return null;

  const found = phase.kind === "found";
  const showVideo = phase.kind !== "camera-error";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[60] flex flex-col bg-black text-white print:hidden"
    >
      <video
        ref={videoRef}
        className={`absolute inset-0 size-full object-cover ${showVideo ? "" : "hidden"}`}
        muted
        playsInline
        autoPlay
      />

      <div className="relative z-20 flex items-center justify-between gap-3 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
        <p className="text-base font-semibold drop-shadow">{title}</p>
        <button
          type="button"
          onClick={onClose}
          className="flex size-10 items-center justify-center rounded-full bg-black/50 ring-1 ring-white/30 backdrop-blur transition hover:bg-black/70"
          aria-label="Close scanner"
        >
          <svg className="size-5" aria-hidden fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeWidth={2.5} d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-6">
        {phase.kind === "camera-error" ? (
          <div className="max-w-sm rounded-xl bg-white p-5 text-center text-slate-800 shadow-xl">
            <p className="text-sm font-semibold text-[#002147]">Camera unavailable</p>
            <p className="mt-2 text-sm">{phase.message}</p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setAttempt((n) => n + 1)}
                className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`relative aspect-square w-[min(72vw,18rem)] rounded-2xl shadow-[0_0_0_200vmax_rgba(0,0,0,0.55)] transition-colors ${
              found ? "bg-emerald-500/25" : ""
            }`}
            aria-hidden
          >
            {(
              [
                "left-0 top-0 rounded-tl-2xl border-l-4 border-t-4",
                "right-0 top-0 rounded-tr-2xl border-r-4 border-t-4",
                "bottom-0 left-0 rounded-bl-2xl border-b-4 border-l-4",
                "bottom-0 right-0 rounded-br-2xl border-b-4 border-r-4",
              ] as const
            ).map((pos) => (
              <span
                key={pos}
                className={`absolute size-10 ${pos} ${found ? "border-emerald-400" : "border-white"} transition-colors`}
              />
            ))}
            {phase.kind === "scanning" ? (
              <span className="qr-scan-line absolute inset-x-4 h-0.5 rounded-full bg-emerald-400 shadow-[0_0_12px_2px_rgba(52,211,153,0.7)]" />
            ) : null}
            {found ? (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex size-20 items-center justify-center rounded-full bg-emerald-500 shadow-lg">
                  <svg className="size-11 text-white" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              </span>
            ) : null}
          </div>
        )}
      </div>

      {showVideo ? (
        <div className="relative z-20 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 text-center">
          {phase.kind === "failed" ? (
            <div className="mx-auto max-w-sm rounded-xl bg-white p-4 text-slate-800 shadow-xl">
              <p className="text-sm">{phase.message}</p>
              <button
                type="button"
                onClick={() => setAttempt((n) => n + 1)}
                className="mt-3 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white"
              >
                Scan again
              </button>
            </div>
          ) : (
            <p className="text-sm font-medium drop-shadow" role="status" aria-live="polite">
              {phase.kind === "starting"
                ? "Starting camera…"
                : found
                  ? "Code captured. Opening…"
                  : "Point the camera at the QR code or barcode"}
            </p>
          )}
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
