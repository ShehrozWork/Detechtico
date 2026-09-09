"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel } from "@/components/dashboard/Panel";
import { getAdminOverview, getWebhookHealth } from "@/lib/api";
import { getErrorMessage, type AdminOverview, type WebhookHealth } from "@/lib/api-types";

export function AdminOverviewContent() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [webhook, setWebhook] = useState<WebhookHealth | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAdminOverview(), getWebhookHealth()])
      .then(([ov, wh]) => {
        if (!cancelled) {
          setOverview(ov);
          setWebhook(wh);
        }
      })
      .catch((caught) => {
        if (!cancelled) setError(getErrorMessage(caught, "Unable to load overview."));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = overview
    ? [
        { label: "Total users", value: overview.total_users },
        { label: "Active users", value: overview.active_users },
        { label: "Entitled users", value: overview.entitled_users },
        { label: "Signups (7d)", value: overview.signups_7d },
        { label: "Signups (30d)", value: overview.signups_30d },
        { label: "Past due", value: overview.past_due_count },
        { label: "Stuck jobs", value: overview.stuck_jobs },
        { label: "Failed jobs (24h)", value: overview.failed_jobs_24h },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ops overview"
        description="Live snapshot of users, billing health, and analysis job pressure."
      />

      {error ? <p className="text-[14px] text-[#9f1239]">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Panel key={card.label} className="p-5">
            <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-subtle">
              {card.label}
            </p>
            <p className="mt-2 text-3xl font-bold tracking-[-0.5px] text-ink">{card.value}</p>
          </Panel>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-6">
          <h2 className="text-lg font-bold text-ink">Subscription mix</h2>
          <ul className="mt-4 space-y-2">
            {overview
              ? Object.entries(overview.subscription_mix).map(([plan, count]) => (
                  <li key={plan} className="flex justify-between text-[14.5px] text-body">
                    <span className="capitalize">{plan}</span>
                    <span className="font-semibold text-ink">{count}</span>
                  </li>
                ))
              : null}
            {overview && Object.keys(overview.subscription_mix).length === 0 ? (
              <li className="text-[14px] text-subtle">No paid subscriptions yet.</li>
            ) : null}
          </ul>
        </Panel>

        <Panel className="p-6">
          <h2 className="text-lg font-bold text-ink">Alerts</h2>
          <ul className="mt-4 space-y-3 text-[14.5px] text-body">
            <li>
              Stuck jobs:{" "}
              <Link href="/admin/jobs?stuck=1" className="font-semibold text-primary">
                {overview?.stuck_jobs ?? "—"}
              </Link>
            </li>
            <li>Past due subscriptions: {overview?.past_due_count ?? "—"}</li>
            <li>
              Webhooks processed (24h): {webhook?.processed_24h ?? "—"}
              {webhook?.last_processed_at
                ? ` · last ${new Date(webhook.last_processed_at).toLocaleString()}`
                : ""}
            </li>
            <li className="text-[13px] text-subtle">{webhook?.note}</li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
