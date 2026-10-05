"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdf, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  type CertificatePdfData,
  type PDFDownloaderProps,
  certificateDownloadFilename,
} from "@/lib/types/certificate";

const navy = "#002147";
const slate = "#475569";

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingHorizontal: 48,
    paddingBottom: 72,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: navy,
    lineHeight: 1.45,
  },
  headerBand: {
    borderBottomWidth: 3,
    borderBottomColor: navy,
    paddingBottom: 12,
    marginBottom: 8,
  },
  wordmark: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 3,
    color: navy,
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.2,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 10,
    color: slate,
  },
  referenceBox: {
    marginTop: 12,
    marginBottom: 16,
    padding: 14,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  referenceLabel: {
    fontSize: 8,
    letterSpacing: 1.5,
    color: slate,
    marginBottom: 4,
  },
  referenceValue: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.2,
    color: navy,
    marginBottom: 10,
    marginTop: 8,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 5,
  },
  label: {
    width: "38%",
    fontSize: 9,
    color: slate,
    textTransform: "uppercase",
  },
  value: {
    width: "62%",
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  notesBlock: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    minHeight: 48,
  },
  notesText: {
    fontSize: 9,
    color: navy,
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
    fontSize: 8,
    color: slate,
    textAlign: "center",
  },
  dangerBox: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  dangerText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#b91c1c",
    lineHeight: 1.4,
  },
  signatureLine: {
    width: "62%",
    borderBottomWidth: 1,
    borderBottomColor: navy,
    height: 22,
  },
  outcomePass: { color: "#15803d" },
  outcomeFail: { color: "#b91c1c" },
  outcomeMonitor: { color: "#b45309" },
});

function outcomeStyle(outcome: string) {
  const o = outcome.toLowerCase();
  if (o === "fail" || o === "defect") return styles.outcomeFail;
  if (o === "monitor") return styles.outcomeMonitor;
  return styles.outcomePass;
}

function TemplateDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function safeToOperate(outcome: string): string {
  const o = outcome.toLowerCase();
  if (o === "fail" || o === "defect") return "No: do not use until the defects are remedied";
  if (o === "monitor") return "Yes, provided the defects are remedied by the date shown";
  return "Yes";
}

function isLolerReport(machineryType: string): boolean {
  return machineryType.trim().toUpperCase().startsWith("LOLER");
}

/** PDF layout — only ever rendered client-side via pdf().toBlob(). */
function CertificateTemplate({ data }: { data: CertificatePdfData }) {
  const notes = data.examinerNotes?.trim() || "No additional examiner notes recorded.";
  const failed = /^(fail|defect)$/i.test(data.outcome);

  return (
    <Document title={`Report ${data.reference}`} author="Been Compliance">
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.headerBand}>
          <Text style={styles.wordmark}>BEEN COMPLIANCE</Text>
          <Text style={styles.title}>Report of Thorough Examination</Text>
          <Text style={styles.subtitle}>
            {isLolerReport(data.machineryType)
              ? "Lifting Operations and Lifting Equipment Regulations 1998 · Regulation 9 and Schedule 1"
              : "Been Compliance · Testing, Inspection, Certification and Compliance"}
          </Text>
        </View>

        <View style={styles.referenceBox}>
          <Text style={styles.referenceLabel}>Report reference</Text>
          <Text style={styles.referenceValue}>{data.reference}</Text>
        </View>

        {failed ? (
          <View style={styles.dangerBox}>
            <Text style={styles.dangerText}>
              A defect involving an existing or imminent risk of serious personal injury was found. The equipment
              must not be used until it is remedied. A copy of this report must be sent to the relevant enforcing
              authority.
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Employer and premises</Text>
        <TemplateDetailRow label="Employer (client)" value={data.clientName} />
        <TemplateDetailRow label="Employer address" value={data.clientAddress} />
        <TemplateDetailRow label="Premises / site" value={data.siteLocation} />

        <Text style={styles.sectionTitle}>Equipment</Text>
        <TemplateDetailRow label="Asset ID / serial" value={data.assetIdSerial} />
        <TemplateDetailRow label="Description (make / model)" value={data.description} />
        <TemplateDetailRow label="Date of manufacture" value={data.manufactureDate} />
        <TemplateDetailRow label="Regime" value={data.machineryType} />
        <TemplateDetailRow label="Safe working load" value={data.swl} />
        <TemplateDetailRow label="Date of last thorough exam" value={data.previousExamDate} />

        <Text style={styles.sectionTitle}>Examination</Text>
        <TemplateDetailRow label="Date of examination" value={data.inspectionDate} />
        <TemplateDetailRow label="Reason for examination" value={data.reasonForExam} />
        <View style={styles.row}>
          <Text style={styles.label}>Outcome</Text>
          <Text style={[styles.value, outcomeStyle(data.outcome)]}>{data.outcome}</Text>
        </View>
        <TemplateDetailRow label="Safe to operate" value={safeToOperate(data.outcome)} />
        <TemplateDetailRow label="Defects and repair required" value={data.defects} />
        {data.defectRemedyBy ? (
          <TemplateDetailRow label="Defects to be remedied by" value={data.defectRemedyBy} />
        ) : null}
        <TemplateDetailRow label="Tests carried out" value={data.testDetails} />
        <TemplateDetailRow label="Next thorough exam due by" value={data.nextInspectionDue} />

        <Text style={styles.sectionTitle}>Competent person</Text>
        <TemplateDetailRow label="Examiner" value={data.examinerName} />
        <TemplateDetailRow label="Qualifications" value={data.examinerQualifications} />
        <TemplateDetailRow label="Employer name and address" value={data.examinerEmployer} />
        <TemplateDetailRow label="Date of report" value={data.inspectionDate} />
        <View style={styles.row} wrap={false}>
          <Text style={styles.label}>Signature / authentication</Text>
          <Text style={styles.signatureLine}> </Text>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 14 }]}>{"Examiner's notes"}</Text>
        <View style={styles.notesBlock}>
          <Text style={styles.notesText}>{notes}</Text>
        </View>

        <Text style={styles.footer} fixed>
          This report is issued in connection with a statutory thorough examination. It must be read alongside
          the full inspection file held by Been Compliance. beencompliance.com
        </Text>
      </Page>
    </Document>
  );
}

