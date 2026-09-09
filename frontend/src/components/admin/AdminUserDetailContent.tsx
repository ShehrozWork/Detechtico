"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ActionButton } from "@/components/dashboard/ActionButton";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel } from "@/components/dashboard/Panel";
import { StepUpModal, withStepUpRetry } from "@/components/admin/StepUpModal";
import {
  activateAdminUser,
  deactivateAdminUser,
  forceLogoutAdminUser,
  getAdminUser,
  grantAdminComp,
  revokeAdminComp,
  setAdminStaffRole,
  setAdminTrial,
  syncAdminSubscription,
  triggerAdminPasswordReset,
} from "@/lib/api";
import { getErrorMessage, type AdminUserDetail } from "@/lib/api-types";
import { fieldClassName } from "@/data/admin";
import { useAuth } from "@/context/AuthContext";

export function AdminUserDetailContent() {
  const params = useParams<{ id: string }>();
  const userId = params.id;
  const { user: me } = useAuth();
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);

  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [billingAction, setBillingAction] = useState<
    "leave" | "cancel_at_period_end" | "cancel_immediately"
  >("cancel_at_period_end");
  const [reason, setReason] = useState("");
  const [compReason, setCompReason] = useState("");
  const [compExpiry, setCompExpiry] = useState("");
  const [trialEnd, setTrialEnd] = useState("");
  const [trialReason, setTrialReason] = useState("");

  const load = useCallback(async () => {
    try {
      setDetail(await getAdminUser(userId));
    } catch (caught) {
      setError(getErrorMessage(caught, "Unable to load user."));
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const runPrivileged = async (action: () => Promise<void>) => {
    setError(null);
    setMessage(null);
    const result = await withStepUpRetry(action, () => {
      setPendingAction(() => action);
      setStepUpOpen(true);
    });
    if (result !== undefined) {
      await load();
    }
  };

  if (!detail) {
    return (
      <div className="py-10 text-[14.5px] text-subtle">
        {error || "Loading user…"}
      </div>
    );
  }

  const isSuper = me?.staff_role === "superadmin";
  const isBilling = me?.staff_role === "billing_ops" || isSuper;

  return (
    <div className="space-y-6">
      <PageHeader
        title={detail.email}
        description={`${detail.name} · created ${new Date(detail.created_at).toLocaleString()}`}
        backHref="/admin/users"
        backLabel="Back to users"
      />

      {error ? <p className="text-[14px] text-[#9f1239]">{error}</p> : null}
      {message ? <p className="text-[14px] font-medium text-primary-deep">{message}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-6">
          <h2 className="text-lg font-bold text-ink">Access</h2>
          <dl className="mt-4 space-y-2 text-[14.5px]">
            <div className="flex justify-between gap-3">
              <dt className="text-subtle">Active</dt>
              <dd className="font-semibold text-ink">{detail.is_active ? "Yes" : "No"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-subtle">Entitled</dt>
              <dd className="font-semibold text-ink">{detail.entitled ? "Yes" : "No"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-subtle">Trial ends</dt>
              <dd className="font-semibold text-ink">
                {new Date(detail.trial_ends_at).toLocaleString()}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-subtle">Staff role</dt>
              <dd className="font-semibold text-ink">{detail.staff_role || "—"}</dd>
            </div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            <ActionButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                void runPrivileged(async () => {
                  await forceLogoutAdminUser(detail.id);
                  setMessage("Sessions revoked.");
                })
              }
            >
              Force logout
            </ActionButton>
            <ActionButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                void runPrivileged(async () => {
                  await triggerAdminPasswordReset(detail.id);
                  setMessage("Password reset issued (check server logs in development).");
                })
              }
            >
              Password reset
            </ActionButton>
            {isSuper ? (
              detail.is_active ? (
                <ActionButton
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => setDeactivateOpen(true)}
                >
                  Deactivate
                </ActionButton>
              ) : (
                <ActionButton
                  type="button"
                  variant="accent"
                  size="sm"
                  onClick={() =>
                    void runPrivileged(async () => {
                      await activateAdminUser(detail.id);
                      setMessage("User activated.");
                    })
                  }
                >
                  Activate
                </ActionButton>
              )
            ) : null}
          </div>
        </Panel>

        <Panel className="p-6">
          <h2 className="text-lg font-bold text-ink">Billing</h2>
          <dl className="mt-4 space-y-2 text-[14.5px]">
            <div className="flex justify-between gap-3">
              <dt className="text-subtle">Plan / status</dt>
              <dd className="font-semibold capitalize text-ink">
                {detail.plan_id || "—"} / {detail.subscription_status}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-subtle">Period end</dt>
              <dd className="font-semibold text-ink">
                {detail.current_period_end
                  ? new Date(detail.current_period_end).toLocaleString()
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-subtle">Stripe customer</dt>
              <dd className="truncate font-mono text-[12.5px] text-ink">
                {detail.stripe_customer_id || "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-subtle">Comp</dt>
              <dd className="font-semibold text-ink">
                {detail.active_comp
                  ? `until ${new Date(detail.active_comp.expires_at).toLocaleString()}`
                  : "None"}
              </dd>
            </div>
          </dl>
          {isBilling ? (
            <div className="mt-5 flex flex-wrap gap-2">
              <ActionButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  void runPrivileged(async () => {
                    await syncAdminSubscription(detail.id);
                    setMessage("Subscription synced from Stripe.");
                  })
                }
              >
                Sync from Stripe
              </ActionButton>
              {detail.active_comp ? (
                <ActionButton
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() =>
                    void runPrivileged(async () => {
                      await revokeAdminComp(detail.id, "Early revoke from admin UI");
                      setMessage("Complimentary access revoked.");
                    })
                  }
                >
                  Revoke comp
                </ActionButton>
              ) : null}
            </div>
          ) : null}
        </Panel>
      </div>

      {isBilling ? (
        <Panel className="p-6">
          <h2 className="text-lg font-bold text-ink">Grant complimentary access</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-[13px] font-semibold text-ink">
              Reason
              <input
                className={fieldClassName}
                value={compReason}
                onChange={(event) => setCompReason(event.target.value)}
              />
            </label>
            <label className="text-[13px] font-semibold text-ink">
              Expires at
              <input
                type="datetime-local"
                className={fieldClassName}
                value={compExpiry}
                onChange={(event) => setCompExpiry(event.target.value)}
              />
            </label>
          </div>
          <ActionButton
            className="mt-4"
            type="button"
            size="sm"
            disabled={!compReason || !compExpiry}
            onClick={() =>
              void runPrivileged(async () => {
                await grantAdminComp(detail.id, {
                  reason: compReason,
                  expires_at: new Date(compExpiry).toISOString(),
                });
                setMessage("Complimentary access granted.");
                setCompReason("");
                setCompExpiry("");
              })
            }
          >
            Grant comp
          </ActionButton>

          <h2 className="mt-8 text-lg font-bold text-ink">Trial override</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-[13px] font-semibold text-ink">
              Trial ends at
              <input
                type="datetime-local"
                className={fieldClassName}
                value={trialEnd}
                onChange={(event) => setTrialEnd(event.target.value)}
              />
            </label>
            <label className="text-[13px] font-semibold text-ink">
              Reason
              <input
                className={fieldClassName}
                value={trialReason}
                onChange={(event) => setTrialReason(event.target.value)}
              />
            </label>
          </div>
          <ActionButton
            className="mt-4"
            type="button"
            size="sm"
            disabled={!trialEnd || !trialReason}
            onClick={() =>
              void runPrivileged(async () => {
                await setAdminTrial(detail.id, {
                  trial_ends_at: new Date(trialEnd).toISOString(),
                  reason: trialReason,
                });
                setMessage("Trial updated.");
              })
            }
          >
            Set trial end
          </ActionButton>
        </Panel>
      ) : null}

      {isSuper ? (
        <Panel className="p-6">
          <h2 className="text-lg font-bold text-ink">Staff role</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {([null, "support", "billing_ops", "superadmin"] as const).map((role) => (
              <ActionButton
                key={String(role)}
                type="button"
                size="sm"
                variant={detail.staff_role === role ? "accent" : "secondary"}
                onClick={() =>
                  void runPrivileged(async () => {
                    await setAdminStaffRole(detail.id, role);
                    setMessage(role ? `Role set to ${role}.` : "Staff role removed.");
                  })
                }
              >
                {role || "customer"}
              </ActionButton>
            ))}
          </div>
        </Panel>
      ) : null}

      <Panel className="p-6">
        <h2 className="text-lg font-bold text-ink">Recent jobs</h2>
        <ul className="mt-4 space-y-2 text-[14px]">
          {detail.recent_jobs.map((job) => (
            <li key={job.id} className="flex justify-between gap-3 border-b border-hairline py-2">
              <span className="font-mono text-[12.5px] text-subtle">{job.id.slice(0, 8)}</span>
              <span className="text-body">
                {job.status}
                {job.error_code ? ` (${job.error_code})` : ""} · retries {job.retry_count}
              </span>
            </li>
          ))}
          {detail.recent_jobs.length === 0 ? (
            <li className="text-subtle">No analysis jobs.</li>
          ) : null}
        </ul>
      </Panel>

      {deactivateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div role="dialog" className="w-full max-w-lg rounded-[14px] border border-hairline bg-white p-6">
            <h2 className="text-xl font-bold text-ink">Deactivate user</h2>
            <p className="mt-2 text-[14px] text-subtle">
              Login will be blocked and sessions revoked. Choose what happens to Stripe billing.
            </p>
            <fieldset className="mt-4 space-y-2 text-[14px]">
              {(
                [
                  ["cancel_at_period_end", "Cancel at period end (default)"],
                  ["cancel_immediately", "Cancel immediately"],
                  ["leave", "Leave billing unchanged (reason required)"],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="billing"
                    checked={billingAction === value}
                    onChange={() => setBillingAction(value)}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            <label className="mt-4 block text-[13px] font-semibold text-ink">
              Reason
              <input
                className={fieldClassName}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <ActionButton
                type="button"
                variant="secondary"
                onClick={() => setDeactivateOpen(false)}
              >
                Cancel
              </ActionButton>
              <ActionButton
                type="button"
                variant="danger"
                disabled={!reason.trim()}
                onClick={() => {
                  setDeactivateOpen(false);
                  void runPrivileged(async () => {
                    await deactivateAdminUser(detail.id, {
                      billing_action: billingAction,
                      reason: reason.trim(),
                    });
                    setMessage("User deactivated.");
                    setReason("");
                  });
                }}
              >
                Confirm deactivate
              </ActionButton>
            </div>
          </div>
        </div>
      ) : null}

      <StepUpModal
        open={stepUpOpen}
        onClose={() => {
          setStepUpOpen(false);
          setPendingAction(null);
        }}
        onVerified={async () => {
          if (pendingAction) {
            await pendingAction();
            await load();
          }
        }}
      />
    </div>
  );
}
