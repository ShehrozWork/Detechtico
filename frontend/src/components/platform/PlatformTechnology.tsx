"use client";

import { useEffect, useState } from "react";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { technologyTopics } from "@/data/platform";
import { cn } from "@/utils/cn";

const AUTO_ADVANCE_MS = 5000;

export function PlatformTechnology() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = technologyTopics[activeIndex] ?? technologyTopics[0];

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % technologyTopics.length);
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(timer);
  }, [activeIndex]);

  return (
    <section id="technology" className="bg-canvas py-20 sm:py-32">
      <Container>
        {/* Centered Header Structure */}
        <div className="mx-auto flex max-w-[54rem] flex-col items-center text-center">
          <p className="text-[13px] font-bold tracking-widest text-primary uppercase">
            Advanced Technology
          </p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            Financial Crime Detection Platform
          </h2>
          <p className="mt-6 text-lg font-light leading-relaxed text-subtle sm:text-xl">
            <b className="font-bold text-ink">Detechtico</b> combines
            cutting-edge techniques with advanced cryptography and machine
            learning to deliver the most sophisticated financial fraud detection
            system available to financial institutions and corporate compliance
            teams.
          </p>
        </div>

        {/* Structural Divider */}
        <div className="mt-20 border-t border-hairline pt-12">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            {/* Minimalist Vertical Navigation */}
            <aside className="lg:col-span-4">
              <div className="flex flex-col gap-2">
                {technologyTopics.map((topic, index) => {
                  const isActive = index === activeIndex;
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className={cn(
                        "group relative flex items-center justify-between px-5 py-4 text-left text-base transition-all",
                        isActive ? "text-ink" : "text-subtle hover:text-body",
                      )}
                    >
                      {/* Architectural active line indicator */}
                      <span
                        className={cn(
                          "absolute left-0 top-0 h-full w-[3px] bg-primary transition-all duration-300",
                          isActive
                            ? "scale-y-100 opacity-100"
                            : "scale-y-0 opacity-0",
                        )}
                      />
                      <span
                        className={cn(isActive ? "font-bold" : "font-medium")}
                      >
                        {topic.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Content Area */}
            <div className="lg:col-span-8">
              <div
                key={active.id ?? active.title}
                className="animate-in fade-in duration-700 ease-out"
              >
                <h3 className="text-3xl font-bold tracking-tight text-ink">
                  {active.title}
                </h3>
                <p className="mt-5 max-w-3xl text-lg font-light leading-relaxed text-body">
                  {active.description}
                </p>

                <div className="mt-12">
                  <h4 className="text-xs font-bold tracking-[0.15em] text-ink uppercase">
                    Key Capabilities
                  </h4>

                  {/* Data-sheet style list */}
                  <ul className="mt-6 grid gap-6 sm:grid-cols-2 sm:gap-x-12 sm:gap-y-8">
                    {active.benefits.map((benefit) => (
                      <li
                        key={benefit}
                        className="flex items-start gap-4 border-t border-hairline/60 pt-5 text-base leading-relaxed text-body"
                      >
                        <Icon
                          name="check"
                          className="mt-1 h-4 w-4 shrink-0 text-primary"
                          strokeWidth={3}
                        />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
