"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { useAuth } from "@/context/AuthContext";

type DashboardShellProps = {
  children: ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
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

  useEffect(() => {
    if (!sidebarOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen]);

  const handleSignOut = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      <DashboardSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex h-dvh min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:pl-[17.5rem]">
        <header className="z-30 shrink-0 border-b border-hairline bg-canvas/95 backdrop-blur-sm lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink transition-colors hover:border-ink"
              aria-expanded={sidebarOpen}
              aria-label="Open sidebar"
              onClick={() => setSidebarOpen(true)}
            >
              <Icon name="menu" className="h-5 w-5" strokeWidth={2} />
            </button>
            <p className="truncate text-[15px] font-semibold text-ink">
              Dashboard
            </p>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink transition-colors hover:border-ink"
              aria-label="Sign out"
              onClick={handleSignOut}
            >
              <Icon name="log-out" className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 p-2 lg:pl-0">
          <main className="h-full overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="scrollbar-thin-surface h-full overflow-y-auto py-6 sm:py-8 lg:py-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
