import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { SplitMediaSection } from "@/components/ui/SplitMediaSection";
import ArrowRight from "@/app/icons/arrow-right";
import { careerPerks, careerRoles, careerValues } from "@/data/careers";
import PatternRecognition from "@/assets/illustrations/pattern-recognition";
import AiAnalysis from "@/assets/illustrations/ai-analysis";
import ReportGeneration from "@/assets/illustrations/report-generation";

const mediaClassName = "absolute inset-0 h-full w-full";

export function CareersContent() {
  return (
    <>
      <header className="bg-canvas py-12 sm:py-16 lg:py-22">
        <Container>
          <div className="mx-auto max-w-[48rem] text-center">
            <p className="text-[13px] font-semibold tracking-[0.14em] text-primary uppercase">
              Careers
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.5px] text-ink sm:text-4xl lg:text-5xl">
              Build trust into financial analysis
            </h1>
            <p className="mt-4 text-base font-light leading-[1.85] text-subtle sm:mt-5 sm:text-lg">
              We&apos;re hiring people who care about explainability, forensic
              rigor, and products that stand up under real audit pressure.
            </p>
            <div className="mt-8">
              <Button
                href="#open-roles"
                className="bg-primary text-white hover:bg-primary-hover"
              >
                View open roles
                <ArrowRight className="w-6 text-white" />
              </Button>
            </div>
          </div>
        </Container>
      </header>

      <SplitMediaSection
        media={
          <PatternRecognition
            className={mediaClassName}
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          />
        }
      >
        <p className="text-[13px] font-semibold tracking-[0.14em] text-primary uppercase">
          Why Detechtico
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-[-0.5px] text-ink sm:text-4xl lg:text-5xl">
          Work on problems that demand clarity
        </h2>
        <p className="mt-4 text-base font-light leading-[1.85] text-subtle sm:mt-5 sm:text-lg">
          Black-box scores are easy to ship and hard to defend. At{" "}
          <b className="font-bold text-ink">Detechtico</b>, every contribution
          should help investigators, compliance teams, and institutions
          understand — and stand behind — what the system finds.
        </p>
      </SplitMediaSection>

      <section className="bg-primary-tint/40 py-12 sm:py-16 lg:py-22">
        <Container>
          <div className="mx-auto max-w-[48rem] text-center">
            <p className="text-[13px] font-semibold tracking-[0.14em] text-primary uppercase">
              How we work
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.5px] text-ink sm:text-4xl lg:text-5xl">
              What you can expect here
            </h2>
            <p className="mt-4 text-base font-light leading-[1.8] text-subtle sm:text-lg">
              A few things that define the culture we hire for.
            </p>
          </div>

          <ol className="mx-auto mt-10 max-w-[48rem] divide-y divide-hairline border-y border-hairline sm:mt-12">
            {careerValues.map((value, index) => (
              <li key={value.title} className="py-7 sm:py-10">
                <span className="text-[13px] font-semibold tracking-[0.12em] text-primary uppercase">
                  0{index + 1}
                </span>
                <h3 className="mt-2 text-xl font-bold tracking-[-0.4px] text-ink sm:text-[28px]">
                  {value.title}
                </h3>
                <p className="mt-3 text-base font-light leading-[1.8] text-body sm:text-lg">
                  {value.description}
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
              Life at Detechtico
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.5px] text-ink sm:text-4xl lg:text-5xl">
              Built for focused, high-trust work
            </h2>
            <p className="mt-4 text-base font-light leading-[1.8] text-subtle sm:text-lg">
              Practical support for people shipping serious financial software.
            </p>
          </div>

          <ul className="mt-10 grid grid-cols-1 gap-10 sm:mt-14 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
            {careerPerks.map((perk) => (
              <li key={perk.title}>
                <h3 className="text-xl font-bold text-ink sm:text-[22px]">
                  {perk.title}
                </h3>
                <p className="mt-3 text-base font-light leading-[1.8] text-body sm:text-lg">
                  {perk.description}
                </p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section
        id="open-roles"
        className="bg-primary-tint/40 py-12 sm:py-16 lg:py-22"
      >
        <Container>
          <div className="mx-auto max-w-[48rem] text-center">
            <p className="text-[13px] font-semibold tracking-[0.14em] text-primary uppercase">
              Open roles
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.5px] text-ink sm:text-4xl lg:text-5xl">
              Join the team
            </h2>
            <p className="mt-4 text-base font-light leading-[1.8] text-subtle sm:text-lg">
              Don&apos;t see a perfect fit? Reach out anyway — we&apos;re always
              interested in strong forensic, ML, and product talent.
            </p>
          </div>

          <ul className="mx-auto mt-10 max-w-[48rem] divide-y divide-hairline border-y border-hairline sm:mt-12">
            {careerRoles.map((role) => (
              <li
                key={role.title}
                className="flex flex-col gap-5 py-7 sm:flex-row sm:items-start sm:justify-between sm:gap-8 sm:py-10"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-bold tracking-[-0.4px] text-ink sm:text-[28px]">
                    {role.title}
                  </h3>
                  <p className="mt-2 text-sm text-subtle">
                    {role.location} · {role.type}
                  </p>
                  <p className="mt-3 text-base font-light leading-[1.8] text-body sm:text-lg">
                    {role.description}
                  </p>
                </div>
                <a
                  href={`mailto:detechtico@gmail.com?subject=${encodeURIComponent(`Application — ${role.title}`)}`}
                  className="inline-flex w-full shrink-0 items-center justify-center rounded-full bg-primary px-6 py-3 text-[14.5px] font-semibold text-white transition-colors hover:bg-primary-hover sm:w-auto"
                >
                  Apply
                </a>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <SplitMediaSection
        mediaOnRight
        media={
          <AiAnalysis
            className={mediaClassName}
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          />
        }
      >
        <p className="text-[13px] font-semibold tracking-[0.14em] text-primary uppercase">
          Hiring process
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-[-0.5px] text-ink sm:text-4xl lg:text-5xl">
          Straightforward and respectful of your time
        </h2>
        <p className="mt-4 text-base font-light leading-[1.85] text-subtle sm:mt-5 sm:text-lg">
          Send a short note and resume to{" "}
          <a
            href="mailto:detechtico@gmail.com"
            className="font-semibold text-primary-hover hover:text-primary"
          >
            detechtico@gmail.com
          </a>
          . We review applications carefully, share context early, and keep
          conversations focused on real work — not endless interview rounds.
        </p>
      </SplitMediaSection>

      <SplitMediaSection
        className="bg-primary-tint/40"
        media={
          <ReportGeneration
            className={mediaClassName}
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          />
        }
      >
        <p className="text-[13px] font-semibold tracking-[0.14em] text-primary uppercase">
          Get in touch
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-[-0.5px] text-ink sm:text-4xl lg:text-5xl">
          Prefer to introduce yourself first?
        </h2>
        <p className="mt-4 text-base font-light leading-[1.8] text-subtle sm:mt-5 sm:text-lg">
          Tell us what you&apos;re looking for, or ask about a role that
          isn&apos;t listed yet.
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
            href="/about"
            className="inline-flex items-center justify-center rounded-full border border-line px-7 py-3.5 text-[15px] font-medium text-ink transition-colors hover:border-ink"
          >
            About Detechtico
          </Link>
        </div>
      </SplitMediaSection>
    </>
  );
}
