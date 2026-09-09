import type {
  AnalysisJob,
  AnalysisJobSummary,
  AdminAuditItem,
  AdminJobItem,
  AdminOverview,
  AdminSecurityStatus,
  AdminSubscriptionItem,
  AdminUserDetail,
  AdminUserListItem,
  ApiError,
  FindingDisposition,
  LearningSummary,
  NetworkSummary,
  RiskSettings,
  TotpSetup,
  Transaction,
  User,
  WebhookHealth,
  AiUsageSummary,
} from "@/lib/api-types";

/**
 * - Local: NEXT_PUBLIC_API_URL=http://localhost:8000 (default in development)
 * - Vercel: leave NEXT_PUBLIC_API_URL empty/unset and set API_PROXY_TARGET so
 *   fetches stay same-origin and Next rewrites proxy to the Paisol API.
 */
function resolveApiUrl() {
  const configured = (process.env.NEXT_PUBLIC_API_URL ?? "").trim().replace(/\/$/, "");
  const isProd = process.env.NODE_ENV === "production";

  // Never call the developer's machine from a deployed build.
  if (isProd) {
    if (!configured || /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configured)) {
      return "";
    }
    return configured;
  }

  return configured || "http://localhost:8000";
}

const API_URL = resolveApiUrl();

class RequestError extends Error {
  code: string;

  constructor(error: ApiError) {
    super(error.message);
    this.name = "RequestError";
    this.code = error.code;
  }
}

function readApiError(data: unknown, fallback: string): ApiError {
  if (
    data &&
    typeof data === "object" &&
    "detail" in data &&
    data.detail &&
    typeof data.detail === "object" &&
    "message" in data.detail
  ) {
    const detail = data.detail as { code?: string; message?: string };
    return {
      code: detail.code ?? "http_error",
      message: detail.message ?? fallback,
    };
  }
  return { code: "http_error", message: fallback };
}

let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then((response) => response.ok)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

function networkErrorMessage() {
  const target = API_URL || "this site (API proxy)";
  return `Could not reach the API at ${target}. Check that the backend is running and NEXT_PUBLIC_API_URL / API_PROXY_TARGET are set correctly.`;
}

async function apiFetch(path: string, init: RequestInit = {}, retry = true) {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers,
    });
  } catch {
    throw new RequestError({ code: "network_error", message: networkErrorMessage() });
  }

  const skipRefresh =
    path === "/auth/login" ||
    path === "/auth/signup" ||
    path === "/auth/signup/confirm" ||
    path === "/auth/refresh" ||
    path === "/auth/forgot-password" ||
    path === "/auth/reset-password";

  if (response.status === 401 && retry && !skipRefresh) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return apiFetch(path, init, false);
    }
  }

  return response;
}

async function parseBody<T>(response: Response, fallback: string): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }
  if (response.status === 502 || response.status === 504) {
    throw new RequestError({
      code: "proxy_error",
      message:
        "Upload failed through the hosting proxy (file too large or timed out). Use Dashboard → Import for ledger CSVs (max 5,000 rows), or upload a smaller statement file under ~4 MB.",
    });
  }
  if (response.status === 413) {
    throw new RequestError({
      code: "payload_too_large",
      message: "That file is too large to upload. Try a smaller file (under ~4 MB on Vercel).",
    });
  }
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new RequestError(readApiError(data, fallback));
  }
  return data as T;
}

export async function getMe() {
  const response = await apiFetch("/auth/me");
  if (response.status === 401) return null;
  return parseBody<User>(response, "Unable to load your session.");
}

export async function login(email: string, password: string, remember: boolean) {
  const response = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, remember }),
  });
  return parseBody<User>(response, "Invalid email or password.");
}

export async function requestSignup(input: {
  name: string;
  email: string;
  password: string;
  accepted_terms: boolean;
}) {
  const response = await apiFetch("/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return parseBody<{
    message: string;
    email: string;
    expires_in_seconds: number;
    resend_after_seconds: number;
  }>(response, "Unable to start signup.");
}

