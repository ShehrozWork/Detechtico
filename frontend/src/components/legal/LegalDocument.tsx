import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import type { LegalPageContent } from "@/data/legal";

function withInlineLinks(text: string): ReactNode {
  const parts = text.split(
    /(Detechtico|detechtico@gmail\.com|security@detechtico\.com|Trust & Security)/g,
  );
  return parts.map((part, index) => {
    if (part === "Detechtico") {
      return (
        <b key={index} className="font-bold text-ink">
          Detechtico
        </b>
      );
    }
    if (part === "detechtico@gmail.com") {
      return (
        <a
          key={index}
          href="mailto:detechtico@gmail.com"
          className="font-semibold text-primary-hover transition-colors hover:text-primary"
        >
          detechtico@gmail.com
        </a>
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
    if (part === "Trust & Security") {
      return (
        <a
          key={index}
          href="/trust"
          className="font-semibold text-primary-hover transition-colors hover:text-primary"
        >
          Trust &amp; Security
        </a>
      );
    }
    return part;
  });
}

type LegalDocumentProps = {
  content: LegalPageContent;
};

export function LegalDocument({ content }: LegalDocumentProps) {
  return (
    <section className="bg-canvas py-16 sm:py-22">
      <Container>
        <div className="mx-auto max-w-[48rem]">
          <div className="text-center">
            <p className="text-[13px] font-semibold tracking-[0.14em] text-primary uppercase">
              {content.eyebrow}
            </p>
            <h1 className="mt-3 text-5xl font-bold tracking-[-0.5px] text-ink">
              {content.title}
            </h1>
            <p className="mt-4 text-lg font-light leading-[1.8] text-subtle">
              {withInlineLinks(content.description)}
            </p>
            <p className="mt-5 text-sm text-subtle">
              Last updated: {content.lastUpdated}
            </p>
          </div>

          <div className="mt-14 divide-y divide-hairline border-y border-hairline">
            {content.sections.map((section) => (
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
