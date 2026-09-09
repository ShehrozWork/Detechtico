export type User = {
  id: string;
  email: string;
  name: string;
  created_at: string;
  trial_ends_at: string;
  trial_active: boolean;
  plan_id?: string | null;
  subscription_status?: string;
  billing_period?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  entitled?: boolean;
  staff_role?: string | null;
  totp_enrolled?: boolean;
  is_staff?: boolean;
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
  status: "queued" | "running" | "succeeded" | "failed" | "abandoned";
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
  status: "queued" | "running" | "succeeded" | "failed" | "abandoned";
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

export type AdminOverview = {
  total_users: number;
  active_users: number;
  entitled_users: number;
  signups_7d: number;
  signups_30d: number;
  subscription_mix: Record<string, number>;
  stuck_jobs: number;
  failed_jobs_24h: number;
  webhook_failures_24h: number;
  last_webhook_at?: string | null;
  past_due_count: number;
};

export type AdminUserListItem = {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  staff_role?: string | null;
  created_at: string;
  trial_ends_at: string;
  trial_active: boolean;
  entitled: boolean;
  subscription_status: string;
  plan_id?: string | null;
  comp_active: boolean;
};

export type AdminUserDetail = AdminUserListItem & {
  current_period_end?: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  active_comp?: {
    id: string;
    reason: string;
    expires_at: string;
    created_at: string;
  } | null;
  recent_jobs: Array<{
    id: string;
    status: string;
    error_code?: string | null;
    created_at: string;
    retry_count: number;
  }>;
};

export type AdminSubscriptionItem = {
  user_id: string;
  email: string;
  plan_id?: string | null;
  status: string;
  billing_period?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
};

export type AdminJobItem = {
  id: string;
  user_id: string;
  user_email?: string | null;
  document_id: string;
  original_filename?: string | null;
  status: string;
  error_code?: string | null;
  llm_status: string;
  retry_count: number;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
};

export type AdminAuditItem = {
  id: string;
  actor_user_id: string;
  actor_role: string;
  action: string;
  target_type: string;
  target_id?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AdminSecurityStatus = {
  enrolled: boolean;
  staff_role: string;
  step_up_active: boolean;
};

export type TotpSetup = {
  secret: string;
  otpauth_url: string;
  enrolled: boolean;
};

export type WebhookHealth = {
  last_processed_at?: string | null;
  processed_24h: number;
  note: string;
};

export type AiUsageEvent = {
  id: string;
  user_id: string;
  user_email?: string | null;
  job_id?: string | null;
  model: string;
  status: string;
  anthropic_request_id?: string | null;
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  input_cost_usd: number;
  output_cost_usd: number;
  cache_write_cost_usd: number;
  cache_read_cost_usd: number;
  total_cost_usd: number;
  pricing_known: boolean;
  pricing_version?: string | null;
  pricing_source?: string | null;
  rates_json?: Record<string, string> | null;
  error_code?: string | null;
  created_at: string;
};

export type AiUsageSummary = {
  window_days: number;
  total_calls: number;
  succeeded_calls: number;
  failed_calls: number;
  skipped_calls: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_creation_tokens: number;
  total_cache_read_tokens: number;
  total_cost_usd: number;
  avg_cost_per_succeeded_call_usd: number;
  pricing_source: string;
  pricing_version: string;
  configured_model: string;
  by_model: Array<{
    model: string;
    calls: number;
    input_tokens: number;
    output_tokens: number;
    total_cost_usd: number;
  }>;
  daily: Array<{
    day: string;
    calls: number;
    total_cost_usd: number;
    input_tokens: number;
    output_tokens: number;
  }>;
  recent: AiUsageEvent[];
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
