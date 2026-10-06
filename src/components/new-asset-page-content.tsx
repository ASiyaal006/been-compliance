"use client";

import { useCallback, useRef } from "react";
import { AddAssetForm } from "@/components/add-asset-form";
import { ZeroTouchCapture } from "@/components/zero-touch/ZeroTouchCapture";
import { useZeroTouchUpload } from "@/components/zero-touch/use-zero-touch-upload";
import type { ParsedDocumentData } from "@/lib/types/parsed-document";

export function NewAssetPageContent() {
  const applyParsedRef = useRef<(data: ParsedDocumentData) => void>(() => {});

  const bindApplyParsed = useCallback((apply: (data: ParsedDocumentData) => void) => {
    applyParsedRef.current = apply;
  }, []);

  const upload = useZeroTouchUpload((data) => applyParsedRef.current(data));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-r from-navy to-navy-700 px-5 py-4 text-white">
          <h2 className="text-sm font-semibold tracking-tight">Zero-Touch parser</h2>
          <p className="mt-0.5 text-xs text-white/80">
            Drop a certificate, inspection report, or asset plate to auto-fill the form below.
          </p>
        </div>
        <div className="p-5">
          <ZeroTouchCapture upload={upload} />
        </div>
      </section>

      <AddAssetForm bindApplyParsed={bindApplyParsed} />
    </div>
  );
}