export async function confirmSignup(email: string, otp: string) {
  const response = await apiFetch("/auth/signup/confirm", {
    method: "POST",
    body: JSON.stringify({ email, otp }),
  });
  return parseBody<User>(response, "Unable to verify your email.");
}

export async function logout() {
  await apiFetch("/auth/logout", { method: "POST" }, false);
}

export async function forgotPassword(email: string) {
  const response = await apiFetch("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  await parseBody<void>(response, "Unable to start password reset.");
}

export async function resetPassword(token: string, password: string) {
  const response = await apiFetch("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
  await parseBody<void>(response, "Unable to reset your password.");
}

export async function analyzeDocument(file: File, statementType: string) {
  const body = new FormData();
  body.append("file", file);
  body.append("statement_type", statementType);
  const response = await apiFetch("/documents/analyze", {
    method: "POST",
    body,
  });
  return parseBody<AnalysisJob>(response, "Unable to start analysis.");
}

export async function listJobs() {
  const response = await apiFetch("/jobs");
  return parseBody<AnalysisJobSummary[]>(response, "Unable to load saved analyses.");
}

export async function getJob(jobId: string) {
  const response = await apiFetch(`/jobs/${jobId}`);
  return parseBody<AnalysisJob>(response, "Unable to load analysis results.");
}

export async function deleteDocument(documentId: string) {
  const response = await apiFetch(`/documents/${documentId}`, { method: "DELETE" });
  await parseBody<void>(response, "Unable to delete the document.");
}

export async function importTransactions(
  sourceFilename: string,
  transactions: Array<{
    id?: string;
    merchant: string;
    amount: number;
    currency: string;
    date: string;
    status: "flagged" | "review" | "clear";
    riskScore: number;
  }>,
) {
  const response = await apiFetch("/transactions/import", {
    method: "POST",
    body: JSON.stringify({ source_filename: sourceFilename, transactions }),
  });
  return parseBody<Transaction[]>(response, "Unable to save imported transactions.");
}

export async function getTransactions() {
  const response = await apiFetch("/transactions");
  return parseBody<Transaction[]>(response, "Unable to load transactions.");
}

export async function clearTransactions() {
  const response = await apiFetch("/transactions", { method: "DELETE" });
  await parseBody<void>(response, "Unable to clear imported transactions.");
}

export async function getRiskSettings() {
  const response = await apiFetch("/risk-settings");
  return parseBody<RiskSettings>(response, "Unable to load risk settings.");
}

export async function updateRiskSettings(settings: RiskSettings) {
  const response = await apiFetch("/risk-settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
  return parseBody<RiskSettings>(response, "Unable to save risk settings.");
}

export async function getNetworkSummary() {
  const response = await apiFetch("/network/summary");
  return parseBody<NetworkSummary>(response, "Unable to load network analysis.");
}

export async function getLearningSummary() {
  const response = await apiFetch("/learning/summary");
  return parseBody<LearningSummary>(response, "Unable to load learning summary.");
}

export async function setFindingDisposition(
  findingId: string,
  disposition: "confirmed" | "dismissed" | "needs_info",
  note?: string,
) {
  const response = await apiFetch(`/findings/${findingId}/disposition`, {
    method: "POST",
    body: JSON.stringify({ disposition, note }),
  });
  return parseBody<FindingDisposition>(response, "Unable to save finding review.");
}

export async function updateTransactionStatus(
  transactionId: string,
  status: "flagged" | "review" | "clear",
) {
  const response = await apiFetch(`/transactions/${transactionId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return parseBody<Transaction>(response, "Unable to update transaction status.");
}

export async function updateProfile(name: string) {
  const response = await apiFetch("/auth/me", {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
  return parseBody<User>(response, "Unable to update your profile.");
}

export async function verifyPassword(currentPassword: string) {
  const response = await apiFetch("/auth/verify-password", {
    method: "POST",
    body: JSON.stringify({ current_password: currentPassword }),
  });
  await parseBody<void>(response, "Unable to verify password.");
}

export async function requestEmailChange(newEmail: string, currentPassword: string) {
  const response = await apiFetch("/auth/email-change/request", {
    method: "POST",
    body: JSON.stringify({
      new_email: newEmail,
      current_password: currentPassword,
    }),
  });
  return parseBody<{
    message: string;
    new_email: string;
    expires_in_seconds: number;
    resend_after_seconds: number;
  }>(response, "Unable to start email change.");
}

export async function confirmEmailChange(otp: string) {
  const response = await apiFetch("/auth/email-change/confirm", {
    method: "POST",
    body: JSON.stringify({ otp }),
  });
  return parseBody<User>(response, "Unable to confirm email change.");
}

export async function revertEmailChange(token: string) {
  const response = await apiFetch("/auth/email-change/revert", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  return parseBody<User>(response, "Unable to revert email change.");
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const response = await apiFetch("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
  return parseBody<User>(response, "Unable to change your password.");
}

export async function createCheckoutSession(
  planId: "essential" | "professional",
  billingPeriod: "monthly" | "annual",
) {
  const response = await apiFetch("/billing/checkout-session", {
    method: "POST",
    body: JSON.stringify({ plan_id: planId, billing_period: billingPeriod }),
  });
  return parseBody<{ url: string }>(response, "Unable to start checkout.");
}

export async function createPortalSession() {
  const response = await apiFetch("/billing/portal-session", {
    method: "POST",
  });
  return parseBody<{ url: string }>(response, "Unable to open billing portal.");
}

export async function confirmCheckoutSession(sessionId: string) {
  const response = await apiFetch("/billing/confirm-session", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId }),
  });
  return parseBody<User>(response, "Unable to confirm checkout.");
}

export async function cancelSubscription() {
  const response = await apiFetch("/billing/cancel-subscription", {
    method: "POST",
  });
  return parseBody<User>(response, "Unable to cancel subscription.");
}

export async function resumeSubscription() {
  const response = await apiFetch("/billing/resume-subscription", {
    method: "POST",
  });
  return parseBody<User>(response, "Unable to resume subscription.");
}

// --- Admin platform ops ---

export async function getAdminSecurity() {
  const response = await apiFetch("/admin/security");
  return parseBody<AdminSecurityStatus>(response, "Unable to load admin security status.");
}

export async function setupAdminTotp() {
  const response = await apiFetch("/admin/security/totp/setup", { method: "POST" });
  return parseBody<TotpSetup>(response, "Unable to start TOTP setup.");
}

export async function confirmAdminTotp(code: string) {
  const response = await apiFetch("/admin/security/totp/confirm", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  return parseBody<AdminSecurityStatus>(response, "Unable to confirm TOTP.");
}

export async function adminStepUp(code: string) {
  const response = await apiFetch("/admin/security/step-up", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  return parseBody<AdminSecurityStatus>(response, "Unable to verify authenticator code.");
}

export async function getAdminOverview() {
  const response = await apiFetch("/admin/overview");
  return parseBody<AdminOverview>(response, "Unable to load admin overview.");
}

export async function getWebhookHealth() {
  const response = await apiFetch("/admin/webhooks/health");
  return parseBody<WebhookHealth>(response, "Unable to load webhook health.");
}

export async function listAdminUsers(params?: { q?: string; is_active?: boolean }) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.is_active !== undefined) search.set("is_active", String(params.is_active));
  const qs = search.toString();
  const response = await apiFetch(`/admin/users${qs ? `?${qs}` : ""}`);
  return parseBody<{ items: AdminUserListItem[]; total: number }>(
    response,
    "Unable to load users.",
  );
}

export async function getAdminUser(userId: string) {
  const response = await apiFetch(`/admin/users/${userId}`);
  return parseBody<AdminUserDetail>(response, "Unable to load user.");
}

export async function deactivateAdminUser(
  userId: string,
  body: { billing_action: "leave" | "cancel_at_period_end" | "cancel_immediately"; reason: string },
) {
  const response = await apiFetch(`/admin/users/${userId}/deactivate`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return parseBody<AdminUserDetail>(response, "Unable to deactivate user.");
}

export async function activateAdminUser(userId: string) {
  const response = await apiFetch(`/admin/users/${userId}/activate`, { method: "POST" });
  return parseBody<AdminUserDetail>(response, "Unable to activate user.");
}

export async function forceLogoutAdminUser(userId: string) {
  const response = await apiFetch(`/admin/users/${userId}/force-logout`, { method: "POST" });
  return parseBody<void>(response, "Unable to force logout.");
}

export async function triggerAdminPasswordReset(userId: string) {
  const response = await apiFetch(`/admin/users/${userId}/password-reset`, { method: "POST" });
  return parseBody<void>(response, "Unable to trigger password reset.");
}

export async function setAdminTrial(
  userId: string,
  body: { trial_ends_at: string; reason: string },
) {
  const response = await apiFetch(`/admin/users/${userId}/trial`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return parseBody<AdminUserDetail>(response, "Unable to update trial.");
}

export async function grantAdminComp(
  userId: string,
  body: { reason: string; expires_at: string },
) {
  const response = await apiFetch(`/admin/users/${userId}/comp`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return parseBody<AdminUserDetail>(response, "Unable to grant complimentary access.");
}

export async function revokeAdminComp(userId: string, reason: string) {
  const response = await apiFetch(`/admin/users/${userId}/comp/revoke`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  return parseBody<AdminUserDetail>(response, "Unable to revoke complimentary access.");
}

export async function setAdminStaffRole(
  userId: string,
  staff_role: "support" | "billing_ops" | "superadmin" | null,
) {
  const response = await apiFetch(`/admin/users/${userId}/staff-role`, {
    method: "POST",
    body: JSON.stringify({ staff_role }),
  });
  return parseBody<AdminUserDetail>(response, "Unable to update staff role.");
}

export async function syncAdminSubscription(userId: string) {
  const response = await apiFetch(`/admin/users/${userId}/sync-subscription`, {
    method: "POST",
  });
  return parseBody<AdminUserDetail>(response, "Unable to sync subscription.");
}

export async function listAdminSubscriptions(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await apiFetch(`/admin/subscriptions${qs}`);
  return parseBody<{ items: AdminSubscriptionItem[]; total: number }>(
    response,
    "Unable to load subscriptions.",
  );
}

export async function listAdminJobs(params?: { status?: string; stuck?: boolean }) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.stuck) search.set("stuck", "true");
  const qs = search.toString();
  const response = await apiFetch(`/admin/jobs${qs ? `?${qs}` : ""}`);
  return parseBody<{ items: AdminJobItem[]; total: number }>(response, "Unable to load jobs.");
}

export async function requeueAdminJob(jobId: string) {
  const response = await apiFetch(`/admin/jobs/${jobId}/requeue`, { method: "POST" });
  return parseBody<AdminJobItem>(response, "Unable to requeue job.");
}

export async function abandonAdminJob(jobId: string) {
  const response = await apiFetch(`/admin/jobs/${jobId}/abandon`, { method: "POST" });
  return parseBody<AdminJobItem>(response, "Unable to abandon job.");
}

export async function revealAdminDocument(documentId: string) {
  const response = await apiFetch(`/admin/documents/${documentId}/reveal`, { method: "POST" });
  return parseBody<{
    document_id: string;
    original_filename: string;
    mime: string;
    size_bytes: number;
    checksum_sha256: string;
    expires_at: string;
  }>(response, "Unable to reveal document.");
}

export async function listAdminAudit(params?: { action?: string; target_id?: string }) {
  const search = new URLSearchParams();
  if (params?.action) search.set("action", params.action);
  if (params?.target_id) search.set("target_id", params.target_id);
  const qs = search.toString();
  const response = await apiFetch(`/admin/audit${qs ? `?${qs}` : ""}`);
  return parseBody<{ items: AdminAuditItem[]; total: number }>(
    response,
    "Unable to load audit log.",
  );
}

export async function getAdminAiUsage(days = 30) {
  const response = await apiFetch(`/admin/ai-usage?days=${days}`);
  return parseBody<AiUsageSummary>(response, "Unable to load AI usage.");
}

export { RequestError };
