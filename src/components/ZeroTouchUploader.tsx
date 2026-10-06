"use client";

import { ZeroTouchCapture } from "@/components/zero-touch/ZeroTouchCapture";
import { useZeroTouchUpload } from "@/components/zero-touch/use-zero-touch-upload";
import type { ParsedDocumentData } from "@/lib/types/parsed-document";

type ZeroTouchUploaderProps = {
  onParsed?: (data: ParsedDocumentData) => void;
  className?: string;
};

export function ZeroTouchUploader({ onParsed, className = "" }: ZeroTouchUploaderProps) {
  const upload = useZeroTouchUpload(onParsed);

  return (
    <section
      className={`overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ${className}`}
      aria-label="Zero-touch document parser"
    >
      <div className="border-b border-slate-200 bg-gradient-to-r from-navy to-navy-700 px-5 py-4 text-white">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
            <svg className="size-5" aria-hidden fill="none" viewBox="0 0 24 24">
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"
              />
            </svg>
          </span>
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Zero-Touch parser</h2>
            <p className="mt-0.5 text-xs text-white/80">
              Drop a certificate, inspection report, or asset plate to auto-fill the form below.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5">
        <ZeroTouchCapture upload={upload} />
      </div>
    </section>
  );
}
