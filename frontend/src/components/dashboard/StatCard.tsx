import { cn } from "@/utils/cn";
import { Panel } from "@/components/dashboard/Panel";

type StatCardProps = {
  label: string;
  value: string;
  className?: string;
};

export function StatCard({ label, value, className = "" }: StatCardProps) {
  return (
    <Panel className={cn("px-5 py-5 text-center", className)}>
      <p className="text-3xl font-bold tracking-tight text-ink">{value}</p>
      <p className="mt-1.5 text-[13px] font-medium text-subtle">{label}</p>
    </Panel>
  );
}
