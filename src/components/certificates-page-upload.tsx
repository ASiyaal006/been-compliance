"use client";

import { ZeroTouchCapture } from "@/components/zero-touch/ZeroTouchCapture";
import { useZeroTouchUpload } from "@/components/zero-touch/use-zero-touch-upload";

export function CertificatesPageUpload() {
  const upload = useZeroTouchUpload();

  return (
    <div className="border-b border-slate-200 bg-white px-4 py-5 shadow-sm md:px-8">
      <p className="mb-3 text-sm text-slate-muted">
        Drop a certificate or inspection report to extract fields with Zero-Touch parsing.
      </p>

      <ZeroTouchCapture upload={upload} persistCertificate />
    </div>
  );
}
