import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import Link from "next/link";
import { cn } from "@/utils/cn";

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-ink text-white hover:bg-black border-transparent",
  accent:
    "bg-primary text-white hover:bg-primary-hover border-transparent",
  secondary:
    "bg-white text-ink border-line hover:border-ink",
  ghost: "bg-transparent text-body border-transparent hover:text-ink hover:bg-surface",
  danger:
    "bg-white text-[#9f1239] border-[#fecdd3] hover:border-[#9f1239]",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-4 py-2 text-[13.5px]",
  md: "px-5 py-2.5 text-[14.5px]",
};

type CommonProps = {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
};

type AsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type AsLink = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    href: string;
  };

type ActionButtonProps = AsButton | AsLink;

export function ActionButton({
  children,
  variant = "primary",
  size = "md",
  className = "",
  href,
  ...rest
}: ActionButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-[10px] border font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50",
    variantStyles[variant],
    sizeStyles[size],
    className,
  );

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        {...(rest as Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">)}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      className={classes}
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
}
