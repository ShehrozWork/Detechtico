"use client";

import { useEffect, useState } from "react";
import { ActionButton } from "@/components/dashboard/ActionButton";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel } from "@/components/dashboard/Panel";
import { listAdminAudit } from "@/lib/api";
import { getErrorMessage, type AdminAuditItem } from "@/lib/api-types";
import { fieldClassName } from "@/data/admin";

export function AdminAuditContent() {
  const [action, setAction] = useState("");
  const [items, setItems] = useState<AdminAuditItem[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await listAdminAudit({ action: action || undefined });
      setItems(data.items);
      setTotal(data.total);
    } catch (caught) {
      setError(getErrorMessage(caught, "Unable to load audit log."));
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Privileged admin actions are written in the same database transaction as the change."
      />

      <Panel className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <label className="flex-1 text-[13px] font-semibold text-ink">
          Action filter
          <input
            className={fieldClassName}
            value={action}
            onChange={(event) => setAction(event.target.value)}
            placeholder="e.g. user_deactivate"
          />
        </label>
        <ActionButton type="button" onClick={() => void load()}>
          Filter
        </ActionButton>
      </Panel>

      {error ? <p className="text-[14px] text-[#9f1239]">{error}</p> : null}

      <Panel className="overflow-hidden">
        <div className="border-b border-hairline px-5 py-3 text-[13px] text-subtle">
          {total} event{total === 1 ? "" : "s"}
        </div>
        <ul className="divide-y divide-hairline">
          {items.map((row) => (
            <li key={row.id} className="px-5 py-4 text-[14px]">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-ink">{row.action}</p>
                <p className="text-[12.5px] text-subtle">
                  {new Date(row.created_at).toLocaleString()}
                </p>
              </div>
              <p className="mt-1 text-body">
                {row.actor_role} · {row.target_type}
                {row.target_id ? ` · ${row.target_id}` : ""}
              </p>
              {Object.keys(row.metadata || {}).length > 0 ? (
                <pre className="mt-2 overflow-x-auto rounded-[10px] bg-sunken p-3 text-[12px] text-body">
                  {JSON.stringify(row.metadata, null, 2)}
                </pre>
              ) : null}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
