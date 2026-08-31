"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/lib/api-types";

const fieldClassName =
  "mt-2 w-full rounded-[10px] border border-line bg-canvas px-3.5 py-3 text-[14.5px] text-ink outline-none transition-colors focus:border-primary";

function getSafeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoggedIn, isReady } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!isReady || !isLoggedIn) return;
    router.replace(getSafeNext(searchParams.get("next")));
  }, [isLoggedIn, isReady, router, searchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const remember = form.get("remember") === "on";
    setError(null);
    setPending(true);
    try {
      await login(email, password, remember);
      router.push(getSafeNext(searchParams.get("next")));
    } catch (caught) {
      setError(getErrorMessage(caught, "Invalid email or password."));
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Log in"
      description="Sign in to access your dashboard and analysis tools."
      footer={
        <p className="text-center text-[14.5px] text-body">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-primary transition-colors hover:text-primary-hover"
          >
            Sign up
          </Link>
        </p>
      }
    >
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

        <label className="block text-sm font-medium text-body">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
            placeholder="Enter your password"
            className={fieldClassName}
          />
        </label>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-primary transition-colors hover:text-primary-hover"
          >
            Forgot password?
          </Link>
        </div>

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
          {pending ? "Signing in…" : "Log in"}
        </button>
      </form>
    </AuthShell>
  );
}
