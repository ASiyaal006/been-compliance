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
