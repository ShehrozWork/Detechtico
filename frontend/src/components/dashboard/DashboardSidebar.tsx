"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogoMark } from "@/components/ui/LogoMark";
import { Icon } from "@/components/ui/Icon";
import { dashboardNavItems } from "@/data/dashboard";
import { useAuth } from "@/context/AuthContext";
import { TrialCountdown } from "@/components/dashboard/TrialCountdown";
import { cn } from "@/utils/cn";

type DashboardSidebarProps = {
  open: boolean;
  onClose: () => void;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebar({ open, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const handleSignOut = async () => {
    await logout();
    onClose();
    router.push("/login");
  };

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-ink/40 transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!open}
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-dvh w-[17.5rem] flex-col bg-canvas transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Dashboard"
      >
        <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2.5 text-ink"
            onClick={onClose}
          >
            <LogoMark size={34} priority />
            <span className="min-w-0">
              <span className="block truncate text-[17px] font-bold tracking-tight">
                Detechtico
              </span>
              <span className="block truncate text-[11.5px] font-light text-subtle">
                Fraud detection
              </span>
            </span>
          </Link>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-ink lg:hidden"
            aria-label="Close sidebar"
            onClick={onClose}
          >
            <Icon name="x" className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <nav
          className="scrollbar-thin-surface flex-1 overflow-y-auto px-3 py-4"
          aria-label="Dashboard pages"
        >
          <p className="px-3 pb-2 text-[11px] font-semibold tracking-[0.12em] text-subtle uppercase">
            Workspace
          </p>
          <ul className="space-y-1">
            {dashboardNavItems.map((item) => {
              const active = isActivePath(pathname, item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] font-medium transition-colors",
                      active
                        ? "bg-sunken font-semibold text-primary-deep"
                        : "text-body hover:bg-surface hover:text-ink",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon
                      name={item.icon}
                      className={cn(
                        "h-[18px] w-[18px] shrink-0",
                        active ? "text-primary" : "text-subtle",
                      )}
                      strokeWidth={1.75}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-hairline p-4">
          <div className="mb-3">
            <TrialCountdown />
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] border border-line bg-white px-4 py-2.5 text-[13.5px] font-semibold text-body transition-colors hover:border-ink hover:text-ink"
          >
            <Icon name="log-out" className="h-4 w-4" strokeWidth={2} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
