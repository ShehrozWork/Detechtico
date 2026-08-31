"use client";

import { useEffect, useState } from "react";
import { testimonials } from "@/data/platform";
import { cn } from "@/utils/cn";

const ROTATE_MS = 5500;

export function AuthQuotes() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setVisible(false);

      window.setTimeout(() => {
        setIndex((current) => (current + 1) % testimonials.length);
        setVisible(true);
      }, 280);
    }, ROTATE_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  const active = testimonials[index];

  return (
    <aside className="relative hidden h-full overflow-hidden bg-primary lg:sticky lg:top-0 lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14">
      <div>
        <p className="text-[13px] font-semibold tracking-[0.14em] text-primary-pale uppercase">
          Trusted by professionals
        </p>
        <p className="mt-3 max-w-[22rem] text-[1.35rem] font-bold tracking-[-0.3px] leading-snug text-white xl:text-[1.55rem]">
          Financial analysis that shows you why — not just what.
        </p>
      </div>

      <div className="mt-auto max-w-[28rem]">
        <blockquote
          className={cn(
            "transition-all duration-300 ease-out",
            visible
              ? "translate-y-0 opacity-100"
              : "translate-y-2 opacity-0",
          )}
        >
          <p className="text-[1.15rem] font-light leading-[1.75] text-primary-pale xl:text-[1.25rem]">
            &ldquo;{active.quote}&rdquo;
          </p>
          {active.name && (
            <footer className="mt-8 border-t border-white/20 pt-5">
              <cite className="not-italic">
                <span className="block text-[15px] font-semibold text-white">
                  {active.name}
                </span>
                <span className="mt-1 block text-[13px] text-primary-tint">
                  {active.role}
                </span>
              </cite>
            </footer>
          )}
        </blockquote>

        <div className="mt-8 flex gap-2" aria-hidden="true">
          {testimonials.map((item, dotIndex) => (
            <span
              key={item.quote}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                dotIndex === index
                  ? "w-6 bg-white"
                  : "w-1.5 bg-white/35",
              )}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
