"use client";

import dynamic from "next/dynamic";
import type { PDFDownloaderProps } from "@/lib/types/certificate";

/**
 * Client-only bridge: loads PDFDownloader with SSR disabled (required for @react-pdf/renderer).
 * Import this from the asset detail page — not PDFDownloader directly.
 */
const PDFDownloader = dynamic(() => import("@/components/PDFDownloader"), {
  ssr: false,
  loading: () => (
    <span className="inline-flex rounded-lg border border-[#002147]/10 bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-muted">
      …
    </span>
  ),
});

export default PDFDownloader;

export function PdfDownloaderSlot(props: PDFDownloaderProps) {
  return <PDFDownloader {...props} />;
}
