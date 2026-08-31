import { Container } from "@/components/ui/Container";
import { platformFeatures } from "@/data/platform";
import ArrowRight from "@/app/icons/arrow-right";

export function PlatformFeatures() {
  return (
    <section id="features" className="bg-canvas py-16 sm:py-22">
      <Container>
        <div className="mx-auto max-w-[48rem] text-center">
          <p className="text-[13px] font-semibold tracking-[0.14em] text-primary uppercase">
            Key Features
          </p>
          <h2 className="mt-3 text-5xl font-bold tracking-[-0.5px] text-ink">
            Customizable, Explainable &amp; Adaptive AI
          </h2>
          <p className="mt-4 text-lg font-light leading-[1.8] text-subtle">
            Built by a forensic accountant,{" "}
            <b className="font-bold text-ink">Detechtico</b> combines
            rule-based logic, anomaly detection, and adaptive intelligence to
            deliver forensic-grade transparency with speed and precision.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {platformFeatures.map((feature) => (
            <article
              key={feature.title}
              className="flex flex-col rounded-[14px] border border-hairline bg-white p-6.5"
            >
              <h3 className="text-[18px] font-semibold text-ink">
                {feature.title}
              </h3>
              <p className="mt-3 flex-1 text-[14px] font-light leading-[1.75] text-body">
                {feature.description}
              </p>
              <a
                href={feature.href}
                className="mt-5 inline-flex items-center gap-2 text-[14px] font-semibold text-primary-hover transition-colors hover:text-primary"
              >
                Learn more
                <ArrowRight className="w-4 text-current" />
              </a>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
