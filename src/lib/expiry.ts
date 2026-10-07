/** Traffic-light expiry status for an asset's next statutory examination. */
export type ExpiryLevel = "red" | "yellow" | "green" | "none";

export type ExpiryStatus = {
  level: ExpiryLevel;
  /** Short badge text, e.g. "Expired", "Due soon", "In date". */
  label: string;
  /** Plain-English detail, e.g. "12 days overdue" or "Due in 5 days". */
  detail: string;
  /** Days until due (negative when overdue); null when there is no due date. */
  daysUntilDue: number | null;
};

/** Assets due within this many days show yellow. */
export const DUE_SOON_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

function ymdToUtcMs(ymd: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isFinite(ms) ? ms : null;
}

/** Today's date (YYYY-MM-DD) in UK time, so the day rolls over at UK midnight. */
export function todayUk(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/**
 * Red: due date has passed, or the latest examination failed (the report is no longer valid).
 * Yellow: due within {@link DUE_SOON_DAYS} days (including today).
 * Green: due later than that.
 * None: no due date recorded yet.
 */
export function getExpiryStatus(
  nextDue: string | null | undefined,
  options: { failed?: boolean; today?: string } = {},
): ExpiryStatus {
  const dueMs = nextDue ? ymdToUtcMs(nextDue) : null;
  const todayMs = ymdToUtcMs(options.today ?? todayUk());
  const days = dueMs !== null && todayMs !== null ? Math.round((dueMs - todayMs) / DAY_MS) : null;

  if (options.failed) {
    return { level: "red", label: "Failed", detail: "Last examination failed", daysUntilDue: days };
  }
  if (days === null) {
    return { level: "none", label: "No date", detail: "No due date recorded", daysUntilDue: null };
  }
  if (days < 0) {
    return { level: "red", label: "Expired", detail: `${plural(-days, "day")} overdue`, daysUntilDue: days };
  }
  if (days <= DUE_SOON_DAYS) {
    return {
      level: "yellow",
      label: "Due soon",
      detail: days === 0 ? "Due today" : `Due in ${plural(days, "day")}`,
      daysUntilDue: days,
    };
  }
  return { level: "green", label: "In date", detail: `Due in ${plural(days, "day")}`, daysUntilDue: days };
}

const LEVEL_ORDER: Record<ExpiryLevel, number> = { red: 0, yellow: 1, none: 2, green: 3 };

/** Most urgent first: red, yellow, no date, green; soonest due first within a level. */
export function compareExpiry(a: ExpiryStatus, b: ExpiryStatus): number {
  const byLevel = LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level];
  if (byLevel !== 0) return byLevel;
  return (a.daysUntilDue ?? Infinity) - (b.daysUntilDue ?? Infinity);
}
