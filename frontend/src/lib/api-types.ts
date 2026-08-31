export type User = {
  id: string;
  email: string;
  name: string;
  created_at: string;
  trial_ends_at: string;
  trial_active: boolean;
};

export type Finding = {
  id: string;
  source: "rule" | "gpt" | "llm";
  title: string;
  detail: string;
  severity: "high" | "medium" | "low";
  evidence?: string | null;
  location?: string | null;
  confidence?: number | null;
  rule_id?: string | null;
  disposition?: "confirmed" | "dismissed" | "needs_info" | null;
};

export type AnalysisJob = {
  id: string;
  document_id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  llm_status: "pending" | "succeeded" | "skipped" | "failed";
  statement_type?: "balance-sheet" | "income" | "cash-flow" | null;
  original_filename?: string | null;
  error_code?: string | null;
  findings: Finding[];
  created_at: string;
  finished_at?: string | null;
};

export type AnalysisJobSummary = {
  id: string;
  document_id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  llm_status: "pending" | "succeeded" | "skipped" | "failed";
  statement_type?: "balance-sheet" | "income" | "cash-flow" | null;
  original_filename?: string | null;
  error_code?: string | null;
  finding_count: number;
  created_at: string;
  finished_at?: string | null;
};

export type Transaction = {
  id: string;
  external_id?: string | null;
  merchant: string;
  amount: number;
  currency: string;
  date: string;
  status: "flagged" | "review" | "clear";
  riskScore: number;
  source_filename: string;
  created_at: string;
};

export type DetectionRule = {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
};

export type RiskSettings = {
  highRiskThreshold: number;
  mediumRiskThreshold: number;
  amountAlert: number;
  rules: DetectionRule[];
};

export type FindingDisposition = {
  id: string;
  finding_id: string;
  job_id: string;
  disposition: "confirmed" | "dismissed" | "needs_info";
  note?: string | null;
  created_at: string;
};

export type LearningSummary = {
  metrics: Array<{
    title: string;
    value: string;
    delta: string;
    deltaPositive: boolean;
    description: string;
  }>;
  events: Array<{
    title: string;
    source: string;
    adjustment: string;
  }>;
  insight: string;
  counts: {
    findings: number;
    reviewed: number;
    confirmed: number;
    dismissed: number;
    needs_info: number;
    high_open: number;
  };
};

export type NetworkSummary = {
  stats: Array<{ label: string; value: string }>;
  vendors: Array<{
    id: string;
    name: string;
    shortName: string;
    risk: number;
    transactions: number;
    x: number;
    y: number;
  }>;
  connections: Array<{
    fromName: string;
    fromId: string;
    toName: string;
    toId: string;
    reasons: string[];
    score: number;
  }>;
  clusters: Array<{
    id: string;
    title: string;
    vendorCount: number;
    avgRisk: number;
    vendors: Array<{ name: string; risk: number }>;
  }>;
  transaction_count: number;
};

export type ApiError = {
  code: string;
  message: string;
};

export function getErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return fallback;
}
