import { z } from "zod";

export const PARSED_DOCUMENT_STATUSES = ["Pass", "Fail", "Monitor", "Unknown"] as const;
export const PARSED_MACHINERY_TYPES = ["LOLER", "PSSR", "COSHH", "Other", "Unknown"] as const;

export const parsedDocumentSchema = z.object({
  assetName: z
    .string()
    .describe("Name, make, or description of the asset or equipment on the document."),
  serialOrModelNumber: z
    .string()
    .describe("Serial number, model number, or internal asset reference."),
  inspectionDate: z
    .string()
    .describe("Inspection or test date in YYYY-MM-DD format. Use an empty string if not found."),
  expiryDate: z
    .string()
    .describe(
      "Certificate expiry or next inspection due date in YYYY-MM-DD format. Use an empty string if not found.",
    ),
  inspectorOrCompany: z
    .string()
    .describe("Inspector name, examiner, or inspecting company/organisation."),
  status: z
    .enum(PARSED_DOCUMENT_STATUSES)
    .describe("Compliance outcome: Pass, Fail, Monitor, or Unknown if unclear."),
  clientName: z
    .string()
    .describe("Client or site owner name if visible. Use an empty string if not found."),
  siteLocation: z
    .string()
    .describe("Site, plant, or location if visible. Use an empty string if not found."),
  machineryType: z
    .enum(PARSED_MACHINERY_TYPES)
    .describe("Regulatory regime: LOLER, PSSR, COSHH, Other, or Unknown."),
  certificateReference: z
    .string()
    .describe("Certificate, report, or reference number. Use an empty string if not found."),
  examinerNotes: z
    .string()
    .describe("Key observations, defects, or notes from the document. Use an empty string if none."),
});

export type ParsedDocumentData = z.infer<typeof parsedDocumentSchema>;

export function normalizeIsoDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const ukMatch = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (ukMatch) {
    const [, day, month, year] = ukMatch;
    return `${year}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`;
  }

  return "";
}
