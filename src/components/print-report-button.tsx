"use client";

/** Opens the browser's print dialog, where "Save as PDF" gives an A4 PDF of the report. */
export function PrintReportButton({ fileName }: { fileName: string }) {
  function handlePrint() {
    // Browsers use the page title as the suggested PDF file name.
    const previous = document.title;
    document.title = fileName;
    window.addEventListener("afterprint", () => (document.title = previous), { once: true });
    window.print();
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#00306a]"
    >
      <svg className="size-4" aria-hidden fill="none" viewBox="0 0 24 24">
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14"
        />
      </svg>
      Download PDF
    </button>
  );
}
