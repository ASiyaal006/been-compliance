"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";

type Props = {
  assetLabel: string;
  publicUrl: string;
};

export function AssetQrTag({ assetLabel, publicUrl }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function handlePrint() {
    window.print();
  }

  const printSheet = (
    <div
      id="qr-print-sheet"
      className="hidden print:flex print:min-h-screen print:w-full print:items-center print:justify-center print:bg-white"
    >
      <div className="flex flex-col items-center justify-center p-10 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#002147]">Been Compliance</p>
        <p className="mt-2 font-mono text-xl font-bold text-[#002147]">{assetLabel}</p>
        <div className="my-5 rounded-xl border-2 border-[#002147] p-4">
          <QRCodeSVG value={publicUrl} size={240} level="M" marginSize={1} />
        </div>
        <p className="max-w-xs text-[10px] leading-relaxed text-slate-600">
          Scan for live compliance status
        </p>
        <p className="mt-2 max-w-xs break-all font-mono text-[9px] text-slate-500">
          {publicUrl.replace(/^https?:\/\//, "")}
        </p>
      </div>
    </div>
  );

  return (
    <>
      <section
        className="rounded-xl border border-slate-200/90 bg-white p-6 shadow-sm"
        aria-labelledby="qr-tag-heading"
      >
        <h2
          id="qr-tag-heading"
          className="border-b border-navy/15 pb-2 text-xs font-bold uppercase tracking-widest text-[#002147]"
        >
          Physical asset tag (QR)
        </h2>
        <p className="mt-3 text-sm text-slate-muted">
          Scan to open the public compliance page for this machine — no login required.
        </p>

        <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-8">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-inner">
            <QRCodeSVG
              value={publicUrl}
              size={160}
              level="M"
              marginSize={2}
              aria-label={`QR code linking to public asset page for ${assetLabel}`}
            />
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-muted">Public URL</p>
            <p className="mt-1 break-all font-mono text-xs text-navy">{publicUrl}</p>
            <button
              type="button"
              onClick={handlePrint}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-navy bg-white px-4 py-2.5 text-sm font-semibold text-navy shadow-sm transition hover:bg-navy/[0.04] sm:w-auto"
            >
              <svg className="size-4" aria-hidden fill="none" viewBox="0 0 24 24">
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Print QR tag
            </button>
          </div>
        </div>
      </section>

      {mounted ? createPortal(printSheet, document.body) : null}
    </>
  );
}
