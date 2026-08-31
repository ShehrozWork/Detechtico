import { cn } from "@/utils/cn";

type RiskGaugeProps = {
  score: number;
  size?: "sm" | "md";
};

export function RiskGauge({ score, size = "md" }: RiskGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const dim = size === "sm" ? "h-14 w-14" : "h-16 w-16";
  const inner = size === "sm" ? "h-[42px] w-[42px] text-[14px]" : "h-[50px] w-[50px] text-[16px]";

  return (
    <div
      className={cn("grid shrink-0 place-items-center rounded-full", dim)}
      style={{
        background: `conic-gradient(#0d7f9e 0 ${clamped}%, #e6e8ea ${clamped}% 100%)`,
      }}
      aria-label={`Risk score ${clamped}%`}
    >
      <div
        className={cn(
          "grid place-items-center rounded-full bg-white font-bold text-ink",
          inner,
        )}
      >
        {clamped}%
      </div>
    </div>
  );
}
