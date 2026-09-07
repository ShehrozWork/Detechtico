"use client";

import {
  useEffect,
  useId,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import {
  changePassword,
  confirmEmailChange,
  requestEmailChange,
  updateProfile,
  verifyPassword,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/api-types";

const fieldClassName =
  "mt-2 w-full rounded-[10px] border border-line bg-canvas px-3.5 py-3 text-[14.5px] text-ink outline-none transition-colors focus:border-primary";

const primaryBtn =
  "inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-[14.5px] font-semibold text-white transition-colors hover:bg-ink/90 disabled:opacity-60";

const secondaryBtn =
  "inline-flex items-center justify-center rounded-full border border-line px-5 py-3 text-[14.5px] font-medium text-ink transition-colors hover:border-ink disabled:opacity-60";

type ModalKind = "name" | "email" | "password" | null;

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

function SettingsModal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-[rgba(11,18,32,0.45)]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md rounded-[16px] border border-line bg-white p-6 shadow-[0_16px_48px_rgba(11,18,32,0.16)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-[18px] font-semibold text-ink">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-[13.5px] leading-relaxed text-subtle">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-[18px] leading-none text-subtle transition-colors hover:text-ink"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <div className="group flex items-center justify-between gap-4 rounded-[12px] px-3 py-3 transition-colors hover:bg-canvas">
      <div className="min-w-0">
        <p className="text-[12.5px] font-medium uppercase tracking-[0.04em] text-subtle">
          {label}
        </p>
        <p className="mt-1 truncate text-[15px] font-medium text-ink">{value}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 rounded-full border border-line px-3.5 py-1.5 text-[13px] font-medium text-ink opacity-100 transition-all hover:border-ink sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
      >
        Edit
      </button>
    </div>
  );
}

export function AccountSettingsContent() {
  const { user, setUser } = useAuth();
  const [modal, setModal] = useState<ModalKind>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [namePending, setNamePending] = useState(false);

  const [emailStep, setEmailStep] = useState<"password" | "email" | "otp">(
    "password",
  );
  const [emailPassword, setEmailPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [pendingNewEmail, setPendingNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailPending, setEmailPending] = useState(false);
  const [otpDeadlineMs, setOtpDeadlineMs] = useState<number | null>(null);
  const [resendDeadlineMs, setResendDeadlineMs] = useState<number | null>(null);
  const otpLeft = useDeadlineCountdown(otpDeadlineMs);
  const resendLeft = useDeadlineCountdown(resendDeadlineMs);

  const [passwordStep, setPasswordStep] = useState<"current" | "new">("current");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordPending, setPasswordPending] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(id);
  }, [toast]);

  if (!user) return null;

  function openNameModal() {
    setNameDraft(user!.name);
    setNameError(null);
    setModal("name");
  }

  function openEmailModal() {
    setEmailStep("password");
    setEmailPassword("");
    setNewEmail("");
    setOtp("");
    setPendingNewEmail("");
    setEmailError(null);
    setOtpDeadlineMs(null);
    setResendDeadlineMs(null);
    setModal("email");
  }

  function openPasswordModal() {
    setPasswordStep("current");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError(null);
    setModal("password");
  }

  function closeModal() {
    setModal(null);
    setEmailPassword("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function onSaveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNameError(null);
    setNamePending(true);
    try {
      const updated = await updateProfile(nameDraft.trim());
      setUser(updated);
      setToast("Name updated.");
      closeModal();
    } catch (caught) {
      setNameError(getErrorMessage(caught, "Unable to update your name."));
    } finally {
      setNamePending(false);
    }
  }

  async function onVerifyEmailPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailError(null);
    setEmailPending(true);
    try {
      await verifyPassword(emailPassword);
      setEmailStep("email");
    } catch (caught) {
      setEmailError(getErrorMessage(caught, "Current password is incorrect."));
    } finally {
      setEmailPending(false);
    }
  }

  async function sendEmailCode(isResend = false) {
    setEmailError(null);
    setEmailPending(true);
    try {
      const result = await requestEmailChange(
        (isResend ? pendingNewEmail : newEmail).trim(),
        emailPassword,
      );
      setPendingNewEmail(result.new_email);
      setEmailStep("otp");
      setOtp("");
      const now = Date.now();
      setOtpDeadlineMs(now + result.expires_in_seconds * 1000);
      setResendDeadlineMs(now + (result.resend_after_seconds ?? 60) * 1000);
      setToast(
        isResend
          ? `Code resent to ${result.new_email}. Check spam if needed.`
          : `Code sent to ${result.new_email}. Check spam if needed.`,
      );
    } catch (caught) {
      setEmailError(getErrorMessage(caught, "Unable to send verification code."));
    } finally {
      setEmailPending(false);
    }
  }

  async function onRequestEmailCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendEmailCode(false);
  }

  async function onConfirmEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailError(null);
    setEmailPending(true);
    try {
      const updated = await confirmEmailChange(otp.trim());
      setUser(updated);
      setToast("Email updated. A security alert was sent to your previous inbox.");
      closeModal();
    } catch (caught) {
      setEmailError(getErrorMessage(caught, "Unable to confirm email change."));
    } finally {
      setEmailPending(false);
    }
  }

  async function onVerifyCurrentPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordPending(true);
    try {
      await verifyPassword(currentPassword);
      setPasswordStep("new");
    } catch (caught) {
      setPasswordError(getErrorMessage(caught, "Current password is incorrect."));
    } finally {
      setPasswordPending(false);
    }
  }

  async function onSaveNewPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }
    setPasswordPending(true);
    try {
      const updated = await changePassword(currentPassword, newPassword);
      setUser(updated);
      setToast("Password updated. Other sessions were signed out.");
      closeModal();
    } catch (caught) {
      setPasswordError(getErrorMessage(caught, "Unable to change your password."));
    } finally {
      setPasswordPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-1 py-2">
      <h1 className="text-[28px] font-bold tracking-[-0.4px] text-ink">Account</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-subtle">
        View your profile details. Hover a row and choose Edit to make changes.
      </p>

      {toast ? (
        <p className="mt-5 rounded-[12px] border border-line bg-white px-4 py-3 text-[14px] font-medium text-primary">
          {toast}
        </p>
      ) : null}

      <div className="mt-8 rounded-[16px] border border-line bg-white p-3 sm:p-4">
        <DetailRow label="Name" value={user.name} onEdit={openNameModal} />
        <div className="mx-3 border-t border-line" />
        <DetailRow label="Email" value={user.email} onEdit={openEmailModal} />
        <div className="mx-3 border-t border-line" />
        <DetailRow label="Password" value="••••••••••••" onEdit={openPasswordModal} />
      </div>

      <div className="mt-6 rounded-[16px] border border-line bg-white p-6">
        <h2 className="text-[17px] font-semibold text-ink">Billing</h2>
        <p className="mt-1 text-[13.5px] text-subtle">
          Manage your plan, invoices, and cancellation from Billing.
        </p>
        <a href="/dashboard/billing" className={`${secondaryBtn} mt-4`}>
          Open billing
        </a>
      </div>

      {modal === "name" ? (
        <SettingsModal
          title="Edit name"
          description="This name appears on your account and invoices."
          onClose={closeModal}
        >
          <form onSubmit={onSaveName} className="space-y-4">
            <label className="block text-sm font-medium text-body">
              Name
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                name="name"
                type="text"
                autoComplete="name"
                required
                maxLength={80}
                autoFocus
                className={fieldClassName}
              />
            </label>
            {nameError ? (
              <p className="text-[14px] font-medium text-[#9f1239]" role="alert">
                {nameError}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3 pt-1">
              <button type="submit" disabled={namePending} className={primaryBtn}>
                {namePending ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={closeModal} className={secondaryBtn}>
                Cancel
              </button>
            </div>
          </form>
        </SettingsModal>
      ) : null}

      {modal === "email" ? (
        <SettingsModal
          title="Change email"
          description={
            emailStep === "password"
              ? "Confirm your password to continue."
              : emailStep === "email"
                ? "Enter the new email address that will receive a verification code."
                : `Enter the 6-digit code sent to ${pendingNewEmail}. Check spam if you do not see it.`
          }
          onClose={closeModal}
        >
          {emailStep === "password" ? (
            <form onSubmit={onVerifyEmailPassword} className="space-y-4">
              <label className="block text-sm font-medium text-body">
                Current password
                <input
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                  required
                  autoFocus
                  className={fieldClassName}
                />
              </label>
              {emailError ? (
                <p className="text-[14px] font-medium text-[#9f1239]" role="alert">
                  {emailError}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3 pt-1">
                <button type="submit" disabled={emailPending} className={primaryBtn}>
                  {emailPending ? "Checking…" : "Continue"}
                </button>
                <button type="button" onClick={closeModal} className={secondaryBtn}>
                  Cancel
                </button>
              </div>
            </form>
          ) : null}

          {emailStep === "email" ? (
            <form onSubmit={onRequestEmailCode} className="space-y-4">
              <label className="block text-sm font-medium text-body">
                New email
                <input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  autoFocus
                  className={fieldClassName}
                />
              </label>
              {emailError ? (
                <p className="text-[14px] font-medium text-[#9f1239]" role="alert">
                  {emailError}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3 pt-1">
                <button type="submit" disabled={emailPending} className={primaryBtn}>
                  {emailPending ? "Sending…" : "Send verification code"}
                </button>
                <button
                  type="button"
                  disabled={emailPending}
                  onClick={() => {
                    setEmailStep("password");
                    setEmailError(null);
                  }}
                  className={secondaryBtn}
                >
                  Back
                </button>
              </div>
            </form>
          ) : null}

          {emailStep === "otp" ? (
            <form onSubmit={onConfirmEmail} className="space-y-4">
              <label className="block text-sm font-medium text-body">
                Verification code
                <input
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
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
                  <span className="font-medium text-ink">
                    {formatCountdown(otpLeft)}
                  </span>
                </span>
                {resendLeft > 0 ? (
                  <span>
                    Resend in{" "}
                    <span className="font-medium text-ink">
                      {formatCountdown(resendLeft)}
                    </span>
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={emailPending}
                    onClick={() => void sendEmailCode(true)}
                    className="font-medium text-primary underline-offset-2 hover:underline disabled:opacity-60"
                  >
                    Resend code
                  </button>
                )}
              </div>
              {emailError ? (
                <p className="text-[14px] font-medium text-[#9f1239]" role="alert">
                  {emailError}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="submit"
                  disabled={emailPending || otp.length !== 6 || otpLeft <= 0}
                  className={primaryBtn}
                >
                  {emailPending ? "Confirming…" : "Confirm email"}
                </button>
                <button
                  type="button"
                  disabled={emailPending}
                  onClick={() => {
                    setEmailStep("email");
                    setOtp("");
                    setEmailError(null);
                  }}
                  className={secondaryBtn}
                >
                  Back
                </button>
              </div>
            </form>
          ) : null}
        </SettingsModal>
      ) : null}

      {modal === "password" ? (
        <SettingsModal
          title="Change password"
          description={
            passwordStep === "current"
              ? "Confirm your current password to continue."
              : "Use at least 12 characters with a letter and a number."
          }
          onClose={closeModal}
        >
          {passwordStep === "current" ? (
            <form onSubmit={onVerifyCurrentPassword} className="space-y-4">
              <label className="block text-sm font-medium text-body">
                Current password
                <input
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                  required
                  autoFocus
                  className={fieldClassName}
                />
              </label>
              {passwordError ? (
                <p className="text-[14px] font-medium text-[#9f1239]" role="alert">
                  {passwordError}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="submit"
                  disabled={passwordPending}
                  className={primaryBtn}
                >
                  {passwordPending ? "Checking…" : "Continue"}
                </button>
                <button type="button" onClick={closeModal} className={secondaryBtn}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={onSaveNewPassword} className="space-y-4">
              <label className="block text-sm font-medium text-body">
                New password
                <input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                  autoFocus
                  className={fieldClassName}
                />
              </label>
              <label className="block text-sm font-medium text-body">
                Confirm new password
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                  className={fieldClassName}
                />
              </label>
              {passwordError ? (
                <p className="text-[14px] font-medium text-[#9f1239]" role="alert">
                  {passwordError}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="submit"
                  disabled={passwordPending}
                  className={primaryBtn}
                >
                  {passwordPending ? "Updating…" : "Update password"}
                </button>
                <button
                  type="button"
                  disabled={passwordPending}
                  onClick={() => {
                    setPasswordStep("current");
                    setNewPassword("");
                    setConfirmPassword("");
                    setPasswordError(null);
                  }}
                  className={secondaryBtn}
                >
                  Back
                </button>
              </div>
            </form>
          )}
        </SettingsModal>
      ) : null}
    </div>
  );
}
