"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { forgotPassword } from "@/lib/api";
import { getErrorMessage } from "@/lib/api-types";

const fieldClassName =
  "mt-2 w-full rounded-[10px] border border-line bg-canvas px-3.5 py-3 text-[14.5px] text-ink outline-none transition-colors focus:border-primary";

export function ForgotPasswordContent() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    setError(null);
    setPending(true);
    try {
      await forgotPassword(email);
      setDone(true);
    } catch (caught) {
      setError(getErrorMessage(caught, "Unable to start password reset."));
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Forgot password"
      description="Enter your email and we will send a reset link if an account exists."
      footer={
        <p className="text-center text-[14.5px] text-body">
          Remembered it?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary transition-colors hover:text-primary-hover"
          >
            Log in
          </Link>
        </p>
      }
    >
      {done ? (
        <p className="text-[15px] font-light leading-[1.7] text-body">
          If that email is registered, you can use the reset link. In local
          development the link is printed in the API server log.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-body">
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              placeholder="you@company.com"
              className={fieldClassName}
            />
          </label>
          {error ? (
            <p className="text-sm text-[#9f1239]" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="inline-flex w-full items-center justify-center rounded-full bg-ink px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
