import { Container } from "@/components/ui/Container";
import { FaqAccordion } from "@/components/sections/FaqAccordion";

export function FAQ() {
  return (
    <section id="faq" className="bg-canvas py-16 sm:py-22">
      <Container>
        <div className="mx-auto max-w-[48rem] text-center">
          <p className="text-[13px] font-semibold tracking-[0.14em] text-primary uppercase">
            FAQs
          </p>
          <h1 className="mt-3 text-5xl font-bold tracking-[-0.5px] text-ink">
            Frequently Asked Questions
          </h1>
          <p className="mt-4 text-lg font-light leading-[1.8] text-subtle">
            Quick answers about <b className="font-bold text-ink">Detechtico</b>
            , integrations, trials, and how our analysis works. Still need help?{" "}
            <a href="/contact" className="font-semibold text-primary-hover">
              Contact us
            </a>
            .
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-[48rem]">
          <FaqAccordion />
        </div>
      </Container>
    </section>
  );
}
