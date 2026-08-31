"use client";

import { useEffect, useState } from "react";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel } from "@/components/dashboard/Panel";
import { ActionButton } from "@/components/dashboard/ActionButton";
import { getLearningSummary } from "@/lib/api";
import { getErrorMessage, type LearningSummary } from "@/lib/api-types";
import { cn } from "@/utils/cn";

export function AdaptiveLearningContent() {
  const [summary, setSummary] = useState<LearningSummary | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getLearningSummary()
      .then((data) => {
        if (!cancelled) {
          setSummary(data);
          setError(null);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(getErrorMessage(caught, "Unable to load learning summary."));
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
        title="Adaptive Learning Intelligence"
        description="Track investigator dispositions on findings and how they shape your review loop."
      />

      {error ? (
        <p className="mt-5 text-sm text-[#9f1239]" role="alert">
          {error}
        </p>
      ) : null}

      {!ready ? (
        <p className="mt-8 text-[14px] font-light text-subtle">Loading review activity…</p>
      ) : null}

      {summary ? (
        <>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summary.metrics.map((metric) => (
              <Panel key={metric.title} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-[14px] font-semibold text-body">{metric.title}</h2>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[12px] font-semibold",
                      metric.deltaPositive
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-amber-50 text-amber-800",
                    )}
                  >
                    {metric.delta}
                  </span>
                </div>
                <p className="mt-4 text-[2rem] font-bold tracking-tight text-ink">{metric.value}</p>
                <p className="mt-2 text-[13px] font-light leading-[1.6] text-subtle">
                  {metric.description}
                </p>
              </Panel>
            ))}
          </div>

          <Panel className="mt-6 p-5 sm:p-6">
            <h2 className="text-[18px] font-bold text-ink">Recent review events</h2>
            <p className="mt-1.5 text-[14px] font-light text-subtle">
              Confirm, dismiss, and needs-info decisions from Explainable AI
            </p>

            {summary.events.length === 0 ? (
              <div className="mt-5">
                <p className="text-[14px] font-light text-subtle">
                  No dispositions yet. Open a finding in Explainable AI and mark it confirmed,
                  dismissed, or needs info.
                </p>
                <ActionButton
                  href="/dashboard/explainable-ai"
                  variant="accent"
                  size="sm"
                  className="mt-4"
                >
                  Open Explainable AI
                </ActionButton>
              </div>
            ) : (
              <ul className="mt-5 space-y-3">
                {summary.events.map((event, index) => (
                  <li
                    key={`${event.title}-${index}`}
                    className="rounded-[12px] border border-hairline border-l-4 border-l-primary bg-canvas px-4 py-4 sm:px-5"
                  >
                    <p className="text-[15px] font-semibold text-ink">{event.title}</p>
                    <p className="mt-1 text-[13.5px] font-light text-subtle">{event.source}</p>
                    <p className="mt-2 text-[13.5px] font-medium text-primary-deep">
                      Adjustment: {event.adjustment}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <div className="mt-6 rounded-[14px] border border-primary-pale bg-sunken px-5 py-5 sm:px-6">
            <h2 className="text-[16px] font-bold text-ink">Continuous improvement</h2>
            <p className="mt-2 max-w-[72ch] text-[14.5px] font-light leading-[1.75] text-body">
              {summary.insight}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <ActionButton href="/dashboard/risk-settings" variant="secondary" size="sm">
                Tune risk settings
              </ActionButton>
              <ActionButton href="/dashboard/explainable-ai" variant="ghost" size="sm">
                Review findings
              </ActionButton>
            </div>
          </div>
        </>
      ) : null}
    </Container>
  );
}
