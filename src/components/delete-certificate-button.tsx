"use client";

import { useState, useTransition } from "react";
import { deleteCertificate } from "@/actions/delete-certificate";

export function DeleteCertificateButton({
  certificateId,
  reference,
}: {
  certificateId: string;
  reference: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!window.confirm(`Delete uploaded certificate ${reference}? This can't be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCertificate(certificateId);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error ? (
        <span className="max-w-[220px] whitespace-normal text-right text-[11px] text-red-700" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
