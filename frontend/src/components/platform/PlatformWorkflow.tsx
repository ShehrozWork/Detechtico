import { Container } from "@/components/ui/Container";
import { SplitMediaSection } from "@/components/ui/SplitMediaSection";
import { platformStats, workflowSteps } from "@/data/platform";
import { cn } from "@/utils/cn";
import DataCollection from "@/assets/illustrations/data-collection";
import AiAnalysis from "@/assets/illustrations/ai-analysis";
import PatternRecognition from "@/assets/illustrations/pattern-recognition";
import RiskAssessment from "@/assets/illustrations/risk-assessment";
import ReportGeneration from "@/assets/illustrations/report-generation";
import ComplianceVerification from "@/assets/illustrations/compliance-verification";

const workflowIllustrations = [
  DataCollection,
  AiAnalysis,
  PatternRecognition,
  RiskAssessment,
  ReportGeneration,
  ComplianceVerification,
] as const;

export function PlatformWorkflow() {
  return (
    <section id="how-it-works" className="bg-canvas">
      <Container className="py-12 sm:py-16 lg:py-22">
        <div className="mx-auto max-w-[48rem] text-center">
          <p className="text-[13px] font-semibold tracking-[0.14em] text-primary uppercase">
            How It Works
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.5px] text-ink sm:text-4xl lg:text-5xl">
            The <b>Detechtico</b> Workflow
          </h2>
          <p className="mt-4 text-base font-light leading-[1.8] text-subtle sm:text-lg">
            Our comprehensive fraud detection process combines cutting-edge
            technology with financial expertise to protect your organization.
          </p>
        </div>
      </Container>

      <ol>
        {workflowSteps.map((step, index) => {
          const Illustration = workflowIllustrations[index];
          const imageOnLeft = index % 2 === 0;

          return (
            <li key={step.title}>
              <SplitMediaSection
                mediaOnRight={!imageOnLeft}
                className={
                  index % 2 === 0 ? "bg-canvas" : "bg-primary-tint/40"
                }
                media={
                  <Illustration
                    className="absolute inset-0 h-full w-full"
                    preserveAspectRatio="xMidYMid slice"
                    aria-hidden="true"
                  />
                }
              >
                <h3 className="text-3xl font-bold tracking-[-0.5px] text-ink sm:text-4xl lg:text-5xl">
                  {step.title}
                </h3>
                <p className="mt-4 text-base font-light leading-[1.8] text-body sm:mt-5 sm:text-lg">
                  {step.description}
                </p>
              </SplitMediaSection>
            </li>
          );
        })}
      </ol>

      <Container className="py-12 sm:py-16 lg:py-20">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {platformStats.map((stat, index) => (
            <div
              key={stat.label}
              className={cn(
                "rounded-[14px] border border-hairline px-6 py-7 text-center",
                index === 1 ? "bg-primary text-white" : "bg-surface",
              )}
            >
              <p
                className={cn(
                  "text-[28px] font-bold tracking-[-0.5px] sm:text-[34px]",
                  index === 1 ? "text-white" : "text-primary-deep",
                )}
              >
                {stat.value}
              </p>
              <p
                className={cn(
                  "mt-1 text-sm",
                  index === 1 ? "text-primary-pale" : "text-subtle",
                )}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
