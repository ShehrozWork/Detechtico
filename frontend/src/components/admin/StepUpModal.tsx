"use client";

import { useEffect, useState } from "react";
import { ActionButton } from "@/components/dashboard/ActionButton";
import { adminStepUp } from "@/lib/api";
import { RequestError } from "@/lib/api";
import { getErrorMessage } from "@/lib/api-types";
import { fieldClassName } from "@/data/admin";

type StepUpModalProps = {
  open: boolean;
  onClose: () => void;
  onVerified: () => void | Promise<void>;
  title?: string;
};

export function StepUpModal({
  open,
  onClose,
  onVerified,
  title = "Confirm with authenticator",
}: StepUpModalProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setCode("");
      setError(null);
      setBusy(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await adminStepUp(code);
      await onVerified();
      onClose();
    } catch (caught) {
      setError(getErrorMessage(caught, "Invalid authenticator code."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-[14px] border border-hairline bg-white p-6 shadow-lg"
      >
        <h2 className="text-xl font-bold text-ink">{title}</h2>
        <p className="mt-2 text-[14px] text-subtle">
          Your step-up window expired or is required. Enter the 6-digit code from your
          authenticator app, then we&apos;ll retry your action.
        </p>
        <label className="mt-4 block text-[13px] font-semibold text-ink">
          Authenticator code
          <input
            className={fieldClassName}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
          />
        </label>
        {error ? <p className="mt-2 text-[13.5px] text-[#9f1239]">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <ActionButton type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </ActionButton>
          <ActionButton type="button" onClick={submit} disabled={busy || code.length < 6}>
            Verify
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

export async function withStepUpRetry<T>(
  action: () => Promise<T>,
  onNeedStepUp: () => void,
): Promise<T | undefined> {
  try {
    return await action();
  } catch (caught) {
    if (caught instanceof RequestError && caught.code === "step_up_required") {
      onNeedStepUp();
      return undefined;
    }
    throw caught;
  }
}
