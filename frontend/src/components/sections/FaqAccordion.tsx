"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { faqItems } from "@/data/faq";

function withBoldBrand(text: string): ReactNode {
  const parts = text.split(/(Detechtico)/g);
  return parts.map((part, index) =>
    part === "Detechtico" ? (
      <b key={index} className="font-bold">
        Detechtico
      </b>
    ) : (
      part
    ),
  );
}

export function FaqAccordion() {
  const [openItems, setOpenItems] = useState<number[]>([0]);

  const toggle = (index: number) =>
    setOpenItems((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );

  return (
    <ul className="border-t border-hairline">
      {faqItems.map((item, index) => {
        const isOpen = openItems.includes(index);
        return (
          <li key={item.question} className="border-b border-hairline">
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`faq-answer-${index}`}
              onClick={() => toggle(index)}
              className="flex w-full items-start justify-between gap-6 px-2 py-5.5 text-left text-[15px] transition-colors hover:text-primary-hover"
            >
              {item.question}
              <Icon
                name="chevron-down"
                className={`h-5 w-5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen && (
              <p
                id={`faq-answer-${index}`}
                className="px-2 pb-5.5 text-sm leading-[1.8] text-body"
              >
                {withBoldBrand(item.answer)}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
