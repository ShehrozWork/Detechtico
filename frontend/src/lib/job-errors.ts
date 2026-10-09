import type { AnalysisJob } from "@/lib/api-types";

const statementLabel: Record<string, string> = {
  "balance-sheet": "Balance Sheet",
  income: "Income Statement",
  "cash-flow": "Cash Flow statement",
};

const MISMATCH_PREFIX = "statement_type_mismatch:";

const withArticle = (label: string) => `${/^[AEIOU]/i.test(label) ? "an" : "a"} ${label}`;

export function isStatementTypeMismatch(job: Pick<AnalysisJob, "error_code">) {
  return Boolean(job.error_code?.startsWith(MISMATCH_PREFIX));
}

/** Human-readable reason an analysis failed. */
export function describeJobError(job: Pick<AnalysisJob, "error_code" | "statement_type">) {
  const code = job.error_code ?? "";
  if (code.startsWith(MISMATCH_PREFIX)) {
    const selected = statementLabel[job.statement_type ?? ""] ?? "selected statement";
    const detected = code.slice(MISMATCH_PREFIX.length);
    const detectedLabel = statementLabel[detected];
    return detectedLabel
      ? `This document looks like ${withArticle(detectedLabel)}, not ${withArticle(selected)}. Select "${detectedLabel.replace(" statement", "")}" as the statement type and upload it again, or upload an actual ${selected}.`
      : `This document doesn't appear to be ${withArticle(selected)}. Upload an actual ${selected}, or choose the statement type that matches the document.`;
  }
  if (code === "file_missing" || code === "document_missing") {
    return "The uploaded file is no longer available. Upload it again.";
  }
  if (code === "stale_job") {
    return "The analysis timed out. Delete it and try again.";
  }
  return `The document could not be analyzed${code ? ` (${code})` : ""}. Delete it and try again.`;
}
