import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "@/components/dashboard/Panel";
import type { DashboardModule } from "@/data/dashboard";

type ModuleCardProps = {
  module: DashboardModule;
  meta?: string;
};

export function ModuleCard({ module, meta }: ModuleCardProps) {
  return (
    <Link href={module.href} className="group block h-full">
      <Panel className="flex h-full flex-col p-6 transition-colors group-hover:border-primary/40">
        <div className="grid h-10 w-10 place-items-center rounded-[10px] bg-sunken text-primary">
          <Icon name={module.icon} className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <h2 className="mt-4 text-[18px] font-semibold text-ink">
          {module.title}
        </h2>
        <p className="mt-2 flex-1 text-[14px] font-light leading-[1.7] text-body">
          {module.description}
        </p>
        {meta ? (
          <p className="mt-3 text-[12.5px] font-medium text-subtle">{meta}</p>
        ) : null}
        <span className="mt-5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-primary-hover transition-colors group-hover:text-primary">
          Open
          <Icon name="arrow-right" className="h-4 w-4" strokeWidth={2} />
        </span>
      </Panel>
    </Link>
  );
}
