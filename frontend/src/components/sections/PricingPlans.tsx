"use client";

import { useState, type ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import {
  type BillingPeriod,
  pricingPlans,
} from "@/data/pricing";
import { useTrialHref } from "@/hooks/useTrialHref";
import { cn } from "@/utils/cn";

type PricingPlansProps = {
  variant?: "subscribe" | "platform";
  title?: ReactNode;
  description?: string;
  showSalesNote?: boolean;
};

export function PricingPlans({
  variant = "subscribe",
  title,
  description,
  showSalesNote = variant === "subscribe",
}: PricingPlansProps) {
  const [billing, setBilling] = useState<BillingPeriod>("annual");
  const trialHref = useTrialHref();

  const heading =
    title ?? (
      <>
        Subscribe to Access <b>Detechtico</b>
      </>
    );

  const lead =
    description ??
    "Select one of our subscription plans to access all features including sign-in, registration and dashboard.";

  return (
    <section id="pricing" className="bg-canvas py-14 sm:py-20">
      <Container>
        <div className="mx-auto max-w-[42rem] text-center">
          {variant === "platform" && (
            <p className="text-[13px] font-semibold tracking-[0.14em] text-primary uppercase">
              Subscription Required
            </p>
          )}
          <h1
            className={cn(
              "font-bold tracking-[-0.5px] text-ink",
              variant === "platform"
                ? "mt-3 text-5xl"
                : "text-[28px] sm:text-[36px]",
            )}
          >
            {heading}
          </h1>
          <p
            className={cn(
              "mt-4 font-light leading-[1.75] text-subtle",
              variant === "platform" ? "text-lg" : "text-[15px]",
            )}
          >
            {lead}
          </p>
        </div>

        <div className="mt-10 flex justify-center">
          <div
            className="inline-flex rounded-full bg-surface p-1.5"
            role="group"
            aria-label="Billing period"
          >
            <button
              type="button"
              aria-pressed={billing === "monthly"}
              onClick={() => setBilling("monthly")}
              className={cn(
                "rounded-full px-5 py-2.5 text-[14.5px] font-semibold transition-colors",
                billing === "monthly"
                  ? "bg-ink text-white"
                  : "text-body hover:text-ink",
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              aria-pressed={billing === "annual"}
              onClick={() => setBilling("annual")}
              className={cn(
                "rounded-full px-5 py-2.5 text-[14.5px] font-semibold transition-colors",
                billing === "annual"
                  ? "bg-ink text-white"
                  : "text-body hover:text-ink",
              )}
            >
              Annual{" "}
              <span
                className={cn(
                  "ml-1 text-[12.5px] font-semibold",
                  billing === "annual" ? "text-primary-soft" : "text-primary",
                )}
              >
                Save 15%
              </span>
            </button>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-3">
          {pricingPlans.map((plan) => {
            const price = plan.prices[billing];
            const periodLabel = billing === "annual" ? "/year" : "/month";
            const billedLabel =
              billing === "annual" ? "Billed annually." : "Billed monthly.";
            const primaryCta =
              variant === "platform" && plan.platformCta
                ? plan.platformCta
                : plan.cta;

            return (
              <article
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-[18px] border bg-white p-7 sm:p-8",
                  plan.popular
                    ? "border-primary shadow-[0_18px_40px_rgba(13,127,158,0.14)] lg:-mt-3 lg:mb-[-0.75rem] lg:pt-10"
                    : "border-hairline",
                )}
              >
                {plan.popular && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary px-3.5 py-1 text-[11px] font-semibold tracking-[0.04em] text-white uppercase">
                    Most Popular
                  </span>
                )}

                <div>
                  <h2 className="text-[22px] font-bold text-ink">{plan.name}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-subtle">
                    {plan.tagline}
                  </p>
                </div>

                <div className="mt-6 border-b border-hairline pb-6">
                  <div className="flex items-end gap-1">
                    <span className="text-[40px] font-bold tracking-[-1px] text-ink">
                      {price}
                    </span>
                    <span className="mb-2 text-sm text-subtle">{periodLabel}</span>
                  </div>
                  <p className="mt-1 text-[13px] text-subtle">{billedLabel}</p>
                </div>

                <ul className="mt-6 flex flex-1 flex-col gap-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-[14px] leading-snug text-body"
                    >
                      <Icon
                        name="check"
                        className="mt-0.5 h-4.5 w-4.5 shrink-0 text-primary"
                        strokeWidth={2.4}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="mt-8 flex flex-col gap-3">
                  <a
                    href={primaryCta.trial ? trialHref : primaryCta.href}
                    className={cn(
                      "inline-flex items-center justify-center rounded-full px-6 py-3.5 text-[15px] font-semibold transition-colors",
                      plan.popular
                        ? "bg-primary text-white hover:bg-primary-hover"
                        : "bg-ink text-white hover:bg-black",
                    )}
                  >
                    {primaryCta.label}
                  </a>
                  {plan.secondaryCta && (
                    <a
                      href={
                        plan.secondaryCta.trial
                          ? trialHref
                          : plan.secondaryCta.href
                      }
                      className="inline-flex items-center justify-center rounded-full border border-line px-6 py-3 text-[14.5px] font-medium text-ink transition-colors hover:border-ink"
                    >
                      {plan.secondaryCta.label}
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {showSalesNote && (
          <p className="mt-12 text-center text-sm text-subtle">
            Questions? Contact our sales team at{" "}
            <a
              href="mailto:detechtico@gmail.com"
              className="font-semibold text-primary-hover transition-colors hover:text-primary"
            >
              detechtico@gmail.com
            </a>
          </p>
        )}
      </Container>
    </section>
  );
}
