"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard]", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center">
      <h2 className="text-lg font-semibold text-[#002147]">Something went wrong</h2>
      <p className="max-w-md text-sm text-slate-muted">
        {error.message || "The dashboard could not load. Try again or sign out and back in."}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-[#00306a]"
        >
          Try again
        </button>
        <Link
          href="/login"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-navy hover:bg-slate-50"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
