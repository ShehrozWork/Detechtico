"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ActionButton } from "@/components/dashboard/ActionButton";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel } from "@/components/dashboard/Panel";
import { listAdminUsers } from "@/lib/api";
import { getErrorMessage, type AdminUserListItem } from "@/lib/api-types";
import { fieldClassName } from "@/data/admin";

export function AdminUsersContent() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async (query = q) => {
    setBusy(true);
    setError(null);
    try {
      const data = await listAdminUsers({ q: query || undefined });
      setItems(data.items);
      setTotal(data.total);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Search accounts, inspect entitlement, and open support actions."
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
        </div>
      </Panel>

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
    </div>
  );
}
