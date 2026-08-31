"use client";

import { useState, type FormEvent } from "react";
import { Container } from "@/components/ui/Container";

export function PlatformContact() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <section id="contact" className="bg-primary-tint/40 py-16 sm:py-22">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-[13px] font-semibold tracking-[0.14em] text-primary uppercase">
              Get in Touch
            </p>
            <h2 className="mt-3 text-5xl font-bold tracking-[-0.5px] text-ink">
              Ready to Secure Your Financial System?
            </h2>
            <p className="mt-4 text-lg font-light leading-[1.8] text-subtle">
              Contact our team to learn how{" "}
              <b className="font-bold text-ink">Detechtico</b> can help protect
              your organization from financial fraud and ensure regulatory
              compliance.
            </p>

            <dl className="mt-10 space-y-5">
              <div>
                <dt className="text-[12px] font-semibold tracking-[0.1em] text-primary uppercase">
                  Email
                </dt>
                <dd className="mt-1.5">
                  <a
                    href="mailto:detechtico@gmail.com"
                    className="text-[15px] font-semibold text-ink transition-colors hover:text-primary-hover"
                  >
                    detechtico@gmail.com
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-[12px] font-semibold tracking-[0.1em] text-primary uppercase">
                  Address
                </dt>
                <dd className="mt-1.5 text-[15px] text-body">Erie, PA 16502</dd>
              </div>
            </dl>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-[16px] border border-hairline bg-white p-6 sm:p-8"
          >
            <h3 className="text-[18px] font-bold text-ink">
              Send us a message
            </h3>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-body">
                Name
                <input
                  required
                  name="name"
                  type="text"
                  className="mt-2 w-full rounded-[10px] border border-line bg-canvas px-3.5 py-3 text-[14.5px] text-ink outline-none transition-colors focus:border-primary"
                />
              </label>
              <label className="block text-sm font-medium text-body">
                Email
                <input
                  required
                  name="email"
                  type="email"
                  className="mt-2 w-full rounded-[10px] border border-line bg-canvas px-3.5 py-3 text-[14.5px] text-ink outline-none transition-colors focus:border-primary"
                />
              </label>
            </div>

            <label className="mt-4 block text-sm font-medium text-body">
              Company
              <input
                name="company"
                type="text"
                className="mt-2 w-full rounded-[10px] border border-line bg-canvas px-3.5 py-3 text-[14.5px] text-ink outline-none transition-colors focus:border-primary"
              />
            </label>

            <label className="mt-4 block text-sm font-medium text-body">
              Message
              <textarea
                required
                name="message"
                rows={5}
                className="mt-2 w-full resize-y rounded-[10px] border border-line bg-canvas px-3.5 py-3 text-[14.5px] text-ink outline-none transition-colors focus:border-primary"
              />
            </label>

            <button
              type="submit"
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-ink px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-black sm:w-auto"
            >
              Send Message
            </button>

            {submitted && (
              <p className="mt-4 text-sm text-primary" role="status">
                Thanks — your message has been noted. We&apos;ll be in touch.
              </p>
            )}
          </form>
        </div>
      </Container>
    </section>
  );
}
