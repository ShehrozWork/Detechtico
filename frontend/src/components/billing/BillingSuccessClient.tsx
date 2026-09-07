"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { useAuth } from "@/context/AuthContext";
import { confirmCheckoutSession, getMe } from "@/lib/api";

function SuccessBody() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { setUser, isReady } = useAuth();
  const [status, setStatus] = useState<"working" | "ready" | "pending" | "error">(
    "working",
  );
  const [message, setMessage] = useState("Confirming your subscription…");

  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;

    async function activate() {
      try {
        if (sessionId) {
          const confirmed = await confirmCheckoutSession(sessionId);
          if (!cancelled) setUser(confirmed);
          if (confirmed.entitled) {
            if (!cancelled) {
              setStatus("ready");
              setMessage("Your subscription is active.");
            }
            return;
          }
        }

        for (let i = 0; i < 8; i += 1) {
          await new Promise((r) => setTimeout(r, 750));
          const me = await getMe();
          if (cancelled) return;
          if (me) setUser(me);
          if (me?.entitled) {
            setStatus("ready");
            setMessage("Your subscription is active.");
            return;
          }
        }
        if (!cancelled) {
          setStatus("pending");
          setMessage(
            "Payment received. Activation may take a few seconds — refresh the dashboard shortly.",
          );
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage(
            "We received your payment request but could not confirm activation yet. Open Billing or try again in a moment.",
          );
        }
      }
    }

    void activate();
    return () => {
      cancelled = true;
    };
  }, [isReady, sessionId, setUser]);

  return (
    <Container>
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="text-[13px] font-semibold tracking-[0.12em] text-primary uppercase">
          Billing
        </p>
        <h1 className="mt-3 text-[32px] font-bold tracking-[-0.4px] text-ink">
          {status === "ready"
            ? "You're all set"
            : status === "error"
              ? "Almost there"
              : "Activating access"}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-subtle">{message}</p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-[14.5px] font-semibold text-white hover:bg-primary-hover"
          >
            Go to dashboard
          </Link>
          <Link
            href="/dashboard/billing"
            className="text-[13.5px] font-medium text-ink hover:text-primary"
          >
            Billing settings
          </Link>
        </div>
      </div>
    </Container>
  );
}

export function BillingSuccessClient() {
  return (
    <div className="min-h-dvh bg-canvas">
      <Header />
      <Suspense
        fallback={
          <Container>
            <p className="py-20 text-center text-subtle">Loading…</p>
          </Container>
        }
      >
        <SuccessBody />
      </Suspense>
      <Footer />
    </div>
  );
}
