"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Container } from "@/components/ui/Container";
import { revertEmailChange } from "@/lib/api";
import { getErrorMessage } from "@/lib/api-types";

function RevertBody() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState("Reverting your email address…");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!token) {
        setStatus("error");
        setMessage("This revert link is missing a token.");
        return;
      }
      try {
        const user = await revertEmailChange(token);
        if (cancelled) return;
        setStatus("done");
        setMessage(
          `Your email was reverted to ${user.email}. Sign in again to continue.`,
        );
      } catch (caught) {
        if (cancelled) return;
        setStatus("error");
        setMessage(getErrorMessage(caught, "Unable to revert this email change."));
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <Container>
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="text-[13px] font-semibold tracking-[0.12em] text-primary uppercase">
          Security
        </p>
        <h1 className="mt-3 text-[32px] font-bold tracking-[-0.4px] text-ink">
          {status === "done"
            ? "Email reverted"
            : status === "error"
              ? "Could not revert"
              : "Securing your account"}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-subtle">{message}</p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-[14.5px] font-semibold text-white hover:bg-primary-hover"
          >
            Go to login
          </Link>
          <Link
            href="/dashboard/settings"
            className="text-[13.5px] font-medium text-ink hover:text-primary"
          >
            Account settings
          </Link>
        </div>
      </div>
    </Container>
  );
}

export default function RevertEmailPage() {
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
        <RevertBody />
      </Suspense>
      <Footer />
    </div>
  );
}
