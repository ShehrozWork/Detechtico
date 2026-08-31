import { Container } from "@/components/ui/Container";

export function PlatformEnterprise() {
  return (
    <section id="enterprise" className="bg-primary-deep py-16 sm:py-18">
      <Container>
        <div className="flex flex-col items-start justify-between gap-8 rounded-[18px] border border-white/12 bg-white/5 px-7 py-9 sm:flex-row sm:items-center sm:px-10">
          <div className="max-w-[42rem]">
            <p className="text-[13px] font-semibold tracking-[0.14em] text-primary-soft uppercase">
              Enterprise
            </p>
            <h2 className="mt-3 text-5xl font-bold text-white">
              Need a custom solution?
            </h2>
            <p className="mt-3 text-lg font-light leading-[1.75] text-primary-pale">
              Tailored fraud detection, forensic accounting, and compliance
              workflows for your organization. Talk to our sales team.
            </p>
          </div>
          <a
            href="mailto:detechtico@gmail.com"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary-soft px-8 py-4 text-[16px] font-semibold text-[#052733] transition-colors hover:bg-[#45d5f0]"
          >
            Contact Sales
          </a>
        </div>
      </Container>
    </section>
  );
}
