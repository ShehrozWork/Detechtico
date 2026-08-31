import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { SplitMediaSection } from "@/components/ui/SplitMediaSection";
import ArrowRight from "@/app/icons/arrow-right";
import { aboutAudiences, aboutMilestones, aboutPrinciples } from "@/data/about";
import OurMission from "@/assets/illustrations/our-mission";
import ComplianceVerification from "@/assets/illustrations/compliance-verification";
import RiskAssessment from "@/assets/illustrations/risk-assessment";

const mediaClassName = "absolute inset-0 h-full w-full";

export function AboutContent() {
  return (
    <>
      <header className="py-12 sm:py-16 lg:py-22">
        <Container>
          <div className="mx-auto max-w-[48rem] text-center">
            <p className="text-[13px] font-semibold tracking-[0.14em] text-primary uppercase">
              About Us
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.5px] text-ink sm:text-4xl lg:text-5xl">
              <b>Detechtico</b> brings forensic clarity to financial analysis
            </h1>
            <p className="mt-4 text-base font-light leading-[1.85] text-subtle sm:mt-5 sm:text-lg">
              We build explainable statement review for investigators,
              compliance teams, and financial institutions who don&apos;t want
              black box answers.
            </p>
            <div className="mt-8">
              <Button
                href="/contact"
                className="bg-primary text-white hover:bg-primary-hover"
              >
                Talk to us
                <ArrowRight className="w-6 text-white" />
              </Button>
            </div>
          </div>
        </Container>
      </header>

      <SplitMediaSection
        media={
          <OurMission
            className={mediaClassName}
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          />
        }
      >
        <p className="text-[13px] font-semibold tracking-[0.14em] text-primary uppercase">
          Our mission
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-[-0.5px] text-ink sm:text-4xl lg:text-5xl">
          Stop trusting scores you cannot explain
        </h2>
        <p className="mt-4 text-base font-light leading-[1.85] text-subtle sm:mt-5 sm:text-lg">
          Traditional tools often flag risk without showing why. That leaves
          investigators guessing and auditors skeptical.{" "}
          <b className="font-bold text-ink">Detechtico</b> pairs detection with
          forensic-grade reasoning your organization can defend.
        </p>
        <p className="mt-4 text-base font-light leading-[1.85] text-subtle sm:text-lg">
          From Erie, PA, we support teams who need transparent analysis under
          real audit pressure.
        </p>
      </SplitMediaSection>

      <section className="bg-primary-tint/40 py-12 sm:py-16 lg:py-22">
        <Container>
          <div className="mx-auto max-w-[48rem] text-center">
            <p className="text-[13px] font-semibold tracking-[0.14em] text-primary uppercase">
              Principles
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.5px] text-ink sm:text-4xl lg:text-5xl">
              What guides every product decision
            </h2>
            <p className="mt-4 text-base font-light leading-[1.8] text-subtle sm:text-lg">
              Non-negotiables shaped by real forensic and compliance work.
            </p>
          </div>

          <ol className="mx-auto mt-10 max-w-[48rem] divide-y divide-hairline border-y border-hairline sm:mt-12">
            {aboutPrinciples.map((principle, index) => (
              <li key={principle.title} className="py-7 sm:py-10">
                <span className="text-[13px] font-semibold tracking-[0.12em] text-primary uppercase">
                  0{index + 1}
                </span>
                <h3 className="mt-2 text-xl font-bold tracking-[-0.4px] text-ink sm:text-[28px]">
                  {principle.title}
                </h3>
                <p className="mt-3 text-base font-light leading-[1.8] text-body sm:text-lg">
                  {principle.description}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="bg-canvas py-12 sm:py-16 lg:py-22">
        <Container>
          <div className="mx-auto max-w-[48rem] text-center">
            <p className="text-[13px] font-semibold tracking-[0.14em] text-primary uppercase">
              Our approach
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.5px] text-ink sm:text-4xl lg:text-5xl">
              Detect. Explain. Act.
            </h2>
            <p className="mt-4 text-base font-light leading-[1.8] text-subtle sm:text-lg">
              Three stages that keep analysis useful from the first flag through
              the final review.
            </p>
          </div>

          <ol className="mt-10 grid grid-cols-1 gap-10 sm:mt-14 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
            {aboutMilestones.map((step) => (
              <li key={step.label}>
                <p className="text-[13px] font-semibold tracking-[0.14em] text-primary uppercase">
                  {step.label}
                </p>
                <h3 className="mt-3 text-xl font-bold tracking-[-0.4px] text-ink sm:text-[28px]">
                  {step.title}
                </h3>
                <p className="mt-3 text-base font-light leading-[1.8] text-body sm:text-lg">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <SplitMediaSection
        mediaOnRight
        media={
          <ComplianceVerification
            className={mediaClassName}
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          />
        }
      >
        <p className="text-[13px] font-semibold tracking-[0.14em] text-primary uppercase">
          Who we serve
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-[-0.5px] text-ink sm:text-4xl lg:text-5xl">
          Built for people who must stand behind the finding
        </h2>
        <ul className="mt-6 space-y-6 sm:mt-8">
          {aboutAudiences.map((audience) => (
            <li key={audience.title}>
              <h3 className="text-xl font-bold text-ink sm:text-[22px]">
                {audience.title}
              </h3>
              <p className="mt-2 text-base font-light leading-[1.8] text-body sm:text-lg">
                {audience.description}
              </p>
            </li>
          ))}
        </ul>
      </SplitMediaSection>

      <SplitMediaSection
        className="bg-primary-tint/40"
        media={
          <RiskAssessment
            className={mediaClassName}
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          />
        }
      >
        <p className="text-[13px] font-semibold tracking-[0.14em] text-primary uppercase">
          Based in Erie, PA
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-[-0.5px] text-ink sm:text-4xl lg:text-5xl">
          Ready to see transparent analysis in action?
        </h2>
        <p className="mt-4 text-base font-light leading-[1.8] text-subtle sm:mt-5 sm:text-lg">
          Tell us about your review workflow, or explore open roles if you want
          to help build what comes next.
        </p>
        <div className="mt-8 flex flex-wrap gap-3.5">
          <Button
            href="/contact"
            className="bg-primary text-white hover:bg-primary-hover"
          >
            Contact us
            <ArrowRight className="w-6 text-white" />
          </Button>
          <Link
            href="/careers"
            className="inline-flex items-center justify-center rounded-full border border-line px-7 py-3.5 text-[15px] font-medium text-ink transition-colors hover:border-ink"
          >
            Careers
          </Link>
        </div>
      </SplitMediaSection>
    </>
  );
}
