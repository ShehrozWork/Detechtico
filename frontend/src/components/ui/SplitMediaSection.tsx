import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { cn } from "@/utils/cn";

type SplitMediaSectionProps = {
  media: ReactNode;
  children: ReactNode;
  className?: string;
  mediaOnRight?: boolean;
  id?: string;
};

export function SplitMediaSection({
  media,
  children,
  className,
  mediaOnRight = false,
  id,
}: SplitMediaSectionProps) {
  return (
    <section id={id} className={cn("py-12 sm:py-16 lg:py-22", className)}>
      <Container>
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          <div
            className={cn(
              "relative aspect-[4/3] w-full overflow-hidden rounded-[18px] sm:aspect-[16/11] lg:aspect-auto lg:min-h-[28rem] xl:min-h-[32rem]",
              mediaOnRight ? "lg:order-2" : "lg:order-1",
            )}
          >
            {media}
          </div>
          <div
            className={cn(
              "w-full max-w-xl",
              mediaOnRight ? "lg:order-1" : "lg:order-2",
              mediaOnRight ? "lg:mr-auto" : "lg:ml-auto",
            )}
          >
            {children}
          </div>
        </div>
      </Container>
    </section>
  );
}
