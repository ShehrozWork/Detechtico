"use client";

import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { useTrialHref } from "@/hooks/useTrialHref";

export function JoinCTA() {
  const trialHref = useTrialHref();

  return (
    <section className="bg-primary-deep py-14 sm:py-17.5">
      <Container>
        <div className="flex flex-col items-center justify-between gap-8 sm:flex-row sm:items-center">
          <div className="max-w-[40rem] text-center sm:text-left">
            <h2 className="text-[26px] font-bold text-white sm:text-[32px]">
              Join <b>Detechtico</b> Today
            </h2>
            <p className="mt-3 text-sm font-light leading-[1.75] text-primary-pale">
              Start your 3-day free trial and get explainable financial analysis your
              team can trust — no credit card required.
            </p>
          </div>
          <Link
            href={trialHref}
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary-soft px-9.5 py-4.5 text-lg font-semibold text-[#052733] transition-colors hover:bg-[#45d5f0]"
          >
            Join Now
          </Link>
        </div>
      </Container>
    </section>
  );
}
