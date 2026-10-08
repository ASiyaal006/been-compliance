"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setBookingStatus } from "@/actions/product-inspection";
import type { OrderStatus } from "@/lib/types/product-inspection";

/** Confirm or cancel a booking before the inspection starts. */
export function BookingStatusActions({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(next: "Requested" | "Confirmed" | "Cancelled") {
    if (next === "Cancelled" && !window.confirm("Cancel this booking?")) return;
    setBusy(true);
    setError(null);
    const res = await setBookingStatus(orderId, next);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  const btn =
    "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "Requested" ? (
        <button type="button" disabled={busy} onClick={() => change("Confirmed")} className={btn}>
          Mark confirmed
        </button>
      ) : null}
      {status === "Requested" || status === "Confirmed" ? (
        <button type="button" disabled={busy} onClick={() => change("Cancelled")} className={`${btn} hover:text-red-700`}>
          Cancel booking
        </button>
      ) : null}
      {status === "Cancelled" ? (
        <button type="button" disabled={busy} onClick={() => change("Requested")} className={btn}>
          Restore booking
        </button>
      ) : null}
      {error ? (
        <span className="text-xs text-red-800" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
