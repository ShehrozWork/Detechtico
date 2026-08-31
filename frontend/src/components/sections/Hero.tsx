"use client";

import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import ArrowRight from "@/app/icons/arrow-right";
import { useTrialHref } from "@/hooks/useTrialHref";

const findings = [
  "Duplicate payments detected",
  "Round-dollar transactions increased",
  "Weekend payment activity",
  "Vendor payment anomalies",
];

const analysisStats = [
  { label: "Transactions Analyzed", value: "12,483" },
  { label: "High-Risk Transactions", value: "42" },
  { label: "Confidence", value: "High" },
];

export function Hero() {
  const trialHref = useTrialHref();

  return (
    <header id="top" className="bg-primary-tint py-10.5">
      <Container>
        <div
          className="grid grid-cols-1 items-center gap-8 rounded-[22px] px-7.5 py-14 sm:px-14 lg:grid-cols-[1.02fr_0.98fr]"
          style={{
            background:
              "radial-gradient(120% 120% at 78% 38%, #2bb0d2 0%, #0c86a8 42%, #08536b 68%, #04303f 100%)",
          }}
        >
          <div>
            <h1 className="max-w-[15ch] text-[31px] font-light leading-[1.22] tracking-[-0.5px] text-white sm:text-[39px]">
              Stop trusting <b className="font-bold">black boxes</b> with your{" "}
              <b className="font-bold">financial statement analysis</b>
            </h1>
            <p className="mt-5.5 max-w-[40ch] text-[14.5px] font-light leading-[1.85] text-primary-tint">
              Most analysis tools tell you what happened.{" "}
              <b className="font-bold text-white">Detechtico</b> shows you why
              — so your team can investigate faster, surface anomalies early,
              and satisfy auditors with confidence.
            </p>
            <div className="mt-8.5 flex flex-wrap gap-3.5">
              <Button
                href={trialHref}
                className="rounded-[10px]! px-7.5! py-3.5! text-[17px]!"
              >
                Start 3-day free trial
                <ArrowRight className="w-6" fill="#fff" />
              </Button>
              <a
                href="/platform"
                className="inline-flex items-center justify-center rounded-[10px] border border-white/55 px-7.5 py-3.5 text-[17px] font-medium text-white transition-colors hover:bg-white/10"
              >
                See the platform
              </a>
            </div>
          </div>

          <div
            className="mx-auto w-full max-w-[430px] rounded-2xl border border-white/16 bg-[#073344] p-5.5 shadow-[0_22px_46px_rgba(0,0,0,.28)] lg:ml-auto"
            aria-label="Example flagged financial anomaly with explanation"
          >
            <div className="flex items-center justify-between border-b border-white/14 pb-3.5">
              <span className="text-sm font-semibold text-white">
                Statement review · Q3 2025
              </span>
              <span className="rounded-full bg-[#fde68a] px-2.5 py-1 text-[10.5px] font-semibold tracking-[0.02em] text-[#7c4a03]">
                Flagged for review
              </span>
            </div>

            <div className="flex items-center gap-4 border-b border-white/14 py-4">
              <div
                className="grid h-16 w-16 shrink-0 place-items-center rounded-full"
                style={{
                  background:
                    "conic-gradient(#1fcaeb 0 87%, rgba(255,255,255,.16) 87% 100%)",
                }}
              >
                <div className="grid h-[50px] w-[50px] place-items-center rounded-full bg-[#073344] text-[17px] font-bold text-white">
                  87
                </div>
              </div>
              <div className="text-[12.5px] leading-relaxed text-primary-tint">
                <b className="mb-0.5 block text-[15px] font-semibold text-white">
                  Operating Expenses: +42%
                </b>
                Risk: High
              </div>
            </div>

            <div className="border-b border-white/14 py-4">
              <h4 className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-primary-soft">
                Insight
              </h4>
              <p className="text-[12.5px] leading-relaxed text-primary-tint">
                Operating expenses increased significantly without a
                corresponding increase in revenue. This pattern deviates from
                historical trends and has been flagged for investigation.
              </p>
            </div>

            <h4 className="mb-3 mt-4 text-[11px] font-medium uppercase tracking-[0.12em] text-primary-soft">
              Findings
            </h4>
            <ul className="mb-4 space-y-2">
              {findings.map((finding) => (
                <li
                  key={finding}
                  className="flex items-start gap-2 text-[12.5px] leading-snug text-primary-tint"
                >
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-soft"
                    aria-hidden
                  />
                  {finding}
                </li>
              ))}
            </ul>

            <h4 className="mb-3 border-t border-white/14 pt-4 text-[11px] font-medium uppercase tracking-[0.12em] text-primary-soft">
              Statement Analysis
            </h4>
            <dl className="space-y-2">
              {analysisStats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center justify-between text-[12.5px]"
                >
                  <dt className="text-primary-tint">{stat.label}</dt>
                  <dd className="font-semibold text-white">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Container>
    </header>
  );
}
