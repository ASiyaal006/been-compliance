/**
 * Bulk asset import: turns spreadsheet rows (CSV or Excel) into asset records.
 * Pure functions, shared by the import page (preview) and the server action (save),
 * so the preview and the import always agree on what is valid.
 */

import { MACHINERY_TYPE_OPTIONS, isLolerType, type MachineryTypeDb } from "@/lib/types/machinery";

export type ImportField =
  | "assetIdSerial"
  | "machineryType"
  | "siteLocation"
  | "commissioningDate"
  | "swl"
  | "description"
  | "manufactureDate"
  | "nextInspectionDue"
  | "notes";

type ColumnDef = {
  field: ImportField;
  /** Header written in the template. */
  header: string;
  required: "yes" | "lifting" | "no";
  help: string;
  /** Other headings people commonly use for the same thing. */
  aliases: string[];
};

export const IMPORT_COLUMNS: ColumnDef[] = [
  {
    field: "assetIdSerial",
    header: "Asset ID / serial",
    required: "yes",
    help: "The customer's asset code or the manufacturer serial. Must be unique for the customer.",
    aliases: ["asset id", "asset", "asset no", "asset number", "asset ref", "asset reference", "serial", "serial no", "serial number", "id", "plant no", "plant number", "fleet no", "fleet number"],
  },
  {
    field: "machineryType",
    header: "Equipment type",
    required: "yes",
    help: "LOLER Personnel, LOLER Accessory, LOLER Standard, PUWER, Electrical, PSSR, COSHH or Other.",
    aliases: ["type", "machinery type", "equipment", "regime", "category", "inspection type"],
  },
  {
    field: "siteLocation",
    header: "Site location",
    required: "yes",
    help: "Where the equipment is kept or used.",
    aliases: ["site", "location", "address", "depot", "site name"],
  },
  {
    field: "commissioningDate",
    header: "Commissioning date",
    required: "yes",
    help: "Date it was first put into service, e.g. 14/03/2024.",
    aliases: ["commissioned", "commission date", "date commissioned", "in service date", "date in service", "first use"],
  },
  {
    field: "swl",
    header: "SWL",
    required: "lifting",
    help: "Safe working load, e.g. 2,000 kg. Required for LOLER equipment.",
    aliases: ["safe working load", "wll", "working load limit", "capacity"],
  },
  {
    field: "description",
    header: "Make / model",
    required: "no",
    help: "e.g. Genie GS-1932 scissor lift.",
    aliases: ["make", "model", "make and model", "make model", "description", "equipment description", "name"],
  },
  {
    field: "manufactureDate",
    header: "Date of manufacture",
    required: "no",
    help: "A full date or just the year.",
    aliases: ["manufacture date", "manufactured", "year of manufacture", "yom", "year", "date manufactured"],
  },
  {
    field: "nextInspectionDue",
    header: "Next inspection due",
    required: "no",
    help: "If you know it, reminders start straight away. Otherwise it is set by the first inspection.",
    aliases: ["next due", "due", "due date", "next inspection", "next exam due", "next examination due", "next test due", "expiry", "expiry date"],
  },
  {
    field: "notes",
    header: "Notes",
    required: "no",
    help: "Anything useful for the inspector.",
    aliases: ["note", "comments", "comment", "remarks"],
  },
];

/** Asset IDs in the template's sample rows; rows using them are skipped, not imported. */
export const EXAMPLE_ID_PREFIX = "EXAMPLE-";

const EXAMPLE_ROWS: Record<ImportField, string>[] = [
  {
    assetIdSerial: "EXAMPLE-001",
    machineryType: "LOLER Personnel",
    siteLocation: "Main depot",
    commissioningDate: "14/03/2024",
    swl: "230 kg",
    description: "Genie GS-1932 scissor lift",
    manufactureDate: "2023",
    nextInspectionDue: "14/09/2026",
    notes: "Delete these example rows before importing",
  },
  {
    assetIdSerial: "EXAMPLE-002",
    machineryType: "PUWER",
    siteLocation: "Workshop",
    commissioningDate: "01/06/2022",
    swl: "",
    description: "Pillar drill",
    manufactureDate: "",
    nextInspectionDue: "",
    notes: "",
  },
];

function normKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const HEADER_LOOKUP = new Map<string, ImportField>();
for (const col of IMPORT_COLUMNS) {
  for (const name of [col.header, ...col.aliases]) {
    const k = normKey(name);
    if (!HEADER_LOOKUP.has(k)) HEADER_LOOKUP.set(k, col.field);
  }
}

const TYPE_LOOKUP = new Map<string, MachineryTypeDb>();
function addType(value: MachineryTypeDb, names: string[]) {
  for (const n of names) TYPE_LOOKUP.set(normKey(n), value);
}
addType("LOLER (Personnel)", ["LOLER (Personnel)", "LOLER Personnel", "Personnel", "Lifts people", "Personnel lifting", "MEWP", "Passenger lift"]);
addType("LOLER (Accessory)", ["LOLER (Accessory)", "LOLER Accessory", "Accessory", "Lifting accessory", "Lifting accessories"]);
addType("LOLER (Standard)", ["LOLER (Standard)", "LOLER Standard", "Standard", "Lifting equipment", "Other lifting equipment"]);
addType("PUWER", ["PUWER", "Work equipment"]);
addType("Electrical", ["Electrical", "PAT", "Electrical (PAT)", "PAT testing", "Electrical equipment", "Portable appliance"]);
addType("PSSR", ["PSSR", "Pressure", "Pressure system", "Pressure systems"]);
addType("COSHH", ["COSHH", "LEV"]);
addType("Other", ["Other"]);
for (const opt of MACHINERY_TYPE_OPTIONS) TYPE_LOOKUP.set(normKey(opt.label), opt.value);

export type RawCell = string | number | boolean | Date | null | undefined;

export type ImportRow = {
  /** Spreadsheet row number, counting the header as row 1. */
  rowNumber: number;
  assetIdSerial: string;
  machineryType: MachineryTypeDb | null;
  /** What the sheet said, shown when the type couldn't be read. */
  machineryTypeRaw: string;
  siteLocation: string;
  commissioningDate: string;
  swl: string;
  description: string;
  manufactureDate: string;
  nextInspectionDue: string;
  notes: string;
  errors: string[];
  /** Template sample row: shown but never imported. */
  isExample: boolean;
};

/** Row data sent to the server for saving. */
export type ImportRowInput = Pick<
  ImportRow,
  | "rowNumber"
  | "assetIdSerial"
  | "machineryTypeRaw"
  | "siteLocation"
  | "commissioningDate"
  | "swl"
  | "description"
  | "manufactureDate"
  | "nextInspectionDue"
  | "notes"
>;

