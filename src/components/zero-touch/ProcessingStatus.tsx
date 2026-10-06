export function ProcessingStatus() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="size-10 animate-spin rounded-full border-2 border-slate-200 border-t-navy"
        aria-hidden
      />
      <p className="text-sm font-medium text-[#002147]">Analysing document…</p>
      <p className="max-w-sm text-xs text-slate-muted">
        Claude is extracting asset and certificate fields. This usually takes a few seconds.
      </p>
    </div>
  );
}
