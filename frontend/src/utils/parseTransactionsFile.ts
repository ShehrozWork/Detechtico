import * as XLSX from "xlsx";
import type { ReviewStatus } from "@/data/dashboard";

export type ParsedTransaction = {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  date: string;
  status: ReviewStatus;
  riskScore: number;
};

type Field = "id" | "merchant" | "amount" | "currency" | "date" | "status" | "risk";

const ALIASES: Record<Field, string[]> = {
  id: [
    "id",
    "transactionid",
    "txnid",
    "txid",
    "reference",
    "referenceid",
    "refno",
    "ref",
    "checknumber",
    "confirmationnumber",
    "confirmation",
  ],
  merchant: [
    "merchant",
    "vendor",
    "payee",
    "description",
    "descriptions",
    "name",
    "narrative",
    "particulars",
    "details",
    "detail",
    "transactiondescription",
    "merchantname",
    "counterparty",
    "payeename",
    "beneficiary",
    "memo",
    "recipient",
  ],
  amount: [
    "amount",
    "value",
    "total",
    "amountusd",
    "transactionamount",
    "txnamount",
    "debit",
    "credit",
    "debitamount",
    "creditamount",
    "amountdebit",
    "amountcredit",
    "sum",
    "netamount",
    "grossamount",
  ],
  currency: ["currency", "ccy", "curr"],
  date: [
    "date",
    "transactiondate",
    "posteddate",
    "postingdate",
    "valuedate",
    "trandate",
    "transdate",
    "txndate",
    "dateposted",
    "processeddate",
    "effectivedate",
  ],
  status: ["status", "reviewstatus", "flag", "state", "decision"],
  risk: [
    "risk",
    "riskscore",
    "risk%",
    "riskpercentage",
    "riskrating",
    "score",
    "fraudscore",
  ],
};

function normalizeKey(key: unknown): string {
  return String(key ?? "")
    .replace(/^﻿/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, "");
}