export default function PDFDownloader({ data, compact = false }: PDFDownloaderProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const downloadAnchorRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    import("@react-pdf/renderer").catch((err) => {
      console.error("[Certificate PDF] Failed to preload @react-pdf/renderer:", err);
    });
  }, []);

  async function handleDownload(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (!data.reference || data.reference === "—") {
      setError("No certificate reference for this record.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const blob = await pdf(<CertificateTemplate data={data} />).toBlob();
      const objectUrl = URL.createObjectURL(blob);

      const anchor = downloadAnchorRef.current ?? document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = certificateDownloadFilename(data.reference);
      anchor.style.display = "none";
      anchor.setAttribute("aria-hidden", "true");

      if (!downloadAnchorRef.current) {
        document.body.appendChild(anchor);
      }

      anchor.click();

      if (!downloadAnchorRef.current) {
        anchor.remove();
      }

      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        if (downloadAnchorRef.current) {
          downloadAnchorRef.current.removeAttribute("href");
          downloadAnchorRef.current.removeAttribute("download");
        }
      }, 2000);
    } catch (err) {
      console.error("[Certificate PDF] Download failed:", err);
      setError(err instanceof Error ? err.message : "Could not generate PDF.");
    } finally {
      setBusy(false);
    }
  }

  const buttonLabel = compact
    ? busy
      ? "Generating…"
      : "Download certificate"
    : busy
      ? "Generating PDF…"
      : "Download certificate (PDF)";

  return (
    <span className="relative z-10 inline-flex flex-col items-end gap-1">
      <a ref={downloadAnchorRef} className="hidden" tabIndex={-1} aria-hidden="true" />

      <button
        type="button"
        onClick={handleDownload}
        disabled={busy}
        title="Download certificate (PDF)"
        aria-label={`Download certificate ${data.reference}`}
        className={
          compact
            ? "inline-flex min-w-[10.5rem] items-center justify-center gap-1.5 rounded-lg border-2 border-navy bg-white px-3 py-2 text-[11px] font-semibold text-navy shadow-sm transition hover:bg-navy hover:text-white disabled:opacity-50"
            : "inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#00306a] disabled:opacity-50"
        }
      >
        <svg className="size-3.5 shrink-0" aria-hidden fill="none" viewBox="0 0 24 24">
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        {buttonLabel}
      </button>
      {error ? (
        <span className={`text-danger ${compact ? "text-[10px]" : "text-xs"}`}>{error}</span>
      ) : null}
    </span>
  );
}
