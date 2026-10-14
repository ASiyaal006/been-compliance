import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline · Been Compliance" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-navy text-lg font-bold text-white">
          B
        </div>
        <h1 className="text-xl font-semibold text-[#002147]">You&apos;re offline</h1>
        <p className="mt-2 text-sm text-slate-muted">
          This page hasn&apos;t been opened on this device yet, so it isn&apos;t available without a connection. Pages you
          opened recently still work. Reconnect to carry on.
        </p>
      </div>
    </div>
  );
}
