import type { ExpiryStatus } from "@/lib/expiry";

const BADGE_CLASSES: Record<ExpiryStatus["level"], string> = {
  red: "bg-danger-bg text-danger ring-danger/15",
  yellow: "bg-amber-bg text-amber ring-amber/20",
  green: "bg-success-bg text-success ring-success/15",
  none: "bg-slate-100 text-slate-700 ring-slate-200",
};

const DOT_CLASSES: Record<ExpiryStatus["level"], string> = {
  red: "bg-danger",
  yellow: "bg-amber-500",
  green: "bg-success",
  none: "bg-slate-400",
};

export function ExpiryBadge({ status }: { status: ExpiryStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${BADGE_CLASSES[status.level]}`}
      title={status.detail}
    >
      <span className={`size-2 rounded-full ${DOT_CLASSES[status.level]}`} aria-hidden />
      {status.label}
    </span>
  );
}
