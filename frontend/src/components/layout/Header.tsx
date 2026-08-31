"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/ui/LogoMark";
import { Icon } from "@/components/ui/Icon";
import { navLinks } from "@/data/nav";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/utils/cn";

export function Header() {
  const pathname = usePathname();
  const { isLoggedIn, isReady } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const accountHref = isReady && isLoggedIn ? "/dashboard" : "/login";
  const accountLabel = isReady && isLoggedIn ? "Dashboard" : "Log in";

  return (
    <header className="relative z-50 bg-canvas py-3.5 sm:py-4.5">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 text-[20px] font-bold tracking-tight text-ink sm:gap-2.5 sm:text-[25px]"
          onClick={() => setMenuOpen(false)}
        >
          <LogoMark size={40} priority />
          <span className="truncate">Detechtico</span>
        </Link>

        <nav
          className="hidden items-center overflow-auto rounded-full bg-surface px-2.5 py-2 lg:flex"
          aria-label="Primary"
        >
          {navLinks.map((link, index) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname === link.href ||
                  pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "whitespace-nowrap px-3.5 py-0.5 text-[14.5px] leading-tight transition-colors sm:px-4",
                  isActive
                    ? "font-semibold text-primary-hover"
                    : "text-body hover:text-primary-hover",
                  index !== navLinks.length - 1 ? "border-r border-line" : "",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            href={accountHref}
            className="hidden text-[14.5px] font-semibold text-body transition-colors hover:text-primary-hover sm:inline-flex sm:text-[15px]"
          >
            {accountLabel}
          </Link>
          <Link
            href="/subscribe"
            className="hidden rounded-full bg-ink px-5 py-2.5 text-[14.5px] font-semibold text-white transition-colors hover:bg-black sm:inline-flex sm:px-6 sm:text-[15px]"
          >
            Subscribe
          </Link>

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink transition-colors hover:border-ink lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name={menuOpen ? "x" : "menu"} className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "fixed inset-0 top-[4.25rem] z-40 bg-ink/35 transition-opacity lg:hidden",
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!menuOpen}
        onClick={() => setMenuOpen(false)}
      />

      <div
        id="mobile-nav"
        className={cn(
          "absolute inset-x-0 top-full z-50 border-b border-hairline bg-canvas px-5 pb-5 pt-2 shadow-[0_18px_40px_rgba(11,18,32,0.12)] transition-all lg:hidden",
          menuOpen
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-2 opacity-0",
        )}
      >
        <nav aria-label="Mobile" className="flex flex-col rounded-[16px] bg-surface p-2">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname === link.href ||
                  pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-[12px] px-4 py-3.5 text-[15px] transition-colors",
                  isActive
                    ? "bg-white font-semibold text-primary-hover shadow-sm"
                    : "text-body hover:bg-white/70 hover:text-primary-hover",
                )}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href={accountHref}
          className="mt-3 flex items-center justify-center rounded-full border border-line bg-white px-6 py-3.5 text-[15px] font-semibold text-ink transition-colors hover:border-ink sm:hidden"
          onClick={() => setMenuOpen(false)}
        >
          {accountLabel}
        </Link>
        <Link
          href="/subscribe"
          className="mt-2 flex items-center justify-center rounded-full bg-ink px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-black sm:hidden"
          onClick={() => setMenuOpen(false)}
        >
          Subscribe
        </Link>
      </div>
    </header>
  );
}
