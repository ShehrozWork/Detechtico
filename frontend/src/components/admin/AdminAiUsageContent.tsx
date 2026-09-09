"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ActionButton } from "@/components/dashboard/ActionButton";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel } from "@/components/dashboard/Panel";
import { getAdminAiUsage } from "@/lib/api";
import { getErrorMessage, type AiUsageSummary } from "@/lib/api-types";
import { fieldClassName } from "@/data/admin";

function usd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value || 0);
}

function tokens(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

export function AdminAiUsageContent() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AiUsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async (windowDays = days) => {
    setBusy(true);
    setError(null);
    try {
      setData(await getAdminAiUsage(windowDays));
    } catch (caught) {
      setError(getErrorMessage(caught, "Unable to load AI usage."));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load(30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cards = data
    ? [
        { label: "Total cost", value: usd(data.total_cost_usd) },
        { label: "API calls", value: tokens(data.total_calls) },
        { label: "Input tokens", value: tokens(data.total_input_tokens) },
        { label: "Output tokens", value: tokens(data.total_output_tokens) },
        { label: "Succeeded", value: tokens(data.succeeded_calls) },
        { label: "Failed", value: tokens(data.failed_calls) },
        { label: "Skipped", value: tokens(data.skipped_calls) },
        {
          label: "Avg cost / success",
          value: usd(data.avg_cost_per_succeeded_call_usd),
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI usage & cost"
        description="Real Anthropic Messages API usage from analysis jobs, with costs from published Claude API list prices."
      />

      <Panel className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <label className="text-[13px] font-semibold text-ink">
          Window (days)
          <select
            className={fieldClassName}
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
          >
            <option value={7}>7</option>
            <option value={30}>30</option>
            <option value={90}>90</option>
            <option value={365}>365</option>
          </select>
        </label>
        <ActionButton type="button" onClick={() => void load(days)} disabled={busy}>
          Refresh
        </ActionButton>
      </Panel>

      {error ? <p className="text-[14px] text-[#9f1239]">{error}</p> : null}

      {data ? (
        <>
          <Panel className="space-y-2 p-5 text-[13.5px] text-subtle">
            <p>
              Configured model:{" "}
              <span className="font-semibold text-ink">{data.configured_model}</span>
            </p>
            <p>
              Pricing:{" "}
              <a
                href={data.pricing_source}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-primary hover:text-primary-hover"
              >
                Anthropic docs
              </a>{" "}
              · version <span className="font-mono text-ink">{data.pricing_version}</span>
            </p>
            <p>
              Costs use official USD/MTok rates (input, output, 5m cache write, cache read). Token
              counts come from each API response&apos;s <code>usage</code> object.
            </p>
          </Panel>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
              <Panel key={card.label} className="p-5">
                <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-subtle">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl font-bold tracking-[-0.4px] text-ink">{card.value}</p>
              </Panel>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel className="overflow-hidden">
              <div className="border-b border-hairline px-5 py-3 text-[15px] font-bold text-ink">
                By model
              </div>
              <ul className="divide-y divide-hairline">
                {data.by_model.map((row) => (
                  <li key={row.model} className="px-5 py-3 text-[14px]">
                    <div className="flex justify-between gap-3">
                      <span className="font-semibold text-ink">{row.model}</span>
                      <span className="font-semibold text-ink">{usd(row.total_cost_usd)}</span>
                    </div>
                    <p className="mt-1 text-[13px] text-subtle">
                      {tokens(row.calls)} calls · {tokens(row.input_tokens)} in /{" "}
                      {tokens(row.output_tokens)} out
                    </p>
                  </li>
                ))}
                {data.by_model.length === 0 ? (
                  <li className="px-5 py-4 text-[14px] text-subtle">
                    No Anthropic calls recorded in this window yet. Run a statement analysis to
                    populate usage.
                  </li>
                ) : null}
              </ul>
            </Panel>

            <Panel className="overflow-hidden">
              <div className="border-b border-hairline px-5 py-3 text-[15px] font-bold text-ink">
                Daily cost
              </div>
              <ul className="divide-y divide-hairline">
                {data.daily.map((row) => (
                  <li key={row.day} className="flex justify-between gap-3 px-5 py-3 text-[14px]">
                    <span className="text-body">{row.day}</span>
                    <span className="text-right">
                      <span className="font-semibold text-ink">{usd(row.total_cost_usd)}</span>
                      <span className="ml-2 text-[13px] text-subtle">
                        {tokens(row.calls)} calls
                      </span>
                    </span>
                  </li>
                ))}
                {data.daily.length === 0 ? (
                  <li className="px-5 py-4 text-[14px] text-subtle">No daily activity yet.</li>
                ) : null}
              </ul>
            </Panel>
          </div>

          <Panel className="overflow-hidden">
            <div className="border-b border-hairline px-5 py-3 text-[15px] font-bold text-ink">
              Recent calls
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[13.5px]">
                <thead className="bg-sunken text-[12px] uppercase tracking-[0.06em] text-subtle">
                  <tr>
                    <th className="px-4 py-3 font-semibold">When</th>
                    <th className="px-4 py-3 font-semibold">User</th>
                    <th className="px-4 py-3 font-semibold">Model</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Tokens</th>
                    <th className="px-4 py-3 font-semibold">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((row) => (
                    <tr key={row.id} className="border-t border-hairline align-top">
                      <td className="px-4 py-3 text-body">
                        {new Date(row.created_at).toLocaleString()}
                        {row.anthropic_request_id ? (
                          <p className="mt-1 font-mono text-[11px] text-subtle">
                            {row.anthropic_request_id}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        {row.user_email ? (
                          <Link
                            href={`/admin/users/${row.user_id}`}
                            className="font-semibold text-primary"
                          >
                            {row.user_email}
                          </Link>
                        ) : (
                          row.user_id.slice(0, 8)
                        )}
                      </td>
                      <td className="px-4 py-3 text-body">{row.model}</td>
                      <td className="px-4 py-3 text-body">
                        {row.status}
                        {row.error_code ? ` · ${row.error_code}` : ""}
                        {!row.pricing_known ? " · rate fallback" : ""}
                      </td>
                      <td className="px-4 py-3 text-body">
                        {tokens(row.input_tokens)} in / {tokens(row.output_tokens)} out
                        {row.cache_creation_input_tokens || row.cache_read_input_tokens ? (
                          <p className="text-[12px] text-subtle">
                            cache w {tokens(row.cache_creation_input_tokens)} / r{" "}
                            {tokens(row.cache_read_input_tokens)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-semibold text-ink">
                        {usd(row.total_cost_usd)}
                        <p className="text-[12px] font-normal text-subtle">
                          in {usd(row.input_cost_usd)} · out {usd(row.output_cost_usd)}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      ) : null}
    </div>
  );
}
