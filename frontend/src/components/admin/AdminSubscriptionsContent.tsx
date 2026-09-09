"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel } from "@/components/dashboard/Panel";
import { listAdminSubscriptions } from "@/lib/api";
import { getErrorMessage, type AdminSubscriptionItem } from "@/lib/api-types";
import { fieldClassName } from "@/data/admin";

export function AdminSubscriptionsContent() {
  const [status, setStatus] = useState("");
  const [items, setItems] = useState<AdminSubscriptionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = async (nextStatus = status) => {
    try {
      const data = await listAdminSubscriptions(nextStatus || undefined);
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (caught) {
      setError(getErrorMessage(caught, "Unable to load subscriptions."));
    }
  };

  useEffect(() => {
    void load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        description="Local subscription rows with Stripe IDs for reconciliation."
      />

      <Panel className="p-4">
        <label className="text-[13px] font-semibold text-ink">
          Status filter
          <select
            className={fieldClassName}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              void load(event.target.value);
            }}
          >
            <option value="">All</option>
            <option value="active">active</option>
            <option value="trialing">trialing</option>
            <option value="past_due">past_due</option>
            <option value="canceled">canceled</option>
            <option value="none">none</option>
          </select>
        </label>
      </Panel>

      {error ? <p className="text-[14px] text-[#9f1239]">{error}</p> : null}

      <Panel className="overflow-hidden">
        <div className="border-b border-hairline px-5 py-3 text-[13px] text-subtle">
          {total} subscription{total === 1 ? "" : "s"}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[14px]">
            <thead className="bg-sunken text-[12px] uppercase tracking-[0.06em] text-subtle">
              <tr>
                <th className="px-5 py-3 font-semibold">User</th>
                <th className="px-5 py-3 font-semibold">Plan</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Period end</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.user_id} className="border-t border-hairline">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/users/${row.user_id}`}
                      className="font-semibold text-primary"
                    >
                      {row.email}
                    </Link>
                  </td>
                  <td className="px-5 py-3 capitalize">
                    {row.plan_id || "—"} {row.billing_period ? `(${row.billing_period})` : ""}
                  </td>
                  <td className="px-5 py-3">
                    {row.status}
                    {row.cancel_at_period_end ? " · cancel at end" : ""}
                  </td>
                  <td className="px-5 py-3">
                    {row.current_period_end
                      ? new Date(row.current_period_end).toLocaleDateString()
                      : "—"}
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
