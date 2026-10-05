/** Serializable payload for client-side PDF generation (no server-only imports). */
export type CertificatePdfData = {
  reference: string;
  assetIdSerial: string;
  machineryType: string;
  siteLocation: string;
  swl: string;
  inspectionDate: string;
  outcome: string;
  nextInspectionDue: string;
  examinerNotes: string;
  clientName: string;
  clientAddress: string;
  description: string;
  manufactureDate: string;
  previousExamDate: string;
  reasonForExam: string;
  defects: string;
  defectRemedyBy: string;
  testDetails: string;
  examinerName: string;
  examinerQualifications: string;
  examinerEmployer: string;
};

export type AssetCertificateContext = {
  assetIdSerial: string;
  machineryType: string;
  siteLocation: string;
  swl: string;
  clientName: string;
  clientAddress: string;
  description: string;
  manufactureDate: string;
  /** Asset's current next due; used only for older records that did not store their own. */
  nextInspectionDue: string;
};

const NOT_RECORDED = "Not recorded";

export function buildCertificatePdfData(
  record: {
    date: string;
    outcome: string;
    reference: string;
    examinerNotes: string;
    reasonForExam: string;
    examinerName: string;
    examinerQualifications: string;
    examinerEmployer: string;
    defects: string;
    defectRemedyBy: string;
    testDetails: string;
    nextExaminationDue: string;
    previousExamDate: string;
  },
  ctx: AssetCertificateContext,
): CertificatePdfData {
  return {
    reference: record.reference,
    assetIdSerial: ctx.assetIdSerial,
    machineryType: ctx.machineryType,
    siteLocation: ctx.siteLocation,
    swl: ctx.swl,
    inspectionDate: record.date,
    outcome: record.outcome,
    nextInspectionDue: record.nextExaminationDue || ctx.nextInspectionDue,
    examinerNotes: record.examinerNotes.trim() || "No additional examiner notes recorded.",
    clientName: ctx.clientName,
    clientAddress: ctx.clientAddress || NOT_RECORDED,
    description: ctx.description,
    manufactureDate: ctx.manufactureDate,
    previousExamDate: record.previousExamDate || "None on file",
    reasonForExam: record.reasonForExam || NOT_RECORDED,
    defects: record.defects || "None",
    defectRemedyBy: record.defectRemedyBy,
    testDetails: record.testDetails || "None",
    examinerName: record.examinerName || NOT_RECORDED,
    examinerQualifications: record.examinerQualifications || NOT_RECORDED,
    examinerEmployer: record.examinerEmployer || NOT_RECORDED,
  };
}

export type PDFDownloaderProps = {
  data: CertificatePdfData;
  compact?: boolean;
};

export function certificateDownloadFilename(reference: string): string {
  const safe = reference
    .trim()
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `Certificate-${safe || "record"}.pdf`;
}
