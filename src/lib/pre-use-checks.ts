/** Answers an operator can give for each pre-use checklist item. */
export const PRE_USE_ANSWERS = ["OK", "Fault", "N/A"] as const;
export type PreUseAnswer = (typeof PRE_USE_ANSWERS)[number];

export type PreUseResult = "OK" | "Fault";

export type PreUseItemAnswer = { item: string; answer: PreUseAnswer };

/**
 * Standard pre-use checklist for lifting equipment and accessories.
 * Items that don't apply (e.g. controls on a sling) are answered N/A.
 */
export const PRE_USE_CHECK_ITEMS = [
  "ID and safe working load (SWL) clearly marked",
  "Thorough examination tag or certificate in date",
  "No visible damage, cracks, distortion or corrosion",
  "Hooks, safety catches, shackles and pins in good order",
  "Chains, wire ropes, slings and webbing free from wear or damage",
  "Controls, limit switches and emergency stop working",
  "Brakes hold the load",
  "No hydraulic or oil leaks",
] as const;

export function isPreUseAnswer(value: unknown): value is PreUseAnswer {
  return typeof value === "string" && (PRE_USE_ANSWERS as readonly string[]).includes(value);
}

/** Any item marked Fault makes the whole check a Fault. */
export function preUseResult(items: PreUseItemAnswer[]): PreUseResult {
  return items.some((i) => i.answer === "Fault") ? "Fault" : "OK";
}
