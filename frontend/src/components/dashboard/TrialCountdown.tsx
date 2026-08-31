"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/context/AuthContext";

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function getRemaining(trialEndsAt: string) {
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, diff);
}

export function TrialCountdown() {
  const { user } = useAuth();
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;

    setRemainingMs(getRemaining(user.trial_ends_at));
    const intervalId = window.setInterval(() => {
      setRemainingMs(getRemaining(user.trial_ends_at));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [user]);

  if (!user || remainingMs === null) return null;

  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const expired = remainingMs <= 0;

  return (
    <div
      className={
        expired
          ? "rounded-[12px] border border-line bg-canvas p-3.5"
          : "rounded-[12px] border border-primary/20 bg-sunken p-3.5"
      }
    >
      <div className="flex items-center gap-2">
        <Icon
          name="clock"
          className={expired ? "h-4 w-4 text-subtle" : "h-4 w-4 text-primary"}
          strokeWidth={2}
        />
        <p className="text-[12.5px] font-semibold text-ink">
          {expired ? "Trial expired" : "Free trial"}
        </p>
      </div>

      {expired ? (
        <p className="mt-1.5 text-[12px] font-light leading-[1.6] text-subtle">
          Your 3-day trial has ended.
        </p>
      ) : (
        <p
          className="mt-1.5 font-mono text-[15px] font-semibold tracking-[0.02em] text-primary-deep"
          aria-live="polite"
        >
          {days > 0 ? `${days}d ` : ""}
          {pad(hours)}:{pad(minutes)}:{pad(seconds)}
          <span className="ml-1 text-[11px] font-normal text-subtle">left</span>
        </p>
      )}

      <Link
        href="/subscribe"
        className="mt-2.5 inline-flex w-full items-center justify-center rounded-[8px] bg-ink px-3 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-ink/85"
      >
        {expired ? "Choose a plan" : "Upgrade now"}
      </Link>
    </div>
  );
}
