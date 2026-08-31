"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel } from "@/components/dashboard/Panel";
import { SegmentedTabs } from "@/components/dashboard/SegmentedTabs";
import { RiskGauge } from "@/components/dashboard/RiskGauge";
import { ActionButton } from "@/components/dashboard/ActionButton";
import { statementTypes, type StatementType } from "@/data/dashboard";
import { getJob, setFindingDisposition } from "@/lib/api";
import { getErrorMessage, type AnalysisJob, type Finding } from "@/lib/api-types";
import { cn } from "@/utils/cn";

type SeverityFilter = "all" | Finding["severity"];

const severityTabs: { id: SeverityFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
];

const statementLabel: Record<StatementType, string> = Object.fromEntries(
  statementTypes.map((item) => [item.id, item.label]),
) as Record<StatementType, string>;

function severityClass(severity: Finding["severity"]) {
  if (severity === "high") return "bg-amber-100 text-amber-900";
  if (severity === "medium") return "bg-primary-pale text-primary-deep";
  return "bg-sunken text-body";
}

function confidenceScore(finding: Finding) {
  if (typeof finding.confidence === "number" && Number.isFinite(finding.confidence)) {
    return Math.round(Math.max(0, Math.min(1, finding.confidence)) * 100);
  }
  if (finding.severity === "high") return 85;
  if (finding.severity === "medium") return 65;
  return 45;
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

function humanRuleId(ruleId: string) {
  return ruleId
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

type Factor = {
  title: string;
  description: string;
  impact: number;
  icon: IconName;
};

function buildFactors(finding: Finding): Factor[] {
  const score = confidenceScore(finding);
  const factors: Factor[] = [
    {
      title: finding.source === "rule" ? "Deterministic rule" : "AI forensic review",
      description:
        finding.source === "rule"
          ? "Matched a transparent, code-defined check that investigators can audit line by line."
          : "Claude reviewed the extract alongside rule hits and returned a structured finding.",
      impact: finding.source !== "rule" ? Math.round(score * 0.55) : Math.round(score * 0.4),
      icon: finding.source === "rule" ? "sliders" : "brain",
    },
  ];

  if (finding.rule_id) {
    factors.push({
      title: humanRuleId(finding.rule_id),
      description: `Rule identifier ${finding.rule_id} — the exact check that fired for this anomaly.`,
      impact: Math.round(score * 0.25),
      icon: "shield",
    });
  }

  if (finding.location) {
    factors.push({
      title: "Document location",
      description: `Signal localized to ${finding.location}.`,
      impact: Math.round(score * 0.15),
      icon: "file",
    });
  }

  if (finding.evidence) {
    factors.push({
      title: "Supporting evidence",
      description: finding.evidence,
      impact: Math.round(score * 0.2),
      icon: "eye",
    });
  }

  return factors;
}

type ExplainableAiContentProps = {
  jobId: string;
};

export function ExplainableAiContent({ jobId }: ExplainableAiContentProps) {
  const [job, setJob] = useState<AnalysisJob | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<SeverityFilter>("all");
  const [expandedId, setExpandedId] = useState<string>("");
  const [dispositionPending, setDispositionPending] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);
    setFilter("all");

    getJob(jobId)
      .then((current) => {
        if (cancelled) return;
        setJob(current);
        setExpandedId(current.findings[0]?.id ?? "");
      })
      .catch((caught) => {
        if (cancelled) return;
        setJob(null);
        setError(getErrorMessage(caught, "Unable to load that analysis."));
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const findings = job?.findings ?? [];

  const counts = useMemo(
    () => ({
      all: findings.length,
      high: findings.filter((item) => item.severity === "high").length,
      medium: findings.filter((item) => item.severity === "medium").length,
      low: findings.filter((item) => item.severity === "low").length,
    }),
    [findings],
  );

  const visible = useMemo(
    () => (filter === "all" ? findings : findings.filter((item) => item.severity === filter)),
    [findings, filter],
  );

  const tabs = severityTabs.map((tab) => ({
    ...tab,
    label: `${tab.label} (${counts[tab.id]})`,
  }));

  const statement =
    job?.statement_type && job.statement_type in statementLabel
      ? statementLabel[job.statement_type]
      : "Statement";

  const applyDisposition = async (
    findingId: string,
    disposition: "confirmed" | "dismissed" | "needs_info",
  ) => {
    setDispositionPending(findingId);
    setError(null);
    try {
      const saved = await setFindingDisposition(findingId, disposition);
      setJob((current) => {
        if (!current) return current;
        return {
          ...current,
          findings: current.findings.map((finding) =>
            finding.id === findingId
              ? { ...finding, disposition: saved.disposition }
              : finding,
          ),
        };
      });
    } catch (caught) {
      setError(getErrorMessage(caught, "Unable to save finding review."));
    } finally {
      setDispositionPending(null);
    }
  };

  return (
    <Container>
      <PageHeader
        title={job?.original_filename ?? "Explainable AI"}
        description="Inspect why each forensic finding was raised — evidence, confidence, rule IDs, and AI rationale."
      />

      <div className="mt-6 flex flex-wrap gap-2">
        <ActionButton href="/dashboard/explainable-ai" variant="secondary" size="sm">
          <Icon name="arrow-left" className="h-4 w-4" strokeWidth={2} />
          All analyses
        </ActionButton>
        <ActionButton href="/financial-statement-analysis" variant="ghost" size="sm">
          Manage uploads
        </ActionButton>
      </div>

      {!ready ? (
        <Panel className="mt-6 px-6 py-12 text-center">
          <p className="text-[15px] font-medium text-body">Loading findings…</p>
        </Panel>
      ) : null}

      {error ? (
        <Panel className="mt-6 p-5 sm:p-6">
          <p className="text-sm text-[#9f1239]" role="alert">
            {error}
          </p>
          <ActionButton href="/dashboard/explainable-ai" variant="secondary" size="sm" className="mt-4">
            Back to analyses
          </ActionButton>
        </Panel>
      ) : null}

      {job ? (
        <Panel className="mt-6 p-5 sm:p-6">
          <p className="text-[13px] font-semibold tracking-[0.08em] text-subtle uppercase">
            Analysis context
          </p>
          <p className="mt-2 text-[15px] font-medium text-body">
            {statement}
            {" · "}
            {formatJobDate(job.finished_at ?? job.created_at)}
            {job.status === "succeeded"
              ? ` · ${findings.length} finding${findings.length === 1 ? "" : "s"}`
              : ` · ${job.status}`}
            {job.llm_status === "skipped" || job.llm_status === "failed"
              ? " · AI review unavailable for this run"
              : null}
          </p>
        </Panel>
      ) : null}

      {job?.status === "failed" ? (
        <Panel className="mt-5 px-6 py-10 text-center">
          <p className="text-[15px] font-medium text-body">
            This analysis failed
            {job.error_code ? ` (${job.error_code})` : ""}. Choose another run or re-upload the
            statement.
          </p>
        </Panel>
      ) : null}

      {job && (job.status === "queued" || job.status === "running") ? (
        <Panel className="mt-5 px-6 py-10 text-center">
          <p className="text-[15px] font-medium text-body">
            This analysis is still running. Check back in a moment.
          </p>
        </Panel>
      ) : null}

      {job?.status === "succeeded" ? (
        <>
          <div className="mt-6">
            <SegmentedTabs
              tabs={tabs}
              value={filter}
              onChange={(id) => {
                setFilter(id);
                const next =
                  id === "all" ? findings[0] : findings.find((item) => item.severity === id);
                setExpandedId(next?.id ?? "");
              }}
              ariaLabel="Finding severity"
            />
          </div>

          <div className="mt-6 space-y-4">
            {visible.length === 0 ? (
              <Panel className="px-6 py-12 text-center">
                <p className="text-[15px] font-medium text-body">
                  {findings.length === 0
                    ? "No findings were raised for this document."
                    : "No findings in this severity queue."}
                </p>
                {findings.length === 0 ? (
                  <p className="mx-auto mt-2 max-w-[48ch] text-[13.5px] font-light text-subtle">
                    That is not a guarantee the statement is clean — only that rules and AI review
                    did not surface supported anomalies.
                  </p>
                ) : null}
              </Panel>
            ) : (
              visible.map((finding) => {
                const expanded = expandedId === finding.id;
                const score = confidenceScore(finding);
                const factors = buildFactors(finding);

                return (
                  <Panel key={finding.id} className="overflow-hidden">
                    <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h2 className="text-[16px] font-bold text-ink">{finding.title}</h2>
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize",
                              severityClass(finding.severity),
                            )}
                          >
                            {finding.severity}
                          </span>
                          <span className="rounded-full bg-sunken px-2.5 py-1 text-[11px] font-semibold text-body">
                            {finding.source === "rule" ? "Rule" : "AI"}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-[14.5px] font-light leading-[1.65] text-body">
                          {finding.detail}
                        </p>
                        {finding.location ? (
                          <p className="mt-2 text-[13px] font-medium text-subtle">
                            Location: {finding.location}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-[11px] font-semibold tracking-[0.1em] text-subtle uppercase">
                            Confidence
                          </p>
                          <p className="mt-1 text-right text-[13px] font-semibold text-ink sm:hidden">
                            {score}%
                          </p>
                        </div>
                        <RiskGauge score={score} />
                      </div>
                    </div>

                    {expanded ? (
                      <div className="border-t border-hairline px-5 py-5 sm:px-6">
                        <h3 className="text-[15px] font-semibold text-ink">Why this was flagged</h3>
                        <p className="mt-2 max-w-[70ch] text-[14.5px] font-light leading-[1.75] text-body">
                          {finding.detail}
                        </p>

                        {finding.evidence ? (
                          <>
                            <h3 className="mt-6 text-[15px] font-semibold text-ink">Evidence</h3>
                            <blockquote className="mt-2 rounded-[12px] border border-hairline bg-canvas px-4 py-3 text-[14px] font-light leading-[1.7] text-body">
                              {finding.evidence}
                            </blockquote>
                          </>
                        ) : null}

                        <h3 className="mt-6 text-[15px] font-semibold text-ink">
                          Contributing factors
                        </h3>
                        <ul className="mt-3 space-y-3">
                          {factors.map((factor) => (
                            <li
                              key={factor.title}
                              className="rounded-[12px] border border-hairline bg-canvas px-4 py-4"
                            >
                              <div className="flex items-start gap-3">
                                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] bg-sunken text-primary">
                                  <Icon
                                    name={factor.icon}
                                    className="h-4.5 w-4.5"
                                    strokeWidth={1.75}
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-[14.5px] font-semibold text-ink">
                                      {factor.title}
                                    </p>
                                    <span className="text-[13px] font-semibold text-[#9f1239]">
                                      +{factor.impact}% confidence weight
                                    </span>
                                  </div>
                                  <p className="mt-1 text-[13.5px] font-light leading-[1.65] text-subtle">
                                    {factor.description}
                                  </p>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>

                        {finding.rule_id ? (
                          <p className="mt-5 text-[12.5px] font-medium tracking-[0.04em] text-subtle uppercase">
                            Rule ID · {finding.rule_id}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-2.5 border-t border-hairline px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                      <ActionButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedId(expanded ? "" : finding.id)}
                      >
                        {expanded ? "Hide Details" : "Show Details"}
                        <Icon
                          name={expanded ? "chevron-up" : "chevron-down"}
                          className="h-4 w-4"
                        />
                      </ActionButton>
                      <div className="flex flex-wrap gap-2">
                        {finding.disposition ? (
                          <span className="rounded-full bg-sunken px-2.5 py-1 text-[12px] font-semibold capitalize text-body">
                            {finding.disposition.replace("_", " ")}
                          </span>
                        ) : null}
                        <ActionButton
                          type="button"
                          variant="accent"
                          size="sm"
                          disabled={dispositionPending === finding.id}
                          onClick={() => void applyDisposition(finding.id, "confirmed")}
                        >
                          Confirm
                        </ActionButton>
                        <ActionButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={dispositionPending === finding.id}
                          onClick={() => void applyDisposition(finding.id, "needs_info")}
                        >
                          Needs info
                        </ActionButton>
                        <ActionButton
                          type="button"
                          variant="danger"
                          size="sm"
                          disabled={dispositionPending === finding.id}
                          onClick={() => void applyDisposition(finding.id, "dismissed")}
                        >
                          Dismiss
                        </ActionButton>
                      </div>
                    </div>
                  </Panel>
                );
              })
            )}
          </div>

          {findings.length > 0 ? (
            <p className="mt-6 text-center text-[13px] font-light text-subtle">
              Showing findings from{" "}
              <span className="font-medium text-body">
                {job.original_filename ?? "saved analysis"}
              </span>
              .{" "}
              <Link
                href="/dashboard/explainable-ai"
                className="font-semibold text-primary hover:text-primary-hover"
              >
                Browse all analyses
              </Link>
            </p>
          ) : null}
        </>
      ) : null}
    </Container>
  );
}
