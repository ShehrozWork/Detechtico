import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

type PanelProps = {
  children: ReactNode;
  className?: string;
};

export function Panel({ children, className = "" }: PanelProps) {
  return (
    <div
      className={cn(
        "rounded-[14px] border border-hairline bg-white",
        className,
      )}
    >
      {children}
    </div>
  );
}
