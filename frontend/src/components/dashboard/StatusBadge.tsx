import { cn } from "@/utils/cn";
import type { ReviewStatus } from "@/data/dashboard";

const styles: Record<ReviewStatus, string> = {
  flagged: "bg-amber-100 text-amber-900",
  review: "bg-primary-pale text-primary-deep",
  clear: "bg-emerald-100 text-emerald-900",
};

const labels: Record<ReviewStatus, string> = {
  flagged: "FLAGGED",
  review: "REVIEW",
  clear: "CLEAR",
};

type StatusBadgeProps = {
  status: ReviewStatus;
  className?: string;
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-semibold tracking-[0.04em]",
        styles[status],
        className,
      )}
    >
      {labels[status]}
    </span>
  );
}
