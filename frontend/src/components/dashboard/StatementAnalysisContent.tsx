"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel } from "@/components/dashboard/Panel";
import { ActionButton } from "@/components/dashboard/ActionButton";
import { SegmentedTabs } from "@/components/dashboard/SegmentedTabs";
import { statementTypes, type StatementType } from "@/data/dashboard";
import { analyzeDocument, deleteDocument, getJob, listJobs } from "@/lib/api";
import {
  getErrorMessage,
  type AnalysisJob,
  type AnalysisJobSummary,
  type Finding,
} from "@/lib/api-types";
import { cn } from "@/utils/cn";

const ACCEPT = ".csv,.json,.xlsx,.xls,.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp,.tif,.tiff";

const statementLabel: Record<StatementType, string> = {
  "balance-sheet": "Balance Sheet",
  income: "Income Statement",
  "cash-flow": "Cash Flow",
};

function severityClass(severity: Finding["severity"]) {
  if (severity === "high") return "bg-amber-100 text-amber-900";
  if (severity === "medium") return "bg-primary-pale text-primary-deep";
  return "bg-sunken text-body";
}

function statusLabel(status: AnalysisJobSummary["status"]) {
  if (status === "succeeded") return "Completed";
  if (status === "failed") return "Failed";
  if (status === "running") return "Running";
  return "Queued";
}

function statusClass(status: AnalysisJobSummary["status"]) {
  if (status === "succeeded") return "bg-emerald-100 text-emerald-900";
  if (status === "failed") return "bg-[#ffe4e6] text-[#9f1239]";
  if (status === "running") return "bg-primary-pale text-primary-deep";
  return "bg-sunken text-body";
}

function formatJobDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function StatementAnalysisContent() {
  const [type, setType] = useState<StatementType>("balance-sheet");
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState<AnalysisJob | null>(null);
  const [history, setHistory] = useState<AnalysisJobSummary[]>([]);
  const [historyReady, setHistoryReady] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loadingJobId, setLoadingJobId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const refreshHistory = useCallback(async () => {
    try {
      const rows = await listJobs();
      setHistory(rows);
      setHistoryError(null);
    } catch (caught) {
      setHistoryError(getErrorMessage(caught, "Unable to load saved analyses."));
    } finally {
      setHistoryReady(true);
    }
  }, []);

  useEffect(() => {
    void refreshHistory();
    return () => {
      if (pollRef.current) window.clearTimeout(pollRef.current);
    };
  }, [refreshHistory]);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0] ?? null;
    setFile(next);
    setJob(null);
    setError(null);
  };

  const pollJob = async (jobId: string, attempt = 0) => {
    const current = await getJob(jobId);
    setJob(current);
    if (current.status === "queued" || current.status === "running") {
      if (attempt > 90) {
        setError("Analysis is taking longer than expected. Refresh this page in a moment.");
        setPending(false);
        void refreshHistory();
        return;
      }
      pollRef.current = window.setTimeout(() => {
        void pollJob(jobId, attempt + 1);
      }, 2000);
      return;
    }
    setPending(false);
    void refreshHistory();
    if (current.status === "failed") {
      setError("Analysis failed. Please try another file or try again.");
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError("Choose a file to analyze.");
      return;
    }
    setError(null);
    setPending(true);
    setJob(null);
    try {
      const created = await analyzeDocument(file, type);
      setJob(created);
      void refreshHistory();
      await pollJob(created.id);
    } catch (caught) {
      setPending(false);
      setError(getErrorMessage(caught, "Unable to start analysis."));
    }
  };

  const openJob = async (jobId: string) => {
    setError(null);
    setLoadingJobId(jobId);
    try {
      if (pollRef.current) window.clearTimeout(pollRef.current);
      const current = await getJob(jobId);
      setJob(current);
      setFile(null);
      if (current.statement_type) setType(current.statement_type);
      if (current.status === "queued" || current.status === "running") {
        setPending(true);
        await pollJob(current.id);
      }
    } catch (caught) {
      setError(getErrorMessage(caught, "Unable to open that analysis."));
    } finally {
      setLoadingJobId(null);
    }
  };

  const removeDocument = async (documentId: string, jobId: string) => {
    setDeletingId(jobId);
    setError(null);
    try {
      await deleteDocument(documentId);
      setHistory((rows) => rows.filter((row) => row.id !== jobId));
      if (job?.id === jobId) {
        setJob(null);
        setFile(null);
      }
    } catch (caught) {
      setError(getErrorMessage(caught, "Unable to delete the document."));
    } finally {
      setDeletingId(null);
    }
  };

  const findings = job?.findings ?? [];
  const inFlight = pending || job?.status === "queued" || job?.status === "running";

  return (
    <Container>
      <PageHeader
        title="Financial Statement Analysis"
        description="Upload balance sheets, income statements, or cash flow statements for forensic analysis. Results are saved to your account."
      />

      <Panel className="mt-8 p-5 sm:p-8">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-sunken text-primary">
            <Icon name="file-up" className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-ink">Upload Statement</h2>
            <p className="mt-1 text-[14px] font-light text-subtle">
              Select the statement type and upload your file. The server detects
              the format automatically and stores the analysis for later.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mt-6">
            <p className="text-[13px] font-semibold tracking-[0.08em] text-subtle uppercase">
              Statement Type
            </p>
            <div className="mt-3">
              <SegmentedTabs
                tabs={statementTypes}
                value={type}
                onChange={(id) => {
                  setType(id);
                  setJob(null);
                }}
                ariaLabel="Statement type"
              />
            </div>
          </div>

          <label className="relative mt-6 flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[14px] border border-dashed border-line bg-canvas px-6 py-10 text-center transition-colors hover:border-primary">
            <Icon name="upload" className="h-8 w-8 text-primary" />
            <p className="mt-3 text-[15px] font-semibold text-ink">
              {file?.name ?? "No file chosen"}
            </p>
            <p className="mt-2 max-w-[46ch] text-[13.5px] font-light leading-[1.7] text-subtle">
              PDF, images, CSV, Excel, Word, or text. Maximum 25 MB. Executables
              and archives are rejected.
            </p>
            <input
              type="file"
              className="absolute inset-0 cursor-pointer opacity-0"
              accept={ACCEPT}
              onChange={handleFile}
            />
          </label>

          {error ? (
            <p className="mt-4 text-sm text-[#9f1239]" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-6">
            <ActionButton type="submit" disabled={inFlight}>
              {inFlight ? "Analyzing…" : "Run Forensic Analysis"}
            </ActionButton>
          </div>
        </form>
      </Panel>

      <Panel className="mt-5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-sunken text-primary">
            <Icon name="clock" className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[18px] font-bold text-ink">Saved analyses</h2>
            <p className="mt-1 text-[14px] font-light text-subtle">
              Open a previous run to review findings, or delete the upload and its results.
            </p>
          </div>
        </div>

        {historyError ? (
          <p className="mt-4 text-sm text-[#9f1239]" role="alert">
            {historyError}
          </p>
        ) : null}

        {!historyReady ? (
          <p className="mt-5 text-[14px] font-light text-subtle">Loading saved analyses…</p>
        ) : history.length === 0 ? (
          <p className="mt-5 text-[14px] font-light text-subtle">
            No saved analyses yet. Run an upload above and it will appear here.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-hairline rounded-[12px] border border-hairline">
            {history.map((item) => {
              const selected = job?.id === item.id;
              const statement =
                item.statement_type && item.statement_type in statementLabel
                  ? statementLabel[item.statement_type]
                  : "Statement";
              return (
                <li
                  key={item.id}
                  className={cn(
                    "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
                    selected && "bg-canvas",
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[15px] font-semibold text-ink">
                        {item.original_filename ?? "Untitled document"}
                      </p>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          statusClass(item.status),
                        )}
                      >
                        {statusLabel(item.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] font-light text-subtle">
                      {statement}
                      {" · "}
                      {formatJobDate(item.created_at)}
                      {item.status === "succeeded"
                        ? ` · ${item.finding_count} finding${item.finding_count === 1 ? "" : "s"}`
                        : null}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <ActionButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={loadingJobId === item.id || inFlight}
                      onClick={() => void openJob(item.id)}
                    >
                      {loadingJobId === item.id ? "Opening…" : selected ? "Viewing" : "View"}
                    </ActionButton>
                    <ActionButton
                      type="button"
                      variant="danger"
                      size="sm"
                      disabled={deletingId === item.id || inFlight}
                      onClick={() => void removeDocument(item.document_id, item.id)}
                    >
                      {deletingId === item.id ? "Deleting…" : "Delete"}
                    </ActionButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {job && (job.status === "queued" || job.status === "running") ? (
        <Panel className="mt-5 p-5 sm:p-6">
          <p className="text-[15px] font-medium text-body">
            Running deterministic checks, then Claude review…
          </p>
        </Panel>
      ) : null}

      {job?.status === "failed" ? (
        <Panel className="mt-5 p-5 sm:p-6">
          <h2 className="text-[18px] font-bold text-ink">Analysis failed</h2>
          <p className="mt-1.5 text-[14px] font-light text-subtle">
            {job.original_filename ?? "This upload"} could not be analyzed
            {job.error_code ? ` (${job.error_code})` : ""}. You can delete it and try again.
          </p>
          <div className="mt-4">
            <ActionButton
              type="button"
              variant="danger"
              size="sm"
              disabled={deletingId === job.id}
              onClick={() => void removeDocument(job.document_id, job.id)}
            >
              {deletingId === job.id ? "Deleting…" : "Delete this upload"}
            </ActionButton>
          </div>
        </Panel>
      ) : null}

      {job?.status === "succeeded" ? (
        <Panel className="mt-5 p-5 sm:p-6">
          <h2 className="text-[18px] font-bold text-ink">Forensic findings</h2>
          <p className="mt-1.5 text-[14px] font-light text-subtle">
            {findings.length
              ? `Results for ${job.original_filename ?? "your document"}.`
              : "No suspicious patterns were supported by the extract. That is not a guarantee the document is clean."}
          </p>
          {job.llm_status === "skipped" || job.llm_status === "failed" ? (
            <p className="mt-2 text-[13.5px] font-light text-subtle">
              Rule-based findings are shown. AI review was unavailable for this
              run.
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {findings.length ? (
              <ActionButton
                href={`/dashboard/explainable-ai/${job.id}`}
                variant="accent"
                size="sm"
              >
                Open in Explainable AI
              </ActionButton>
            ) : null}
            <ActionButton
              type="button"
              variant="danger"
              size="sm"
              disabled={deletingId === job.id}
              onClick={() => void removeDocument(job.document_id, job.id)}
            >
              {deletingId === job.id ? "Deleting…" : "Delete this upload"}
            </ActionButton>
          </div>
          {findings.length ? (
            <ul className="mt-5 space-y-3">
              {findings.map((finding) => (
                <li
                  key={finding.id}
                  className="rounded-[12px] border border-hairline bg-canvas px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[15px] font-semibold text-ink">
                      {finding.title}
                    </p>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize",
                        severityClass(finding.severity),
                      )}
                    >
                      {finding.severity}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13.5px] font-light leading-[1.65] text-subtle">
                    {finding.detail}
                  </p>
                  {finding.evidence ? (
                    <p className="mt-2 rounded-[8px] bg-white/70 px-3 py-2 text-[13px] font-light leading-[1.6] text-body">
                      Evidence: {finding.evidence}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2 text-[12px] text-subtle">
                    <span className="rounded-full bg-sunken px-2 py-0.5">
                      {finding.source === "rule" ? "Rule" : "AI"}
                    </span>
                    {finding.location ? <span>{finding.location}</span> : null}
                    {typeof finding.confidence === "number" ? (
                      <span>{Math.round(finding.confidence * 100)}% confidence</span>
                    ) : null}
                    {finding.rule_id ? <span>{finding.rule_id}</span> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </Panel>
      ) : null}
    </Container>
  );
}
