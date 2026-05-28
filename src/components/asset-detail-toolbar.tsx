"use client";

import { useState } from "react";
import { LogInspectionDialog } from "@/components/log-inspection-dialog";

type Props = {
  assetId: string | null;
  assetLabel: string;
};

export function AssetDetailToolbar({ assetId, assetLabel }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!assetId) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-navy bg-navy px-6 py-4 text-base font-semibold uppercase tracking-wide text-white shadow-[0_12px_40px_-12px_rgba(0,33,71,0.65)] transition hover:border-[#00306a] hover:bg-[#00306a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy sm:w-auto"
      >
        <svg className="size-5 shrink-0" aria-hidden fill="none" viewBox="0 0 24 24">
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        Log inspection
      </button>

      <LogInspectionDialog
        assetId={assetId}
        assetLabel={assetLabel}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}