export type ParsedSheet = {
  rows: ImportRow[];
  /** Headings in the file that matched nothing and were ignored. */
  ignoredHeaders: string[];
  /** Required columns not found in the file. */
  missingColumns: string[];
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isoIfValid(y: number, m: number, d: number): string | null {
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Excel stores dates as days since 30 Dec 1899. */
function fromExcelSerial(n: number): string | null {
  if (!Number.isFinite(n) || n < 1 || n > 200000) return null;
  const ms = Math.round((n - 25569) * 86400 * 1000);
  const dt = new Date(ms);
  return isoIfValid(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/**
 * Reads a date the way people type them in the UK: 14/03/2024, 14-03-24, 2024-03-14,
 * 14 Mar 2024, or a real Excel date cell. Returns YYYY-MM-DD, or null if unreadable.
 */
export function parseUkDate(value: RawCell): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return isoIfValid(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }
  if (typeof value === "number") return fromExcelSerial(value);
  if (typeof value === "boolean") return null;

  const s = value.trim();
  if (!s) return null;

  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T ].*)?$/.exec(s);
  if (m) return isoIfValid(+m[1]!, +m[2]!, +m[3]!);

  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/.exec(s);
  if (m) {
    let y = +m[3]!;
    if (m[3]!.length === 2) y += y >= 70 ? 1900 : 2000;
    return isoIfValid(y, +m[2]!, +m[1]!);
  }

  m = /^(\d{1,2})(?:st|nd|rd|th)?[\s-]+([a-z]+)\.?,?[\s-]+(\d{2}|\d{4})$/i.exec(s);
  if (m) {
    const month = MONTHS.indexOf(m[2]!.slice(0, 3).toLowerCase());
    let y = +m[3]!;
    if (m[3]!.length === 2) y += y >= 70 ? 1900 : 2000;
    if (month >= 0) return isoIfValid(y, month + 1, +m[1]!);
  }

  if (/^\d{5}(\.\d+)?$/.test(s)) return fromExcelSerial(Number(s));
  return null;
}

/** Plain text for a cell; dates become YYYY-MM-DD. */
function cellText(value: RawCell): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return parseUkDate(value) ?? "";
  return String(value).replace(/\s+/g, " ").trim();
}

/** Manufacture date is free text (often just a year); keep years as years. */
function manufactureText(value: RawCell): string {
  if (typeof value === "number" && value >= 1900 && value <= 2200 && Number.isInteger(value)) return String(value);
  if (value instanceof Date || typeof value === "number") return parseUkDate(value) ?? cellText(value);
  return cellText(value);
}

export function parseMachineryType(raw: string): MachineryTypeDb | null {
  return TYPE_LOOKUP.get(normKey(raw)) ?? null;
}

/** Checks one row's values. Same rules as the Add asset form. */
export function validateRow(input: ImportRowInput, isExample = false): ImportRow {
  const errors: string[] = [];
  const machineryType = input.machineryTypeRaw ? parseMachineryType(input.machineryTypeRaw) : null;

  if (!input.assetIdSerial) errors.push("Asset ID / serial is missing.");

  if (!input.machineryTypeRaw) errors.push("Equipment type is missing.");
  else if (normKey(input.machineryTypeRaw) === "loler")
    errors.push("Say which kind of LOLER: Personnel (lifts people), Accessory, or Standard.");
  else if (!machineryType) errors.push(`"${input.machineryTypeRaw}" isn't a known equipment type.`);

  if (!input.siteLocation) errors.push("Site location is missing.");

  const commissioningDate = input.commissioningDate ? parseUkDate(input.commissioningDate) : null;
  if (!input.commissioningDate) errors.push("Commissioning date is missing.");
  else if (!commissioningDate) errors.push(`Commissioning date "${input.commissioningDate}" isn't a date.`);

  const nextInspectionDue = input.nextInspectionDue ? parseUkDate(input.nextInspectionDue) : null;
  if (input.nextInspectionDue && !nextInspectionDue)
    errors.push(`Next inspection due "${input.nextInspectionDue}" isn't a date.`);

  if (machineryType && isLolerType(machineryType) && !input.swl)
    errors.push("SWL is required for lifting equipment.");

  if (input.assetIdSerial.length > 200) errors.push("Asset ID / serial is too long.");

  return {
    ...input,
    machineryType,
    commissioningDate: commissioningDate ?? input.commissioningDate,
    nextInspectionDue: nextInspectionDue ?? input.nextInspectionDue,
    errors,
    isExample,
  };
}

/** Finds the header row (the first row naming an asset ID column) within the first 10 rows. */
function findHeaderRow(grid: RawCell[][]): number {
  for (let i = 0; i < Math.min(grid.length, 10); i++) {
    const fields = (grid[i] ?? []).map((c) => HEADER_LOOKUP.get(normKey(cellText(c))));
    if (fields.includes("assetIdSerial") && fields.filter(Boolean).length >= 2) return i;
  }
  return -1;
}

