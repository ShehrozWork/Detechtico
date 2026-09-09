"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { ActionButton } from "@/components/dashboard/ActionButton";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel } from "@/components/dashboard/Panel";
import {
  confirmAdminTotp,
  disableAdminTotp,
  getAdminSecurity,
  setupAdminTotp,
} from "@/lib/api";
import { getErrorMessage, type AdminSecurityStatus, type TotpSetup } from "@/lib/api-types";
import { fieldClassName } from "@/data/admin";
import { useAuth } from "@/context/AuthContext";

export function AdminSecurityContent() {
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<AdminSecurityStatus | null>(null);
  const [setup, setSetup] = useState<TotpSetup | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [unlinkCode, setUnlinkCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setStatus(await getAdminSecurity());
    } catch (caught) {
      setError(getErrorMessage(caught, "Unable to load security status."));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!setup?.otpauth_url) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(setup.otpauth_url, {
      width: 220,
      margin: 2,
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [setup?.otpauth_url]);

  const startSetup = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      setSetup(await setupAdminTotp());
    } catch (caught) {
      setError(getErrorMessage(caught, "Unable to start setup."));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await confirmAdminTotp(code);
      setStatus(next);
      setSetup(null);
      setCode("");
      setMessage("Two-factor authentication is enrolled.");
      await refreshUser();
    } catch (caught) {
      setError(getErrorMessage(caught, "Unable to confirm code."));
    } finally {
      setBusy(false);
    }
  };

  const unlink = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const next = await disableAdminTotp(unlinkCode);
      setStatus(next);
      setUnlinkCode("");
      setMessage("Authenticator unlinked. Enroll again before using other admin tools.");
      await refreshUser();
    } catch (caught) {
      setError(getErrorMessage(caught, "Unable to unlink authenticator."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security"
        description="Staff accounts must enroll authenticator-based 2FA before using admin tools."
      />

      <Panel className="p-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-subtle">
              Enrollment
            </dt>
            <dd className="mt-1 text-[15px] font-semibold text-ink">
              {status?.enrolled ? "Enrolled" : "Not enrolled"}
            </dd>
          </div>
          <div>
            <dt className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-subtle">
              Role
            </dt>
            <dd className="mt-1 text-[15px] font-semibold text-ink">{status?.staff_role || "—"}</dd>
          </div>
        </dl>

        {!status?.enrolled ? (
          <div className="mt-6 space-y-4">
            {!setup ? (
              <ActionButton type="button" onClick={startSetup} disabled={busy}>
                Start authenticator setup
              </ActionButton>
            ) : (
              <>
                <p className="text-[14px] text-subtle">
                  Scan this QR code with Google Authenticator, Authy, or 1Password, then enter a
                  code to confirm. You can also enter the secret manually.
                </p>
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt="Authenticator QR code"
                    width={220}
                    height={220}
                    className="rounded-[12px] border border-hairline bg-white p-2"
                  />
                ) : null}
                <p className="break-all rounded-[10px] bg-sunken px-3 py-3 font-mono text-[13px] text-ink">
                  {setup.secret}
                </p>
                <label className="block text-[13px] font-semibold text-ink">
                  Confirmation code
                  <input
                    className={fieldClassName}
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    inputMode="numeric"
                    maxLength={8}
                  />
                </label>
                <ActionButton type="button" onClick={confirm} disabled={busy || code.length < 6}>
                  Confirm enrollment
                </ActionButton>
              </>
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-[14px] text-subtle">
              High-risk actions will ask for a fresh authenticator code (step-up) even while you are
              signed in.
            </p>
            <div className="rounded-[12px] border border-hairline bg-canvas p-4">
              <p className="text-[14px] font-semibold text-ink">Unlink authenticator</p>
              <p className="mt-1 text-[13px] text-subtle">
                Removes 2FA from this staff account. You will need to enroll again before other
                admin pages work.
              </p>
              <label className="mt-3 block text-[13px] font-semibold text-ink">
                Current authenticator code
                <input
                  className={fieldClassName}
                  value={unlinkCode}
                  onChange={(event) => setUnlinkCode(event.target.value)}
                  inputMode="numeric"
                  maxLength={8}
                  autoComplete="one-time-code"
                />
              </label>
              <div className="mt-3">
                <ActionButton
                  type="button"
                  onClick={unlink}
                  disabled={busy || unlinkCode.length < 6}
                >
                  Unlink 2FA
                </ActionButton>
              </div>
            </div>
          </div>
        )}

        {message ? <p className="mt-4 text-[14px] font-medium text-primary-deep">{message}</p> : null}
        {error ? <p className="mt-4 text-[14px] text-[#9f1239]">{error}</p> : null}
      </Panel>
    </div>
  );
}
