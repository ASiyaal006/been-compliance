import { DEFECT_SEVERITIES, type AqlInspectionLevel, type DefectSeverity } from "@/lib/types/product-inspection";

/**
 * ISO 2859-1 single sampling, normal inspection.
 * Table I gives a sample size code letter from the lot size and inspection level;
 * Table II-A gives the sample size and accept (Ac) / reject (Re) numbers for each AQL.
 */

const CODE_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N", "P", "Q", "R"] as const;
export type CodeLetter = (typeof CODE_LETTERS)[number];

const SAMPLE_SIZES = [2, 3, 5, 8, 13, 20, 32, 50, 80, 125, 200, 315, 500, 800, 1250, 2000];

/** Table I: [largest lot size in the band, letters for S-1, S-2, S-3, S-4, I, II, III]. */
const TABLE_I: [number, string][] = [
  [8, "AAAAAAB"],
  [15, "AAAAABC"],
  [25, "AABBBCD"],
  [50, "ABBCCDE"],
  [90, "BBCCCEF"],
  [150, "BBCDDFG"],
  [280, "BCDEEGH"],
  [500, "BCDEFHJ"],
  [1200, "CCEFGJK"],
  [3200, "CDEGHKL"],
  [10000, "CDFGJLM"],
  [35000, "CDFHKMN"],
  [150000, "DEGJLNP"],
  [500000, "DEGJMPQ"],
  [Infinity, "DEHKNQR"],
];

const LEVEL_COLUMNS: Record<AqlInspectionLevel, number> = {
  "S-1": 0,
  "S-2": 1,
  "S-3": 2,
  "S-4": 3,
  I: 4,
  II: 5,
  III: 6,
};

/** AQL columns of Table II-A, in order. */
const AQL_COLUMNS = [0.01, 0.015, 0.025, 0.04, 0.065, 0.1, 0.15, 0.25, 0.4, 0.65, 1.0, 1.5, 2.5, 4.0, 6.5];

/**
 * Table II-A runs in diagonals: a cell's plan depends only on (letter index + AQL index).
 * Diagonal 14 is Ac 0 / Re 1. The next diagonal is an up arrow and the one after a down arrow;
 * then Ac climbs 1, 2, 3, 5, 7, 10, 14, 21. Before diagonal 14 the arrow points down,
 * and beyond Ac 21 it points up.
 */
const ZERO_DIAGONAL = 14;
const ACCEPT_NUMBERS = [1, 2, 3, 5, 7, 10, 14, 21];

export type SamplingPlan = {
  codeLetter: CodeLetter;
  sampleSize: number;
  accept: number;
  reject: number;
  /** True when the lot is no bigger than the sample, so every unit is checked. */
  fullInspection: boolean;
};

export function codeLetterFor(lotSize: number, level: AqlInspectionLevel): CodeLetter {
  const band = TABLE_I.find(([max]) => lotSize <= max) ?? TABLE_I[TABLE_I.length - 1];
  return band[1][LEVEL_COLUMNS[level]] as CodeLetter;
}

function planAt(letterIndex: number, aqlIndex: number): { letterIndex: number; accept: number } {
  let i = letterIndex;
  for (;;) {
    if (i < 0 || i >= CODE_LETTERS.length) {
      // Only reachable with AQLs below the ones the app offers.
      return { letterIndex: Math.min(Math.max(i, 0), CODE_LETTERS.length - 1), accept: 0 };
    }
    const offset = i + aqlIndex - ZERO_DIAGONAL;
    if (offset < 0) {
      i += 1; // down arrow
    } else if (offset === 0) {
      return { letterIndex: i, accept: 0 };
    } else if (offset === 1) {
      i -= 1; // up arrow
    } else if (offset === 2) {
      i += 1; // down arrow
    } else if (offset - 3 < ACCEPT_NUMBERS.length) {
      return { letterIndex: i, accept: ACCEPT_NUMBERS[offset - 3] };
    } else {
      i -= 1; // up arrow
    }
  }
}

/**
 * Sampling plan for one severity. An AQL of 0 means no defects are allowed:
 * the code letter's sample is inspected and a single defect rejects the lot.
 */
export function samplingPlan(lotSize: number, level: AqlInspectionLevel, aql: number): SamplingPlan {
  const codeLetter = codeLetterFor(lotSize, level);
  const letterIndex = CODE_LETTERS.indexOf(codeLetter);

  let plan = { letterIndex, accept: 0 };
  const aqlIndex = AQL_COLUMNS.findIndex((v) => Math.abs(v - aql) < 1e-9);
  if (aql > 0 && aqlIndex >= 0) plan = planAt(letterIndex, aqlIndex);

  const tableSample = SAMPLE_SIZES[plan.letterIndex];
  return {
    codeLetter: CODE_LETTERS[plan.letterIndex],
    sampleSize: Math.min(tableSample, lotSize),
    accept: plan.accept,
    reject: plan.accept + 1,
    fullInspection: tableSample >= lotSize,
  };
}

export type SeverityAssessment = {
  severity: DefectSeverity;
  aql: number;
  plan: SamplingPlan;
  found: number;
  passed: boolean;
};

/** Checks the defects found against the sampling plan for each severity. */
export function assessAql(
  lotSize: number,
  settings: { level: AqlInspectionLevel; critical: number; major: number; minor: number },
  found: Record<DefectSeverity, number>,
): { severities: SeverityAssessment[]; passed: boolean } {
  const aqls: Record<DefectSeverity, number> = {
    Critical: settings.critical,
    Major: settings.major,
    Minor: settings.minor,
  };
  const severities = DEFECT_SEVERITIES.map((severity) => {
    const plan = samplingPlan(lotSize, settings.level, aqls[severity]);
    return { severity, aql: aqls[severity], plan, found: found[severity], passed: found[severity] <= plan.accept };
  });
  return { severities, passed: severities.every((s) => s.passed) };
}
