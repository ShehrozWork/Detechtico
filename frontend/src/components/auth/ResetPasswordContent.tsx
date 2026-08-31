"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { resetPassword } from "@/lib/api";
import { getErrorMessage } from "@/lib/api-types";

const fieldClassName =
  "mt-2 w-full rounded-[10px] border border-line bg-canvas px-3.5 py-3 text-[14.5px] text-ink outline-none transition-colors focus:border-primary";

export function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (caught) {
      setError(getErrorMessage(caught, "Unable to reset your password."));
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset password"
      description="Choose a new password for your Detechtico account."
      footer={
        <p className="text-center text-[14.5px] text-body">
          <Link
            href="/login"
            className="font-semibold text-primary transition-colors hover:text-primary-hover"
          >
            Back to log in
          </Link>
        </p>
      }
    >
      {!token ? (
        <p className="text-[15px] font-light text-body">
          This reset link is missing or invalid. Request a new one from the
          forgot password page.
        </p>
      ) : done ? (
        <p className="text-[15px] font-light leading-[1.7] text-body">
          Your password has been updated. You can now{" "}
          <Link href="/login" className="font-semibold text-primary">
            log in
          </Link>
          .
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-body">
            New password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              className={fieldClassName}
            />
          </label>
          <label className="block text-sm font-medium text-body">
            Confirm password
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
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
            {pending ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
