"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/dashboard/ActionButton";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel } from "@/components/dashboard/Panel";
import { StepUpModal, withStepUpRetry } from "@/components/admin/StepUpModal";
import { createAdminUser, listAdminUsers } from "@/lib/api";
import { getErrorMessage, type AdminUserListItem } from "@/lib/api-types";
import { fieldClassName } from "@/data/admin";
import { useAuth } from "@/context/AuthContext";

type StaffRole = "support" | "billing_ops" | "superadmin" | null;

const PASSWORD_POLICY = /^(?=.*[A-Za-z])(?=.*\d).{12,128}$/;

function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint32Array(16);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
  // Guarantee the letter + digit policy regardless of the random draw.
  return `${body}a7`;
}

export function AdminUsersContent() {
  const router = useRouter();
  const { user: me } = useAuth();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<StaffRole>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [stepUpOpen, setStepUpOpen] = useState(false);

  const isSuper = me?.staff_role === "superadmin";

  const load = async (query = q) => {
    setBusy(true);
    setError(null);
    try {
      const data = await listAdminUsers({ q: query || undefined });
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (caught) {
      setError(getErrorMessage(caught, "Unable to load users."));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetCreate = () => {
    setNewName("");
    setNewEmail("");
    setNewPassword("");
    setNewRole(null);
    setCreateError(null);
  };

  const submitCreate = async () => {
    setCreateError(null);
    setCreating(true);
    try {
      const created = await withStepUpRetry(
        () =>
          createAdminUser({
            name: newName.trim(),
            email: newEmail.trim(),
            password: newPassword,
            staff_role: newRole,
          }),
        () => setStepUpOpen(true),
      );
      if (created) {
        resetCreate();
        setCreateOpen(false);
        router.push(`/admin/users/${created.id}`);
      }
    } catch (caught) {
      setCreateError(getErrorMessage(caught, "Unable to create user."));
    } finally {
      setCreating(false);
    }
  };

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!PASSWORD_POLICY.test(newPassword)) {
      setCreateError("Password must be 12–128 characters and include at least one letter and one number.");
      return;
    }
    void submitCreate();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Search accounts, add new users, inspect entitlement, and open support actions."
      />

      <Panel className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className={`${fieldClassName} mt-0`}
            placeholder="Search email or name"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void load();
            }}
          />
          <ActionButton type="button" onClick={() => void load()} disabled={busy}>
            Search
          </ActionButton>
          {isSuper ? (
            <ActionButton
              type="button"
              variant="accent"
              onClick={() => {
                resetCreate();
                setCreateOpen((open) => !open);
              }}
            >
              {createOpen ? "Close" : "Add user"}
            </ActionButton>
          ) : null}
        </div>
      </Panel>

      {isSuper && createOpen ? (
        <Panel className="p-5 sm:p-6">
          <h2 className="text-lg font-bold text-ink">Add user</h2>
          <p className="mt-1 text-[14px] text-subtle">
            Creates an account that can sign in immediately. Share the temporary password with the
            user securely and ask them to change it under Account settings.
          </p>
          <form className="mt-4" onSubmit={handleCreate}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-[13px] font-semibold text-ink">
                Full name
                <input
                  className={fieldClassName}
                  value={newName}
                  maxLength={80}
                  required
                  onChange={(event) => setNewName(event.target.value)}
                />
              </label>
              <label className="text-[13px] font-semibold text-ink">
                Email
                <input
                  type="email"
                  className={fieldClassName}
                  value={newEmail}
                  required
                  onChange={(event) => setNewEmail(event.target.value)}
                />
              </label>
              <label className="text-[13px] font-semibold text-ink">
                Temporary password
                <div className="flex gap-2">
                  <input
                    type="text"
                    autoComplete="new-password"
                    className={`${fieldClassName} font-mono`}
                    value={newPassword}
                    required
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                  <ActionButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-2 shrink-0"
                    onClick={() => setNewPassword(generatePassword())}
                  >
                    Generate
                  </ActionButton>
                </div>
                <span className="mt-1 block text-[12px] font-normal text-subtle">
                  At least 12 characters with a letter and a number.
                </span>
              </label>
              <label className="text-[13px] font-semibold text-ink">
                Role
                <select
                  className={fieldClassName}
                  value={newRole ?? ""}
                  onChange={(event) => setNewRole((event.target.value || null) as StaffRole)}
                >
                  <option value="">Customer</option>
                  <option value="support">Support (staff)</option>
                  <option value="billing_ops">Billing ops (staff)</option>
                  <option value="superadmin">Superadmin (staff)</option>
                </select>
              </label>
            </div>
            {createError ? (
              <p className="mt-3 text-[14px] text-[#9f1239]" role="alert">
                {createError}
              </p>
            ) : null}
            <ActionButton className="mt-4" type="submit" size="sm" disabled={creating}>
              {creating ? "Creating…" : "Create user"}
            </ActionButton>
          </form>
        </Panel>
      ) : null}

      {error ? <p className="text-[14px] text-[#9f1239]">{error}</p> : null}

      <Panel className="overflow-hidden">
        <div className="border-b border-hairline px-5 py-3 text-[13px] text-subtle">
          {total} user{total === 1 ? "" : "s"}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[14px]">
            <thead className="bg-sunken text-[12px] uppercase tracking-[0.06em] text-subtle">
              <tr>
                <th className="px-5 py-3 font-semibold">User</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Plan</th>
                <th className="px-5 py-3 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {items.map((user) => (
                <tr key={user.id} className="border-t border-hairline">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="font-semibold text-primary hover:text-primary-hover"
                    >
                      {user.email}
                    </Link>
                    <p className="text-[13px] text-subtle">{user.name}</p>
                  </td>
                  <td className="px-5 py-3 text-body">
                    {user.is_active ? "Active" : "Inactive"}
                    {user.entitled ? " · entitled" : " · locked"}
                    {user.comp_active ? " · comp" : ""}
                    {user.staff_role ? ` · ${user.staff_role}` : ""}
                  </td>
                  <td className="px-5 py-3 capitalize text-body">
                    {user.plan_id || "—"} / {user.subscription_status}
                  </td>
                  <td className="px-5 py-3 text-body">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <StepUpModal
        open={stepUpOpen}
        onClose={() => setStepUpOpen(false)}
        onVerified={async () => {
          setStepUpOpen(false);
          await submitCreate();
        }}
      />
    </div>
  );
}
