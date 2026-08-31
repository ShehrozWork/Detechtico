"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel } from "@/components/dashboard/Panel";
import { ActionButton } from "@/components/dashboard/ActionButton";
import { statementTypes, type StatementType } from "@/data/dashboard";
import { listJobs } from "@/lib/api";
import { getErrorMessage, type AnalysisJobSummary } from "@/lib/api-types";
import { cn } from "@/utils/cn";

const statementLabel: Record<StatementType, string> = Object.fromEntries(
  statementTypes.map((item) => [item.id, item.label]),
) as Record<StatementType, string>;

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

export function ExplainableAiListContent() {
  const [items, setItems] = useState<AnalysisJobSummary[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listJobs()
      .then((rows) => {
        if (!cancelled) {
          setItems(rows);
          setError(null);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(getErrorMessage(caught, "Unable to load saved analyses."));
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Container>
      <PageHeader
        title="Explainable AI"
        description="Browse every saved analysis, then open one to inspect evidence, confidence, and the reasoning behind each finding."
      />

      <Panel className="mt-8 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-sunken text-primary">
              <Icon name="eye" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-ink">Available analyses</h2>
              <p className="mt-1 text-[14px] font-light text-subtle">
                Click an analysis to open its explainable findings page.
              </p>
            </div>
          </div>
          <ActionButton href="/financial-statement-analysis" variant="secondary" size="sm">
            Run new analysis
          </ActionButton>
        </div>

        {error ? (
          <p className="mt-4 text-sm text-[#9f1239]" role="alert">
            {error}
          </p>
        ) : null}

        {!ready ? (
          <p className="mt-5 text-[14px] font-light text-subtle">Loading analyses…</p>
        ) : items.length === 0 ? (
          <div className="mt-5">
            <p className="text-[15px] font-medium text-body">
              No analyses yet. Upload a statement to generate findings.
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
            {items.map((item) => {
              const statement =
                item.statement_type && item.statement_type in statementLabel
                  ? statementLabel[item.statement_type]
                  : "Statement";
              const href = `/dashboard/explainable-ai/${item.id}`;

              return (
                <li key={item.id}>
                  <Link
                    href={href}
                    className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-canvas sm:flex-row sm:items-center sm:justify-between"
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
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-[13.5px] font-semibold text-primary">
                      Open
                      <Icon name="arrow-right" className="h-4 w-4" strokeWidth={2} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </Container>
  );
}
