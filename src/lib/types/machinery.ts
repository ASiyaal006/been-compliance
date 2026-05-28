export const MACHINERY_TYPES_DB = ["LOLER", "PSSR", "COSHH", "Other"] as const;
export type MachineryTypeDb = (typeof MACHINERY_TYPES_DB)[number];
