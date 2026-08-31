import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { trustIntro, trustSections } from "@/data/trust";

function withInlineLinks(text: string): ReactNode {
  const parts = text.split(/(Detechtico|security@detechtico\.com)/g);
  return parts.map((part, index) => {
    if (part === "Detechtico") {
      return (
        <b key={index} className="font-bold text-ink">
          Detechtico
        </b>
      );
    }
    if (part === "security@detechtico.com") {
      return (
        <a
          key={index}
          href="mailto:security@detechtico.com"
          className="font-semibold text-primary-hover transition-colors hover:text-primary"
        >
          security@detechtico.com
        </a>
      );
    }
    return part;
  });
}

export function TrustContent() {
  return (
    <section className="bg-canvas py-16 sm:py-22">
      <Container>
        <div className="mx-auto max-w-[48rem]">
          <div className="text-center">
            <p className="text-[13px] font-semibold tracking-[0.14em] text-primary uppercase">
              Trust &amp; Security
            </p>
            <h1 className="mt-3 text-5xl font-bold tracking-[-0.5px] text-ink">
              {trustIntro.title}
            </h1>
            <p className="mt-4 text-lg font-light leading-[1.8] text-subtle">
              {withInlineLinks(trustIntro.description)}
            </p>
            <p className="mt-5 text-sm text-subtle">
              Last updated: {trustIntro.lastUpdated}
            </p>
          </div>

          <div className="mt-14 divide-y divide-hairline border-y border-hairline">
            {trustSections.map((section) => (
              <article key={section.title} className="py-10 sm:py-12">
                <h2 className="text-[28px] font-bold tracking-[-0.4px] text-ink">
                  {section.title}
                </h2>
                <p className="mt-4 text-lg font-light leading-[1.85] text-body">
                  {withInlineLinks(section.body)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