/** Turns a sheet (rows of cells) into checked import rows. */
export function parseSheet(grid: RawCell[][]): ParsedSheet {
  const headerIndex = findHeaderRow(grid);
  if (headerIndex < 0) {
    return {
      rows: [],
      ignoredHeaders: [],
      missingColumns: IMPORT_COLUMNS.filter((c) => c.required === "yes").map((c) => c.header),
    };
  }

  const header = grid[headerIndex] ?? [];
  const columnFor = new Map<ImportField, number>();
  const ignoredHeaders: string[] = [];
  header.forEach((cell, i) => {
    const text = cellText(cell);
    if (!text) return;
    const field = HEADER_LOOKUP.get(normKey(text));
    if (field && !columnFor.has(field)) columnFor.set(field, i);
    else ignoredHeaders.push(text);
  });

  const missingColumns = IMPORT_COLUMNS.filter((c) => c.required === "yes" && !columnFor.has(c.field)).map(
    (c) => c.header,
  );

  const rows: ImportRow[] = [];
  for (let r = headerIndex + 1; r < grid.length; r++) {
    const line = grid[r] ?? [];
    if (line.every((c) => cellText(c) === "")) continue;
    const get = (f: ImportField): RawCell => {
      const i = columnFor.get(f);
      return i === undefined ? null : line[i];
    };
    const dateText = (f: ImportField): string => {
      const v = get(f);
      return v instanceof Date || typeof v === "number" ? (parseUkDate(v) ?? cellText(v)) : cellText(v);
    };
    const input: ImportRowInput = {
      rowNumber: r + 1,
      assetIdSerial: cellText(get("assetIdSerial")),
      machineryTypeRaw: cellText(get("machineryType")),
      siteLocation: cellText(get("siteLocation")),
      commissioningDate: dateText("commissioningDate"),
      swl: cellText(get("swl")),
      description: cellText(get("description")),
      manufactureDate: manufactureText(get("manufactureDate")),
      nextInspectionDue: dateText("nextInspectionDue"),
      notes: cellText(get("notes")),
    };
    const isExample = input.assetIdSerial.toUpperCase().startsWith(EXAMPLE_ID_PREFIX);
    rows.push(validateRow(input, isExample));
  }

  markDuplicateIds(rows);
  return { rows, ignoredHeaders, missingColumns };
}

export function serialKey(serial: string): string {
  return serial.trim().toLowerCase();
}

/** The same asset ID twice in one sheet: flag the later copies. */
function markDuplicateIds(rows: ImportRow[]) {
  const firstRow = new Map<string, number>();
  for (const row of rows) {
    if (!row.assetIdSerial || row.isExample) continue;
    const k = serialKey(row.assetIdSerial);
    const first = firstRow.get(k);
    if (first === undefined) firstRow.set(k, row.rowNumber);
    else row.errors.push(`Same asset ID as row ${first}.`);
  }
}

/** Minimal CSV reader: quoted fields, embedded commas and new lines, Excel's BOM, ; or tab separators. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.slice(0, src.search(/\r?\n|$/));
  const counts = [",", ";", "\t"].map((d) => [d, firstLine.split(d).length] as const);
  const delimiter = counts.sort((a, b) => b[1] - a[1])[0]![0];

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"' && field === "") inQuotes = true;
    else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function csvCell(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Template CSV: the headings plus two sample rows (skipped automatically if left in). */
export function templateCsv(): string {
  const lines = [IMPORT_COLUMNS.map((c) => c.header)];
  for (const ex of EXAMPLE_ROWS) lines.push(IMPORT_COLUMNS.map((c) => ex[c.field]));
  // BOM so Excel opens it as UTF-8.
  return "﻿" + lines.map((l) => l.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export const MAX_IMPORT_ROWS = 2000;
