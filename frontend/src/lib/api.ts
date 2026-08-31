import type {
  AnalysisJob,
  AnalysisJobSummary,
  ApiError,
  FindingDisposition,
  LearningSummary,
  NetworkSummary,
  RiskSettings,
  Transaction,
  User,
} from "@/lib/api-types";

/**
 * - Local: NEXT_PUBLIC_API_URL=http://localhost:8000 (default in development)
 * - Vercel: leave NEXT_PUBLIC_API_URL empty/unset and set API_PROXY_TARGET so
 *   fetches stay same-origin and Next rewrites proxy to the Paisol API.
 */
function resolveApiUrl() {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured !== undefined) return configured.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") return "";
  return "http://localhost:8000";
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

export async function signup(input: {
  name: string;
  email: string;
  password: string;
  accepted_terms: boolean;
}) {
  const response = await apiFetch("/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return parseBody<User>(response, "Unable to create your account.");
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

export { RequestError };
