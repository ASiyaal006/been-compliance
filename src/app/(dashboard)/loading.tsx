export default function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12" aria-busy="true" aria-live="polite">
      <div
        className="size-10 animate-spin rounded-full border-2 border-slate-200 border-t-navy"
        aria-hidden
      />
      <p className="text-sm font-medium text-slate-muted">Loading dashboard…</p>
    </div>
  );
}
