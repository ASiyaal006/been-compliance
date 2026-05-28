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
};

export type AssetCertificateContext = {
  assetIdSerial: string;
  machineryType: string;
  siteLocation: string;
  swl: string;
  clientName: string;
  nextInspectionDue: string;
};

export function buildCertificatePdfData(
  record: {
    date: string;
    outcome: string;
    reference: string;
    examinerNotes: string;
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
    nextInspectionDue: ctx.nextInspectionDue,
    examinerNotes: record.examinerNotes.trim() || "No additional examiner notes recorded.",
    clientName: ctx.clientName,
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
