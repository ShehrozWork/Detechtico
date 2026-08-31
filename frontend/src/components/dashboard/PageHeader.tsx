import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

type PageHeaderProps = {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
};

export function PageHeader({
  title,
  description,
  backHref,
  backLabel = "Back to Dashboard",
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {backHref ? (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-primary transition-colors hover:text-primary-hover"
          >
            <Icon name="arrow-left" className="h-4 w-4" strokeWidth={2} />
            {backLabel}
          </Link>
        ) : null}
        <h1
          className={`text-3xl font-bold tracking-[-0.5px] text-ink sm:text-[2rem] ${backHref ? "mt-3" : ""}`}
        >
          {title}
        </h1>
        <p className="mt-2 max-w-[54ch] text-[15px] font-light leading-[1.7] text-subtle">
          {description}
        </p>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
