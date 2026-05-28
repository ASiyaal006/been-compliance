"use client";

import dynamic from "next/dynamic";
import type { PDFDownloaderProps } from "@/lib/types/certificate";

function CertificateButtonPlaceholder() {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#002147]/15 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-muted"
      aria-hidden
    >
      <svg className="size-3.5 animate-pulse opacity-60" fill="none" viewBox="0 0 24 24">
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      Loading…
    </span>
  );
}

const PDFDownloader = dynamic(() => import("@/components/PDFDownloader"), {
  ssr: false,
  loading: () => <CertificateButtonPlaceholder />,
});

/** Client-only certificate download control for inspection history rows. */
export function InspectionCertificateButton(props: PDFDownloaderProps) {
  return <PDFDownloader {...props} compact />;
}
