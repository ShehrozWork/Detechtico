"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  cancelSubscription,
  createCheckoutSession,
  createPortalSession,
  RequestError,
  resumeSubscription,
} from "@/lib/api";

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function BillingPage() {
  const { user, setUser, refreshUser } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<
    "portal" | "essential" | "professional" | "cancel" | "resume" | null
  >(null);

  async function openPortal() {
    setError(null);
    setMessage(null);
    setBusy("portal");
    try {
      const session = await createPortalSession();
      window.location.href = session.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open portal.");
      setBusy(null);
    }
  }

  async function upgrade(planId: "essential" | "professional") {
    setError(null);
    setMessage(null);
    setBusy(planId);
    try {
      await refreshUser();
      const session = await createCheckoutSession(planId, "monthly");
      window.location.href = session.url;
    } catch (err) {
      if (err instanceof RequestError && err.code === "already_subscribed") {
        await openPortal();
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to start checkout.");
      setBusy(null);
    }
  }

  async function onCancel() {
    setError(null);
    setMessage(null);
    const confirmed = window.confirm(
      "Cancel at the end of your billing period? You’ll keep full access until then, and won’t be charged again.",
    );
    if (!confirmed) return;
    setBusy("cancel");
    try {
      const updated = await cancelSubscription();
      setUser(updated);
      setMessage(
        updated.current_period_end
          ? `Cancellation scheduled. Access continues until ${formatDate(updated.current_period_end)}.`
          : "Cancellation scheduled. Access continues until the end of your current period.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel.");
    } finally {
      setBusy(null);
    }
  }

  async function onResume() {
    setError(null);
    setMessage(null);
    setBusy("resume");
    try {
      const updated = await resumeSubscription();
      setUser(updated);
      setMessage("Subscription resumed. It will renew at the end of the period.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resume.");
    } finally {
      setBusy(null);
    }
  }

  if (!user) return null;

  const planLabel =
    user.plan_id === "professional"
      ? "Professional"
      : user.plan_id === "essential"
        ? "Essential"
        : "None";

  const hasPaidAccess =
    user.entitled &&
    !user.trial_active &&
    (user.subscription_status === "active" ||
      user.subscription_status === "trialing" ||
      user.subscription_status === "past_due");

  return (
    <div className="mx-auto max-w-2xl px-1 py-2">
      <h1 className="text-[28px] font-bold tracking-[-0.4px] text-ink">Billing</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-subtle">
        Manage your subscription, payment method, and invoices.
      </p>

      <div className="mt-8 rounded-[16px] border border-line bg-white p-6">
        <dl className="grid gap-4 text-[14.5px]">
          <div className="flex justify-between gap-4 border-b border-hairline pb-3">
            <dt className="text-subtle">Plan</dt>
            <dd className="font-semibold text-ink">{planLabel}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-hairline pb-3">
            <dt className="text-subtle">Status</dt>
            <dd className="font-semibold text-ink">
              {user.cancel_at_period_end
                ? "Cancels at period end"
                : (user.subscription_status ?? "none")}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-hairline pb-3">
            <dt className="text-subtle">Billing period</dt>
            <dd className="font-semibold text-ink">{user.billing_period ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-hairline pb-3">
            <dt className="text-subtle">
              {user.cancel_at_period_end ? "Access until" : "Current period end"}
            </dt>
            <dd className="font-semibold text-ink">
              {formatDate(user.current_period_end)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-subtle">Access</dt>
            <dd className="font-semibold text-ink">
              {user.entitled
                ? user.trial_active
                  ? "Trial"
                  : user.cancel_at_period_end
                    ? "Active until period end"
                    : "Subscribed"
                : "Locked"}
            </dd>
          </div>
        </dl>

        {user.cancel_at_period_end && hasPaidAccess ? (
          <p className="mt-4 rounded-[10px] border border-line bg-canvas px-3.5 py-3 text-[13.5px] leading-relaxed text-subtle">
            Your plan stays active through{" "}
            <span className="font-semibold text-ink">
              {formatDate(user.current_period_end)}
            </span>
            . After that it won’t renew. You can resume anytime before then.
          </p>
        ) : null}

        {error && (
          <p className="mt-4 text-[14px] font-medium text-[#9f1239]" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-4 text-[14px] font-medium text-primary">{message}</p>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            disabled={busy !== null}
            onClick={openPortal}
            className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-[14.5px] font-semibold text-white transition-colors hover:bg-ink/90 disabled:opacity-60"
          >
            {busy === "portal" ? "Opening…" : "Manage billing"}
          </button>

          {hasPaidAccess && !user.cancel_at_period_end ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={onCancel}
              className="inline-flex items-center justify-center rounded-full border border-line px-5 py-3 text-[14.5px] font-medium text-ink transition-colors hover:border-ink disabled:opacity-60"
            >
              {busy === "cancel" ? "Scheduling…" : "Cancel at period end"}
            </button>
          ) : null}

          {hasPaidAccess && user.cancel_at_period_end ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={onResume}
              className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-[14.5px] font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {busy === "resume" ? "Resuming…" : "Resume subscription"}
            </button>
          ) : null}

          {!user.entitled || user.trial_active ? (
            <>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => upgrade("essential")}
                className="inline-flex items-center justify-center rounded-full border border-line px-5 py-3 text-[14.5px] font-medium text-ink transition-colors hover:border-ink disabled:opacity-60"
              >
                {busy === "essential" ? "Redirecting…" : "Subscribe Essential"}
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => upgrade("professional")}
                className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-[14.5px] font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
              >
                {busy === "professional"
                  ? "Redirecting…"
                  : "Subscribe Professional"}
              </button>
            </>
          ) : null}
          <Link
            href="/subscribe"
            className="text-center text-[13.5px] font-medium text-primary hover:text-primary-hover"
          >
            View all plans
          </Link>
        </div>
      </div>
    </div>
  );
}
