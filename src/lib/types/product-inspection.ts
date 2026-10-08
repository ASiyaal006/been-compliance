/** Factory inspection stages (QIMA model). */
export const INSPECTION_STAGES = ["IPC", "DUPRO", "PSI", "CLC"] as const;
export type InspectionStage = (typeof INSPECTION_STAGES)[number];

export const INSPECTION_STAGE_LABELS: Record<InspectionStage, string> = {
  IPC: "IPC · Initial production check",
  DUPRO: "DUPRO · During production",
  PSI: "PSI · Pre-shipment inspection",
  CLC: "CLC · Container loading check",
};

export const ORDER_STATUSES = ["Requested", "Confirmed", "In progress", "Report issued", "Cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Badge colours for each booking status. */
export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  Requested: "bg-amber-100 text-amber-900",
  Confirmed: "bg-sky-100 text-sky-900",
  "In progress": "bg-indigo-100 text-indigo-900",
  "Report issued": "bg-emerald-100 text-emerald-900",
  Cancelled: "bg-slate-100 text-slate-600",
};

/** ISO 2859-1 general (I–III) and special (S-1–S-4) inspection levels. */
export const AQL_INSPECTION_LEVELS = ["I", "II", "III", "S-1", "S-2", "S-3", "S-4"] as const;
export type AqlInspectionLevel = (typeof AQL_INSPECTION_LEVELS)[number];

/** Common AQL values offered in the booking form. */
export const AQL_VALUES = [0, 0.065, 0.1, 0.15, 0.25, 0.4, 0.65, 1.0, 1.5, 2.5, 4.0, 6.5] as const;

export const DEFAULT_AQL = { level: "II" as AqlInspectionLevel, critical: 0, major: 2.5, minor: 4.0 };

export const DEFECT_SEVERITIES = ["Critical", "Major", "Minor"] as const;
export type DefectSeverity = (typeof DEFECT_SEVERITIES)[number];

export function isInspectionStage(v: unknown): v is InspectionStage {
  return typeof v === "string" && (INSPECTION_STAGES as readonly string[]).includes(v);
}

export function isAqlInspectionLevel(v: unknown): v is AqlInspectionLevel {
  return typeof v === "string" && (AQL_INSPECTION_LEVELS as readonly string[]).includes(v);
}

export function isAqlValue(v: unknown): v is number {
  return typeof v === "number" && (AQL_VALUES as readonly number[]).includes(v);
}

export function isDefectSeverity(v: unknown): v is DefectSeverity {
  return typeof v === "string" && (DEFECT_SEVERITIES as readonly string[]).includes(v);
}

export function isOrderStatus(v: unknown): v is OrderStatus {
  return typeof v === "string" && (ORDER_STATUSES as readonly string[]).includes(v);
}

/** One checklist section from inspection_templates.checklist. */
export type ChecklistSection = { key: string; title: string; items: string[] };

export const CHECKLIST_ANSWERS = ["Pass", "Fail", "N/A"] as const;
export type ChecklistAnswer = (typeof CHECKLIST_ANSWERS)[number];

/** inspection_orders.checklist_results, keyed by checklistItemKey(). */
export type ChecklistResults = Record<string, { answer: ChecklistAnswer; note?: string }>;

export function isChecklistAnswer(v: unknown): v is ChecklistAnswer {
  return typeof v === "string" && (CHECKLIST_ANSWERS as readonly string[]).includes(v);
}

export function checklistItemKey(sectionKey: string, index: number): string {
  return `${sectionKey}.${index}`;
}

/** Reads a template's checklist JSON, skipping anything malformed. */
export function parseChecklist(json: unknown): ChecklistSection[] {
  const sections = (json as { sections?: unknown } | null)?.sections;
  if (!Array.isArray(sections)) return [];
  return sections.flatMap((s) => {
    const { key, title, items } = (s ?? {}) as Record<string, unknown>;
    if (typeof key !== "string" || typeof title !== "string" || !Array.isArray(items)) return [];
    return [{ key, title, items: items.filter((i): i is string => typeof i === "string") }];
  });
}

/** Reads saved checklist answers, keeping only well-formed entries. */
export function parseChecklistResults(json: unknown): ChecklistResults {
  if (!json || typeof json !== "object" || Array.isArray(json)) return {};
  const out: ChecklistResults = {};
  for (const [key, value] of Object.entries(json as Record<string, unknown>)) {
    const { answer, note } = (value ?? {}) as Record<string, unknown>;
    if (!isChecklistAnswer(answer)) continue;
    out[key] = typeof note === "string" && note ? { answer, note } : { answer };
  }
  return out;
}
