export const MACHINERY_TYPES_DB = [
  "LOLER (Personnel)",
  "LOLER (Accessory)",
  "LOLER (Standard)",
  "LOLER",
  "PSSR",
  "COSHH",
  "Other",
] as const;
export type MachineryTypeDb = (typeof MACHINERY_TYPES_DB)[number];

/** Types offered when registering a new asset (plain "LOLER" is kept only for older records). */
export const MACHINERY_TYPE_OPTIONS: { value: MachineryTypeDb; label: string }[] = [
  { value: "LOLER (Personnel)", label: "LOLER · lifts people (6-monthly)" },
  { value: "LOLER (Accessory)", label: "LOLER · lifting accessory (6-monthly)" },
  { value: "LOLER (Standard)", label: "LOLER · other lifting equipment (12-monthly)" },
  { value: "PSSR", label: "PSSR" },
  { value: "COSHH", label: "COSHH" },
  { value: "Other", label: "Other" },
];

export function isMachineryType(value: string): value is MachineryTypeDb {
  return (MACHINERY_TYPES_DB as readonly string[]).includes(value);
}

export function isLolerType(value: string): boolean {
  return value.trim().toUpperCase().startsWith("LOLER");
}
