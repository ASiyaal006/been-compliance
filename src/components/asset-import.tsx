"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { checkExistingAssets, importAssets, type ImportAssetsResult } from "@/actions/import-assets";
import {
  IMPORT_COLUMNS,
  MAX_IMPORT_ROWS,
  parseCsv,
  parseSheet,
  serialKey,
  templateCsv,
  type ImportRow,
  type ParsedSheet,
  type RawCell,
} from "@/lib/asset-import";

const labelCls = "mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-muted";
const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-[#002147] shadow-sm outline-none placeholder:text-slate-400 focus:border-navy/40 focus:ring-2 focus:ring-navy/20";

type RowStatus = "ready" | "problem" | "exists" | "example";

function ukDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

async function readFile(file: File): Promise<RawCell[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xls")) {
    throw new Error("Old .xls files can't be read. In Excel, choose File › Save As › Excel Workbook (.xlsx), then upload that.");
  }
  if (name.endsWith(".xlsx")) {
    const { readSheet } = await import("read-excel-file/browser");
    const data = await readSheet(file);
    return data as unknown as RawCell[][];
  }
  return parseCsv(await file.text());
}

function downloadTemplate() {
  const blob = new Blob([templateCsv()], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "asset-import-template.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function AssetImport({ customers }: { customers: string[] }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [existingCheck, setExistingCheck] = useState<{ key: string; serials: Set<string> } | null>(null);
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportAssetsResult | null>(null);
  const [dragging, setDragging] = useState(false);

  const trimmedName = clientName.trim().replace(/\s+/g, " ");
  const isNewCustomer =
    trimmedName.length > 0 && !customers.some((c) => c.trim().toLowerCase() === trimmedName.toLowerCase());

  // Ask the server which asset IDs this customer already has, so the preview can say so.
  // The answer is kept with the customer + sheet it was for, so a stale answer is never shown.
  const checkKey = sheet && trimmedName && !isNewCustomer ? `${trimmedName.toLowerCase()}|${sheet.rows.length}|${fileName}` : null;
  useEffect(() => {
    if (!checkKey || !sheet) return;
    const serials = sheet.rows.filter((r) => r.assetIdSerial && !r.isExample).map((r) => r.assetIdSerial);
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await checkExistingAssets({ clientName: trimmedName, serials });
      if (cancelled) return;
      setExistingCheck({ key: checkKey, serials: new Set(res.ok ? res.existing.map(serialKey) : []) });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [checkKey, sheet, trimmedName]);
  const existing = useMemo(
    () => (checkKey && existingCheck?.key === checkKey ? existingCheck.serials : new Set<string>()),
    [checkKey, existingCheck],
  );
  const checking = Boolean(checkKey && existingCheck?.key !== checkKey);

  const statusOf = (row: ImportRow): RowStatus => {
    if (row.isExample) return "example";
    if (row.errors.length > 0) return "problem";
    if (existing.has(serialKey(row.assetIdSerial))) return "exists";
    return "ready";
  };

  const counts = useMemo(() => {
    const c = { ready: 0, problem: 0, exists: 0, example: 0 };
    for (const row of sheet?.rows ?? []) c[statusOf(row)]++;
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet, existing]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setResult(null);
    setReadError(null);
    setSheet(null);
    setFileName(file.name);
    try {
      const grid = await readFile(file);
      const parsed = parseSheet(grid);
      if (parsed.rows.length === 0 && parsed.missingColumns.length > 0) {
        setReadError(
          "Couldn't find the column headings. The first row should name the columns, e.g. Asset ID / serial, Equipment type, Site location. Download the template to see the layout.",
        );
        return;
      }
      if (parsed.rows.length === 0) {
        setReadError("The sheet has headings but no equipment rows.");
        return;
      }
      if (parsed.rows.length > MAX_IMPORT_ROWS) {
        setReadError(`That sheet has ${parsed.rows.length} rows. Import up to ${MAX_IMPORT_ROWS} at a time.`);
        return;
      }
      setSheet(parsed);
      setOnlyProblems(false);
    } catch (e) {
      setReadError(e instanceof Error ? e.message : "Couldn't read that file.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function runImport() {
    if (!sheet) return;
    setBusy(true);
    setResult(null);
    const res = await importAssets({
      clientName: trimmedName,
      clientAddress,
      rows: sheet.rows.map((r) => ({
        rowNumber: r.rowNumber,
        assetIdSerial: r.assetIdSerial,
        machineryTypeRaw: r.machineryTypeRaw,
        siteLocation: r.siteLocation,
        commissioningDate: r.commissioningDate,
        swl: r.swl,
        description: r.description,
        manufactureDate: r.manufactureDate,
        nextInspectionDue: r.nextInspectionDue,
        notes: r.notes,
      })),
    });
    setBusy(false);
    setResult(res);
    if (res.ok) {
      setSheet(null);
      setFileName(null);
      router.refresh();
    }
  }

  function reset() {
    setResult(null);
    setSheet(null);
    setFileName(null);
    setReadError(null);
  }

  const visibleRows = (sheet?.rows ?? []).filter((r) => !onlyProblems || statusOf(r) === "problem");
  const canImport = Boolean(sheet && trimmedName && counts.ready > 0 && !busy);

  if (result?.ok) {
    const realSkips = result.skipped.filter((s) => !s.reason.startsWith("Example row"));
    return (
      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
        <div className="border-b border-emerald-200 bg-emerald-50 px-6 py-5">
          <h2 className="text-base font-semibold text-emerald-900">
            {result.imported} {result.imported === 1 ? "asset" : "assets"} added for {result.clientName}
          </h2>
          <p className="mt-1 text-sm text-emerald-800">
            {result.imported > 0
              ? "They're in the asset register now. Assets with a next due date are included in reminder emails."
              : "Nothing new to add."}
          </p>
        </div>
        {realSkips.length > 0 ? (
          <div className="px-6 py-5">
            <h3 className="text-sm font-semibold text-[#002147]">
              {realSkips.length} {realSkips.length === 1 ? "row was" : "rows were"} not added
            </h3>
            <p className="mt-1 text-sm text-slate-muted">
              Fix these in the spreadsheet and upload it again. Assets already added are skipped, so nothing is
              duplicated.
            </p>
            <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
              {realSkips.map((s) => (
                <li key={`${s.rowNumber}-${s.assetIdSerial}`} className="flex gap-3 px-4 py-2.5">
                  <span className="w-14 shrink-0 tabular-nums text-slate-500">Row {s.rowNumber}</span>
                  <span className="w-32 shrink-0 truncate font-mono text-[13px] text-[#002147]">
                    {s.assetIdSerial || "—"}
                  </span>
                  <span className="min-w-0 text-slate-700">{s.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2 border-t border-slate-200 bg-slate-50/50 px-6 py-4">
          <Link
            href="/assets"
            className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00306a]"
          >
            View asset register
          </Link>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Import another sheet
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4">
          <h2 className="text-base font-semibold text-[#002147]">1. Customer</h2>
          <p className="mt-1 text-sm text-slate-muted">Every row in the sheet is added to this customer.</p>
        </div>
        <div className="space-y-5 px-6 py-6">
          <div>
            <label htmlFor="import_customer" className={labelCls}>
              Customer name
            </label>
            <input
              id="import_customer"
              list="import_customer_list"
              autoComplete="off"
              placeholder="Pick an existing customer or type a new one"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className={inputCls}
            />
            <datalist id="import_customer_list">
              {customers.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {isNewCustomer ? (
              <p className="mt-1 text-xs text-slate-500">New customer: they&apos;ll be created when you import.</p>
            ) : null}
          </div>
          {isNewCustomer ? (
            <div>
              <label htmlFor="import_address" className={labelCls}>
                Customer address (optional)
              </label>
              <textarea
                id="import_address"
                rows={2}
                placeholder="Printed on inspection reports"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                className={`${inputCls} resize-y`}
              />
            </div>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/80 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#002147]">2. Spreadsheet</h2>
            <p className="mt-1 text-sm text-slate-muted">Excel (.xlsx) or CSV, one piece of equipment per row.</p>
          </div>
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy shadow-sm transition hover:bg-slate-50"
          >
            <svg className="size-4" aria-hidden fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v12m0 0-4-4m4 4 4-4M5 20h14" />
            </svg>
            Download template
          </button>
        </div>
        <div className="space-y-5 px-6 py-6">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void handleFile(e.dataTransfer.files[0]);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
              dragging ? "border-navy bg-navy/5" : "border-slate-300 hover:border-navy/50 hover:bg-slate-50"
            }`}
          >
            <input
              ref={fileInput}
              type="file"
              accept=".csv,.xlsx,.xls,.tsv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
            <span className="text-sm font-semibold text-[#002147]">
              {fileName ? fileName : "Choose a spreadsheet or drop it here"}
            </span>
            <span className="mt-1 text-xs text-slate-500">
              {fileName ? "Choose another file to replace it" : "Column names don't have to match the template exactly"}
            </span>
          </label>

          {readError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
              {readError}
            </div>
          ) : null}

          <details className="rounded-lg border border-slate-200 text-sm">
            <summary className="cursor-pointer px-4 py-3 font-semibold text-[#002147]">What goes in each column</summary>
            <dl className="divide-y divide-slate-100 border-t border-slate-200">
              {IMPORT_COLUMNS.map((c) => (
                <div key={c.field} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[12rem_1fr]">
                  <dt className="font-medium text-[#002147]">
                    {c.header}
                    {c.required === "yes" ? <span className="ml-1 text-red-700">*</span> : null}
                  </dt>
                  <dd className="text-slate-muted">{c.help}</dd>
                </div>
              ))}
            </dl>
          </details>
        </div>
      </section>

      {sheet ? (
        <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4">
            <h2 className="text-base font-semibold text-[#002147]">3. Check and import</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-900">{counts.ready} ready</span>
              {counts.problem > 0 ? (
                <button
                  type="button"
                  onClick={() => setOnlyProblems((v) => !v)}
                  className="rounded-full bg-red-100 px-2.5 py-1 text-red-900 underline-offset-2 hover:underline"
                >
                  {counts.problem} need fixing {onlyProblems ? "· show all" : "· show only these"}
                </button>
              ) : null}
              {counts.exists > 0 ? (
                <span className="rounded-full bg-slate-200 px-2.5 py-1 text-slate-700">
                  {counts.exists} already in register
                </span>
              ) : null}
              {counts.example > 0 ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                  {counts.example} template {counts.example === 1 ? "example" : "examples"} skipped
                </span>
              ) : null}
              {checking ? <span className="px-1 py-1 font-normal text-slate-500">Checking register…</span> : null}
            </div>
            {sheet.ignoredHeaders.length > 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                Columns not imported: {sheet.ignoredHeaders.join(", ")}
              </p>
            ) : null}
            {sheet.missingColumns.length > 0 ? (
              <p className="mt-2 text-xs font-medium text-red-800">
                Missing columns: {sheet.missingColumns.join(", ")}
              </p>
            ) : null}
          </div>

          <div className="max-h-[32rem] overflow-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="sticky top-0 bg-white shadow-[0_1px_0_rgb(226_232_240)]">
                <tr>
                  {["Row", "Asset ID", "Status", "Type", "Site", "Commissioned", "SWL", "Next due"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map((row) => {
                  const status = statusOf(row);
                  return (
                    <tr key={row.rowNumber} className={status === "problem" ? "bg-red-50/60" : status === "ready" ? "" : "text-slate-400"}>
                      <td className="px-4 py-2.5 tabular-nums text-slate-500">{row.rowNumber}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[13px]">{row.assetIdSerial || "—"}</td>
                      <td className="min-w-56 px-4 py-2.5">
                        {status === "ready" ? (
                          <span className="font-semibold text-emerald-700">Ready</span>
                        ) : status === "exists" ? (
                          <span>Already in register</span>
                        ) : status === "example" ? (
                          <span>Example, skipped</span>
                        ) : (
                          <ul className="space-y-0.5 text-red-800">
                            {row.errors.map((e) => (
                              <li key={e}>{e}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-4 py-2.5">{row.machineryType ?? row.machineryTypeRaw ?? "—"}</td>
                      <td className="px-4 py-2.5">{row.siteLocation || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{ukDate(row.commissioningDate) || "—"}</td>
                      <td className="px-4 py-2.5">{row.swl || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{ukDate(row.nextInspectionDue) || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {result && !result.ok ? (
            <div className="border-t border-red-200 bg-red-50 px-6 py-3 text-sm text-red-900" role="alert">
              <span className="font-semibold">Import failed.</span> {result.error}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-muted">
              {!trimmedName
                ? "Enter the customer above to import."
                : counts.problem > 0
                  ? "Rows that need fixing are skipped. Fix them and upload again later: nothing is duplicated."
                  : "All good."}
            </p>
            <button
              type="button"
              disabled={!canImport}
              onClick={runImport}
              className="rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00306a] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Importing…" : `Import ${counts.ready} ${counts.ready === 1 ? "asset" : "assets"}`}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
