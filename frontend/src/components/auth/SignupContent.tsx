"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/lib/api-types";

const fieldClassName =
  "mt-2 w-full rounded-[10px] border border-line bg-canvas px-3.5 py-3 text-[14.5px] text-ink outline-none transition-colors focus:border-primary";

function formatCountdown(totalSeconds: number) {
  const seconds = Math.max(0, totalSeconds);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function useDeadlineCountdown(deadlineMs: number | null) {
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (deadlineMs == null) {
      setLeft(0);
      return;
    }
    const tick = () => {
      setLeft(Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [deadlineMs]);

  return left;
}

export function SignupContent() {
  const router = useRouter();
  const { requestSignup, confirmSignup } = useAuth();
  const [step, setStep] = useState<"details" | "otp">("details");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpDeadlineMs, setOtpDeadlineMs] = useState<number | null>(null);
  const [resendDeadlineMs, setResendDeadlineMs] = useState<number | null>(null);
  const otpLeft = useDeadlineCountdown(otpDeadlineMs);
  const resendLeft = useDeadlineCountdown(resendDeadlineMs);

  async function sendCode() {
    const result = await requestSignup({
      name: name.trim(),
      email: email.trim(),
      password,
      acceptedTerms,
    });
    const now = Date.now();
    setStep("otp");
    setOtp("");
    setOtpDeadlineMs(now + result.expires_in_seconds * 1000);
    setResendDeadlineMs(now + (result.resend_after_seconds ?? 60) * 1000);
  }

  const handleDetailsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
      await sendCode();
    } catch (caught) {
      setError(getErrorMessage(caught, "Unable to start signup."));
    } finally {
      setPending(false);
    }
  };

  const handleConfirm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await confirmSignup(email.trim(), otp.trim());
      router.push("/dashboard");
    } catch (caught) {
      setError(getErrorMessage(caught, "Unable to verify your email."));
    } finally {
      setPending(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setPending(true);
    try {
      await sendCode();
    } catch (caught) {
      setError(getErrorMessage(caught, "Unable to resend the code."));
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Get started"
      title={step === "details" ? "Create an account" : "Verify your email"}
      description={
        step === "details"
          ? "Join Detechtico for explainable financial statement analysis."
          : `Enter the 6-digit code sent to ${email.trim()}. Check spam if you do not see it.`
      }
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
      {step === "details" ? (
        <form onSubmit={handleDetailsSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-body">
            Full name
            <input
              name="name"
              type="text"
              autoComplete="name"
              required
              maxLength={80}
              placeholder="Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
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
            {pending ? "Sending code…" : "Continue"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleConfirm} className="space-y-4">
          <label className="block text-sm font-medium text-body">
            Verification code
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              minLength={6}
              maxLength={6}
              autoFocus
              className={fieldClassName}
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-subtle">
            <span>
              Code expires in{" "}
              <span className="font-medium text-ink">{formatCountdown(otpLeft)}</span>
            </span>
            {resendLeft > 0 ? (
              <span>
                Resend in{" "}
                <span className="font-medium text-ink">{formatCountdown(resendLeft)}</span>
              </span>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={() => void handleResend()}
                className="font-medium text-primary underline-offset-2 hover:underline disabled:opacity-60"
              >
                Resend code
              </button>
            )}
          </div>

          {error ? (
            <p className="text-sm text-[#9f1239]" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending || otp.length !== 6 || otpLeft <= 0}
            className="inline-flex w-full items-center justify-center rounded-full bg-ink px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Creating account…" : "Verify and create account"}
          </button>

          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setStep("details");
              setOtp("");
              setError(null);
            }}
            className="inline-flex w-full items-center justify-center rounded-full border border-line px-6 py-3.5 text-[15px] font-medium text-ink transition-colors hover:border-ink disabled:opacity-60"
          >
            Back
          </button>
        </form>
      )}
    </AuthShell>
  );
}
