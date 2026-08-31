import { Container } from "@/components/ui/Container";
import { testimonials } from "@/data/platform";

export function PlatformTestimonials() {
  return (
    <section id="testimonials" className="bg-primary py-16 sm:py-22">
      <Container>
        <div className="mx-auto max-w-[48rem] text-center">
          <h2 className="text-5xl font-bold tracking-[-0.5px] text-white">
            Trusted by Forensic Professionals
          </h2>
          <p className="mt-4 text-lg font-light leading-[1.8] text-primary-tint">
            See why investigators, compliance teams, and financial institutions
            choose transparent fraud detection.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {testimonials.map((item) => (
            <blockquote
              key={item.quote}
              className="flex flex-col rounded-[14px] bg-primary-mid/40 p-6.5"
            >
              <p className="flex-1 text-[14.5px] font-light leading-[1.8] text-primary-pale">
                &ldquo;{item.quote}&rdquo;
              </p>
              {item.name && (
                <footer className="mt-6 border-t border-white/20 pt-5">
                  <cite className="not-italic">
                    <span className="block text-[15px] font-semibold text-white">
                      {item.name}
                    </span>
                    <span className="mt-1 block text-[13px] text-primary-tint">
                      {item.role}
                    </span>
                  </cite>
                </footer>
              )}
            </blockquote>
          ))}
        </div>
      </Container>
    </section>
  );
}
