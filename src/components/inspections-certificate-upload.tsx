"use client";

import Link from "next/link";
import { ZeroTouchCapture } from "@/components/zero-touch/ZeroTouchCapture";
import { useZeroTouchUpload } from "@/components/zero-touch/use-zero-touch-upload";

export function InspectionsCertificateUpload() {
  const upload = useZeroTouchUpload();

  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-base font-semibold text-[#002147]">Zero-Touch certificate parser</h2>
        <p className="mt-1 text-sm text-slate-muted">
          Drop an inspection certificate or report to extract fields. To save a record, open an asset and use{" "}
          <span className="font-medium text-navy">Log inspection</span>.
        </p>
      </div>
      <div className="p-6">
        <ZeroTouchCapture upload={upload} />

        <p className="mt-4 text-xs text-slate-muted">
          Need to file a new inspection?{" "}
          <Link href="/assets" className="font-semibold text-navy underline decoration-navy/30 underline-offset-2">
            Open the asset register
          </Link>
          , select an asset, then choose Log inspection.
        </p>
      </div>
    </section>
  );
}
