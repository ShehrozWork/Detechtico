"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/lib/api-types";

const fieldClassName =
  "mt-2 w-full rounded-[10px] border border-line bg-canvas px-3.5 py-3 text-[14.5px] text-ink outline-none transition-colors focus:border-primary";

export function SignupContent() {
  const router = useRouter();
  const { signup } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    const acceptedTerms = form.get("terms") === "on";

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!acceptedTerms) {
      setError("You must accept the terms to create an account.");
      return;
    }

    setError(null);
    setPending(true);
    try {
      await signup({ name, email, password, acceptedTerms });
      router.push("/dashboard");
    } catch (caught) {
      setError(getErrorMessage(caught, "Unable to create your account."));
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Get started"
      title="Create an account"
      description="Join Detechtico for explainable financial statement analysis."
      footer={
        <p className="text-center text-[14.5px] text-body">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary transition-colors hover:text-primary-hover"
          >
            Log in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium text-body">
          Full name
          <input
            name="name"
            type="text"
            autoComplete="name"
            required
            maxLength={80}
            placeholder="Jane Smith"
            className={fieldClassName}
          />
        </label>

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

        <label className="block text-sm font-medium text-body">
          Password
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            placeholder="Create a password"
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
            placeholder="Confirm your password"
            className={fieldClassName}
          />
        </label>

        <p className="text-[13px] font-light text-subtle">
          Use at least 12 characters, including a letter and a number.
        </p>

        <label className="inline-flex items-start gap-2.5 text-sm leading-[1.5] text-body">
          <input
            name="terms"
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-primary accent-primary"
          />
          <span>
            I agree to the{" "}
            <Link
              href="/terms"
              className="font-medium text-primary transition-colors hover:text-primary-hover"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="font-medium text-primary transition-colors hover:text-primary-hover"
            >
              Privacy Policy
            </Link>
            .
          </span>
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
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
