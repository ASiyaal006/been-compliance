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
    padding: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: navy,
    lineHeight: 1.45,
  },
  headerBand: {
    borderBottomWidth: 3,
    borderBottomColor: navy,
    paddingBottom: 16,
    marginBottom: 24,
  },
  logoPlaceholder: {
    fontSize: 9,
    letterSpacing: 2,
    color: slate,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: slate,
  },
  referenceBox: {
    marginTop: 20,
    marginBottom: 24,
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
    paddingVertical: 8,
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
    minHeight: 72,
  },
  notesText: {
    fontSize: 9,
    color: navy,
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
    fontSize: 8,
    color: slate,
    textAlign: "center",
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

/** PDF layout — only ever rendered client-side via pdf().toBlob(). */
function CertificateTemplate({ data }: { data: CertificatePdfData }) {
  const notes = data.examinerNotes?.trim() || "No additional examiner notes recorded.";

  return (
    <Document title={`Certificate ${data.reference}`} author="Been Compliance">
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBand}>
          <Text style={styles.logoPlaceholder}>COMPANY LOGO</Text>
          <Text style={styles.title}>Certificate of Thorough Examination</Text>
          <Text style={styles.subtitle}>
            Been Compliance · Testing, Inspection, Certification and Compliance
          </Text>
        </View>

        <View style={styles.referenceBox}>
          <Text style={styles.referenceLabel}>Certificate reference</Text>
          <Text style={styles.referenceValue}>{data.reference}</Text>
        </View>

        <Text style={styles.sectionTitle}>Asset details</Text>
        <TemplateDetailRow label="Asset ID / serial" value={data.assetIdSerial} />
        <TemplateDetailRow label="Machinery type" value={data.machineryType} />
        <TemplateDetailRow label="Site location" value={data.siteLocation} />
        <TemplateDetailRow label="SWL / capacity" value={data.swl} />
        <TemplateDetailRow label="Client" value={data.clientName} />

        <Text style={styles.sectionTitle}>Inspection details</Text>
        <TemplateDetailRow label="Inspection date" value={data.inspectionDate} />
        <View style={styles.row}>
          <Text style={styles.label}>Outcome</Text>
          <Text style={[styles.value, outcomeStyle(data.outcome)]}>{data.outcome}</Text>
        </View>
        <TemplateDetailRow label="Next inspection due" value={data.nextInspectionDue} />

        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Examiner's notes</Text>
        <View style={styles.notesBlock}>
          <Text style={styles.notesText}>{notes}</Text>
        </View>

        <Text style={styles.footer}>
          This certificate is issued in connection with a statutory thorough examination. It must be
          read alongside the full inspection file held by Been Compliance. beencompliance.com
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
