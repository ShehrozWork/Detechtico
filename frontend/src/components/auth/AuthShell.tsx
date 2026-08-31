import type { ReactNode } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/ui/LogoMark";
import { AuthQuotes } from "@/components/auth/AuthQuotes";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="bg-canvas lg:grid lg:h-dvh lg:grid-cols-2 lg:overflow-hidden">
      <AuthQuotes />

      <div className="flex min-h-dvh flex-col lg:h-full lg:min-h-0 lg:overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[18px] font-bold tracking-tight text-ink"
          >
            <LogoMark size={32} priority />
            Detechtico
          </Link>
          <Link
            href="/"
            className="text-[13.5px] font-medium text-body transition-colors hover:text-primary-hover"
          >
            Back to home
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
          <div className="w-full max-w-[24rem]">
            <div>
              <p className="text-[13px] font-semibold tracking-[0.14em] text-primary uppercase">
                {eyebrow}
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-[-0.5px] text-ink sm:text-[2.15rem]">
                {title}
              </h1>
              <p className="mt-3 text-[15px] font-light leading-[1.7] text-subtle">
                {description}
              </p>
            </div>

            <div className="mt-8">{children}</div>
            <div className="mt-6">{footer}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
