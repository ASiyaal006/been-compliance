"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { findAssetByCode } from "@/actions/find-asset";
import { QRScanner } from "@/components/ui/QRScanner";

/** "Scan asset" button: scan a tag and jump straight to that asset's page. */
export function ScanAssetButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  const handleDetected = useCallback(
    async (text: string) => {
      const res = await findAssetByCode(text);
      if (!res.ok) return res.error;
      router.push(`/assets/${encodeURIComponent(res.id)}`);
      return null;
    },
    [router],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center gap-2 rounded-lg border-2 border-navy bg-white px-4 py-2 text-sm font-semibold text-navy shadow-sm transition hover:bg-navy/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${className}`}
      >
        <svg className="size-4 shrink-0" aria-hidden fill="none" viewBox="0 0 24 24">
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M7 12h10"
          />
        </svg>
        Scan asset
      </button>
      <QRScanner open={open} onClose={close} onDetected={handleDetected} title="Scan asset tag" />
    </>
  );
}
