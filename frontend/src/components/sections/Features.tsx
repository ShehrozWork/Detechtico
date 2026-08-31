import { Container } from "@/components/ui/Container";
import { features } from "@/data/features";

export function Features() {
  return (
    <section id="features" className="bg-primary py-16 sm:py-20">
      <Container>
        <div className="rounded-[14px] border border-white/35 px-6 py-10 sm:px-11.5 sm:py-15">
          <h2 className="text-center text-[28px] font-semibold tracking-[-0.3px] text-primary-pale sm:text-[38px]">
            Why choose <b className="font-bold">Detechtico</b>?
          </h2>
          <div className="mx-auto mt-4 max-w-[78%] border-t border-white/50" />
          <h3 className="mt-8 text-center text-2xl font-bold text-white sm:text-[26px]">
            Built Different. Built Transparent.
          </h3>
          <p className="mx-auto mt-3 max-w-[58ch] text-center text-[14.5px] font-light leading-[1.8] text-primary-tint">
            Every feature is designed to give accountants, auditors, and
            compliance teams full visibility and control over financial
            statement analysis.
          </p>

          <div className="mt-9 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-[11px] bg-primary-mid px-6 py-6.5 pb-7.5"
              >
                <h3 className="mb-3.5 text-[19px] font-semibold leading-[1.28] text-primary-pale">
                  {feature.title}
                </h3>
                <p className="text-[13px] font-light leading-[1.75] text-primary-tint">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
