"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { ModuleCard } from "@/components/dashboard/ModuleCard";
import { Panel } from "@/components/dashboard/Panel";
import { WorkspacePanel } from "@/components/dashboard/WorkspacePanel";
import { ActionButton } from "@/components/dashboard/ActionButton";
import { dashboardModules, statementTypes, type StatementType } from "@/data/dashboard";
import { getLearningSummary, getNetworkSummary, getTransactions, listJobs } from "@/lib/api";
import {
  getErrorMessage,
  type AnalysisJobSummary,
  type Transaction,
} from "@/lib/api-types";
import { cn } from "@/utils/cn";

const statementLabel: Record<StatementType, string> = Object.fromEntries(
  statementTypes.map((item) => [item.id, item.label]),
) as Record<StatementType, string>;

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

export function DashboardHome() {
  const [jobs, setJobs] = useState<AnalysisJobSummary[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [learningMeta, setLearningMeta] = useState<string | undefined>();
  const [networkMeta, setNetworkMeta] = useState<string | undefined>();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listJobs(),
      getTransactions().catch(() => [] as Transaction[]),
      getLearningSummary().catch(() => null),
      getNetworkSummary().catch(() => null),
    ])
      .then(([jobRows, txnRows, learning, network]) => {
        if (cancelled) return;
        setJobs(jobRows);
        setTransactions(txnRows);
        setLearningMeta(
          learning
            ? `${learning.counts.reviewed} reviews · ${learning.counts.high_open} high open`
            : undefined,
        );
        setNetworkMeta(
          network
            ? `${network.vendors.length} vendors · ${network.connections.length} links`
            : undefined,
        );
        setError(null);
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(getErrorMessage(caught, "Unable to load workspace overview."));
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const succeeded = jobs.filter((job) => job.status === "succeeded");
    const findings = succeeded.reduce((sum, job) => sum + job.finding_count, 0);
    const flaggedTxns = transactions.filter((txn) => txn.status !== "clear").length;
    return {
      analyses: jobs.length,
      findings,
      transactions: transactions.length,
      flaggedTxns,
    };
  }, [jobs, transactions]);

  const recentJobs = jobs.slice(0, 5);

  const moduleMeta = useMemo(() => {
    const meta: Record<string, string> = {
      "/dashboard/explainable-ai": ready
        ? `${stats.findings} finding${stats.findings === 1 ? "" : "s"} across ${stats.analyses} analysis${stats.analyses === 1 ? "" : "es"}`
        : "Loading…",
      "/financial-statement-analysis": ready
        ? `${stats.analyses} saved upload${stats.analyses === 1 ? "" : "s"}`
        : "Loading…",
      "/dashboard/adaptive-learning": ready
        ? (learningMeta ?? "No reviews yet")
        : "Loading…",
      "/dashboard/network-analysis": ready
        ? (networkMeta ?? "Import transactions to map vendors")
        : "Loading…",
      "/dashboard/risk-settings": ready ? "Thresholds applied to analysis" : "Loading…",
    };
    return meta;
  }, [ready, stats, learningMeta, networkMeta]);

  return (
    <Container>
      <div>
        <p className="text-[13px] font-semibold tracking-[0.14em] text-primary uppercase">
          Workspace
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.5px] text-ink sm:text-[2.15rem]">
          Dashboard
        </h1>
        <p className="mt-2 max-w-[52ch] text-[15px] font-light leading-[1.7] text-subtle">
          Import, analyze, and detect financial fraud patterns with full
          forensic transparency.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Analyses", value: stats.analyses },
          { label: "Findings", value: stats.findings },
          { label: "Transactions", value: stats.transactions },
          { label: "Flagged imports", value: stats.flaggedTxns },
        ].map((item) => (
          <Panel key={item.label} className="px-4 py-4 sm:px-5">
            <p className="text-[12px] font-semibold tracking-[0.08em] text-subtle uppercase">
              {item.label}
            </p>
            <p className="mt-2 text-[1.75rem] font-bold tracking-tight text-ink">
              {ready ? item.value.toLocaleString() : "—"}
            </p>
          </Panel>
        ))}
      </div>

      {error ? (
        <p className="mt-4 text-sm text-[#9f1239]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {dashboardModules.map((module) => (
          <ModuleCard
            key={module.href}
            module={module}
            meta={moduleMeta[module.href]}
          />
        ))}
      </div>

      <Panel className="mt-8 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-sunken text-primary">
              <Icon name="file" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-ink">Recent analyses</h2>
              <p className="mt-1 text-[14px] font-light text-subtle">
                Open a saved statement run in Explainable AI.
              </p>
            </div>
          </div>
          <ActionButton href="/financial-statement-analysis" variant="secondary" size="sm">
            New analysis
          </ActionButton>
        </div>

        {!ready ? (
          <p className="mt-5 text-[14px] font-light text-subtle">Loading analyses…</p>
        ) : recentJobs.length === 0 ? (
          <div className="mt-5">
            <p className="text-[15px] font-medium text-body">
              No analyses yet. Upload a financial statement to get started.
            </p>
            <ActionButton
              href="/financial-statement-analysis"
              variant="accent"
              size="sm"
              className="mt-4"
            >
              Open Statement Analysis
            </ActionButton>
          </div>
        ) : (
          <ul className="mt-5 divide-y divide-hairline rounded-[12px] border border-hairline">
            {recentJobs.map((job) => {
              const statement =
                job.statement_type && job.statement_type in statementLabel
                  ? statementLabel[job.statement_type]
                  : "Statement";
              return (
                <li key={job.id}>
                  <Link
                    href={`/dashboard/explainable-ai/${job.id}`}
                    className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-canvas sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[15px] font-semibold text-ink">
                          {job.original_filename ?? "Untitled document"}
                        </p>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                            statusClass(job.status),
                          )}
                        >
                          {statusLabel(job.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] font-light text-subtle">
                        {statement}
                        {" · "}
                        {formatJobDate(job.created_at)}
                        {job.status === "succeeded"
                          ? ` · ${job.finding_count} finding${job.finding_count === 1 ? "" : "s"}`
                          : null}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-[13.5px] font-semibold text-primary">
                      Review
                      <Icon name="arrow-right" className="h-4 w-4" strokeWidth={2} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <div className="mt-8">
        <WorkspacePanel
          initialTransactions={transactions}
          transactionsReady={ready}
          onTransactionsChange={setTransactions}
        />
      </div>
    </Container>
  );
}
