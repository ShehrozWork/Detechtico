"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { adminNavItems } from "@/data/admin";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/utils/cn";

type AdminShellProps = {
  children: ReactNode;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const html = document.documentElement;
    const { body } = document;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, []);

  const handleSignOut = async () => {
    await logout();
    router.push("/login");
  };

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {adminNavItems.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] font-medium transition-colors",
              active
                ? "bg-sunken font-semibold text-primary-deep"
                : "text-body hover:bg-surface hover:text-ink",
            )}
          >
            <Icon name={item.icon} className="h-4.5 w-4.5" strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[17.5rem] flex-col border-r border-hairline bg-white transition-transform lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="border-b border-hairline px-5 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle">
            Platform ops
          </p>
          <p className="mt-1 text-[17px] font-bold tracking-[-0.3px] text-ink">Admin</p>
          <p className="mt-1 truncate text-[13px] text-subtle">
            {user?.email} · {user?.staff_role}
          </p>
        </div>
        {nav}
        <div className="border-t border-hairline p-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] font-medium text-body hover:bg-surface hover:text-ink"
          >
            <Icon name="log-out" className="h-4.5 w-4.5" strokeWidth={2} />
            Sign out
          </button>
        </div>
      </aside>

      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-ink/30 lg:hidden"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="flex h-dvh min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:pl-[17.5rem]">
        <header className="z-20 shrink-0 border-b border-hairline bg-canvas/95 backdrop-blur-sm lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink"
              aria-label="Open sidebar"
              onClick={() => setSidebarOpen(true)}
            >
              <Icon name="menu" className="h-5 w-5" strokeWidth={2} />
            </button>
            <p className="truncate text-[15px] font-semibold text-ink">Admin</p>
            <span className="w-10" />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
