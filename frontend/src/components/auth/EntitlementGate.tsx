"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";

const ALLOWED_WHEN_LOCKED = new Set(["/dashboard/billing", "/dashboard/settings"]);

export function EntitlementGate({ children }: { children: ReactNode }) {
  const { user, isReady } = useAuth();
  const pathname = usePathname();

  if (!isReady || !user) return children;
  if (user.entitled) return children;
  if (ALLOWED_WHEN_LOCKED.has(pathname)) return children;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-40 blur-[1px]" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex items-start justify-center bg-canvas/70 p-6 pt-16 backdrop-blur-[2px]">
        <div className="w-full max-w-md rounded-[16px] border border-line bg-white p-7 shadow-[0_12px_40px_rgba(11,18,32,0.08)]">
          <p className="text-[13px] font-semibold tracking-[0.08em] text-primary uppercase">
            Subscription required
          </p>
          <h2 className="mt-2 text-[22px] font-bold tracking-[-0.3px] text-ink">
            Your trial has ended
          </h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-subtle">
            Subscribe to Essential or Professional to keep analyzing statements,
            importing transactions, and using detection tools.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/subscribe"
              className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-[14.5px] font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Choose a plan
            </Link>
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center justify-center rounded-full border border-line px-5 py-3 text-[14.5px] font-medium text-ink transition-colors hover:border-ink"
            >
              Billing settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