function pick(row: Record<string, unknown>, field: Field): unknown {
  const normalized = new Map<string, unknown>();
  for (const [key, value] of Object.entries(row)) {
    normalized.set(normalizeKey(key), value);
  }
  for (const alias of ALIASES[field]) {
    const value = normalized.get(alias);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

/** Score how well a row of header-candidate cells matches known transaction columns. */
function scoreHeaderRow(cells: unknown[]): number {
  const normalizedCells = cells.map(normalizeKey);
  let matchedFields = 0;
  for (const field of Object.keys(ALIASES) as Field[]) {
    if (ALIASES[field].some((alias) => normalizedCells.includes(alias))) {
      matchedFields += 1;
    }
  }
  return matchedFields;
}

/** Find the most likely header row among the first few rows of a raw grid. */
function findHeaderRowIndex(grid: unknown[][]): number {
  let bestIndex = 0;
  let bestScore = 0;
  const candidateRows = Math.min(grid.length, 10);
  for (let i = 0; i < candidateRows; i += 1) {
    const score = scoreHeaderRow(grid[i]);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  return bestIndex;
}

function isBlankRow(cells: unknown[]): boolean {
  return cells.every((cell) => cell === undefined || cell === null || String(cell).trim() === "");
}

function gridToRows(grid: unknown[][]): Record<string, unknown>[] {
  const dataRows = grid.filter((row) => !isBlankRow(row));
  if (dataRows.length < 2) return [];

  const headerIndex = findHeaderRowIndex(dataRows);
  const headers = dataRows[headerIndex].map(normalizeKey);

  return dataRows.slice(headerIndex + 1).map((cells) =>
    Object.fromEntries(headers.map((header, i) => [header || `col${i}`, cells[i]])),
  );
}

function toAmount(value: unknown): number {
  if (typeof value === "number") return Math.abs(value);
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
  }
  return 0;
}

function toDate(value: unknown): string {
  if (value instanceof Date) {
    return value.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const jsDate = new Date(parsed.y, parsed.m - 1, parsed.d);
      return jsDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }
  if (typeof value === "string" && value.trim()) {
    const jsDate = new Date(value);
    if (!Number.isNaN(jsDate.getTime())) {
      return jsDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    return value;
  }
  return "Unknown date";
}

function toRiskScore(
  value: unknown,
  amount: number,
  amountAlert = 1000,
): number {
  if (typeof value === "number") return Math.max(0, Math.min(100, Math.round(value)));
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseFloat(value.replace("%", ""));
    if (Number.isFinite(parsed)) return Math.max(0, Math.min(100, Math.round(parsed)));
  }
  if (amount >= Math.max(amountAlert * 8, 8000)) return 82;
  if (amount >= amountAlert) return 58;
  return 15;
}

function toStatus(
  value: unknown,
  riskScore: number,
  highRiskThreshold = 75,
  mediumRiskThreshold = 50,
): ReviewStatus {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["flagged", "high", "fraud", "suspicious"].includes(normalized)) return "flagged";
    if (["review", "medium", "pending"].includes(normalized)) return "review";
    if (["clear", "low", "ok", "approved", "clean"].includes(normalized)) return "clear";
  }
  if (riskScore >= highRiskThreshold) return "flagged";
  if (riskScore >= mediumRiskThreshold) return "review";
  return "clear";
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function normalizeRow(
  row: Record<string, unknown>,
  options?: {
    amountAlert?: number;
    highRiskThreshold?: number;
    mediumRiskThreshold?: number;
  },
): ParsedTransaction | null {
  const merchantValue = pick(row, "merchant");
  const amountValue = pick(row, "amount");
  const dateValue = pick(row, "date");

  if (merchantValue === undefined && amountValue === undefined && dateValue === undefined) {
    return null;
  }

  const amount = toAmount(amountValue);
  const riskScore = toRiskScore(pick(row, "risk"), amount, options?.amountAlert);
  const idValue = pick(row, "id");

  return {
    id: idValue ? String(idValue) : `IMP-${randomSuffix()}`,
    merchant: String(merchantValue ?? "Unknown merchant"),
    amount,
    currency: String(pick(row, "currency") ?? "USD"),
    date: toDate(dateValue),
    status: toStatus(
      pick(row, "status"),
      riskScore,
      options?.highRiskThreshold,
      options?.mediumRiskThreshold,
    ),
    riskScore,
  };
}

function normalizeRows(
  rows: Record<string, unknown>[],
  options?: {
    amountAlert?: number;
    highRiskThreshold?: number;
    mediumRiskThreshold?: number;
  },
): ParsedTransaction[] {
  const result: ParsedTransaction[] = [];
  for (const row of rows) {
    const parsed = normalizeRow(row, options);
    if (parsed) result.push(parsed);
  }
  return result;
}

/** Quote-aware CSV line splitter: handles `"a, b",c` correctly. */
function parseCsvGrid(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (char === "\r") {
      // skip; \n handles the line break
    } else if (char === "\n") {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell.trim());
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

const SUPPORTED_COLUMNS =
  "Merchant/Vendor/Payee/Description, Amount/Debit/Credit, Date, and optionally Risk and Status";

export async function parseTransactionsFile(
  file: File,
  options?: {
    amountAlert?: number;
    highRiskThreshold?: number;
    mediumRiskThreshold?: number;
  },
): Promise<ParsedTransaction[]> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "csv") {
    const text = await file.text();
    const grid = parseCsvGrid(text);
    const rows = normalizeRows(gridToRows(grid), options);
    if (rows.length === 0) {
      throw new Error(
        `Could not find recognizable transaction columns. Expected headers like: ${SUPPORTED_COLUMNS}.`,
      );
    }
    return rows;
  }

  if (extension === "json") {
    const text = await file.text();
    const data = JSON.parse(text);
    const rawRows: unknown[] = Array.isArray(data)
      ? data
      : Array.isArray((data as Record<string, unknown>)?.transactions)
        ? ((data as Record<string, unknown>).transactions as unknown[])
        : [];
    const rows = normalizeRows(
      rawRows.filter(
        (row): row is Record<string, unknown> => typeof row === "object" && row !== null,
      ),
      options,
    );
    if (rows.length === 0) {
      throw new Error(
        `Could not find recognizable transaction fields. Expected keys like: ${SUPPORTED_COLUMNS}.`,
      );
    }
    return rows;
  }

  if (extension === "xlsx" || extension === "xls") {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return [];
    const sheet = workbook.Sheets[firstSheetName];
    const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      raw: true,
    });
    const rows = normalizeRows(gridToRows(grid), options);
    if (rows.length === 0) {
      throw new Error(
        `Could not find recognizable transaction columns. Expected headers like: ${SUPPORTED_COLUMNS}.`,
      );
    }
    return rows;
  }

  throw new Error(`Unsupported file type: .${extension ?? "unknown"}`);
}
