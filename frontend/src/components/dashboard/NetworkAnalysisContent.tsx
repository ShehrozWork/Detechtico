"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel } from "@/components/dashboard/Panel";
import { StatCard } from "@/components/dashboard/StatCard";
import { ActionButton } from "@/components/dashboard/ActionButton";
import { SegmentedTabs } from "@/components/dashboard/SegmentedTabs";
import { getNetworkSummary } from "@/lib/api";
import { getErrorMessage, type NetworkSummary } from "@/lib/api-types";
import { cn } from "@/utils/cn";

type NetworkTab = "map" | "shell";

const tabs: { id: NetworkTab; label: string }[] = [
  { id: "map", label: "Network Map" },
  { id: "shell", label: "Shell Detection" },
];

function riskColor(risk: number) {
  if (risk >= 80) return "#9f1239";
  if (risk >= 70) return "#b45309";
  return "#0d7f9e";
}

export function NetworkAnalysisContent() {
  const [tab, setTab] = useState<NetworkTab>("map");
  const [summary, setSummary] = useState<NetworkSummary | null>(null);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      const data = await getNetworkSummary();
      setSummary(data);
    } catch (caught) {
      setError(getErrorMessage(caught, "Unable to load network analysis."));
    } finally {
      setPending(false);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const vendors = summary?.vendors ?? [];
  const connections = summary?.connections ?? [];
  const clusters = summary?.clusters ?? [];

  return (
    <Container>
      <PageHeader
        title="Network & Entity Analysis"
        description="Map counterparty relationships and shell-like patterns from your imported ledger."
        actions={
          <ActionButton type="button" variant="accent" disabled={pending} onClick={() => void load()}>
            <Icon name="play" className="h-4 w-4" strokeWidth={2} />
            {pending ? "Analyzing…" : "Refresh analysis"}
          </ActionButton>
        }
      />

      {error ? (
        <p className="mt-5 text-sm text-[#9f1239]" role="alert">
          {error}
        </p>
      ) : null}

      {ready && summary && summary.transaction_count === 0 ? (
        <Panel className="mt-5 px-6 py-10 text-center">
          <p className="text-[15px] font-medium text-body">
            Import transactions on the dashboard to build a vendor network.
          </p>
          <ActionButton href="/dashboard" variant="accent" size="sm" className="mt-4">
            Go to Overview
          </ActionButton>
        </Panel>
      ) : null}

      {summary && summary.transaction_count > 0 ? (
        <p className="mt-5 rounded-[12px] border border-primary-pale bg-sunken px-4 py-3 text-[14px] font-medium text-primary-deep">
          Built from {summary.transaction_count.toLocaleString()} imported transactions ·{" "}
          {vendors.length} vendors · {connections.length} connections · {clusters.length} clusters
        </p>
      ) : null}

      <div className="mt-8">
        <SegmentedTabs tabs={tabs} value={tab} onChange={setTab} ariaLabel="Network views" />
      </div>

      {tab === "map" ? (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(summary?.stats ?? []).map((stat) => (
              <StatCard key={stat.label} value={stat.value} label={stat.label} />
            ))}
          </div>

          <Panel className="mt-5 overflow-hidden p-4 sm:p-6">
            <h2 className="text-[18px] font-bold text-ink">Vendor Network Map</h2>
            <p className="mt-1.5 text-[14px] font-light text-subtle">
              Relationships inferred from shared amount bands, import files, dates, and risk
            </p>
            {vendors.length ? (
              <>
                <VendorNetworkMap vendors={vendors} connections={connections} />
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {vendors.map((vendor) => (
                    <li
                      key={vendor.id}
                      className="flex items-center justify-between gap-3 rounded-[10px] bg-canvas px-3.5 py-2.5"
                    >
                      <span className="truncate text-[13.5px] font-medium text-ink">
                        {vendor.name}
                      </span>
                      <span className="shrink-0 text-[12.5px] font-semibold text-subtle">
                        {vendor.risk}% risk · {vendor.transactions} txns
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-5 text-[14px] font-light text-subtle">No vendors to map yet.</p>
            )}
          </Panel>
        </>
      ) : (
        <>
          <Panel className="mt-6 p-5 sm:p-6">
            <h2 className="text-[18px] font-bold text-ink">Suspicious Vendor Clusters</h2>
            <p className="mt-1.5 text-[14px] font-light text-subtle">
              Connected groups sharing multiple suspicious ledger patterns
            </p>
            {clusters.length === 0 ? (
              <p className="mt-5 text-[14px] font-light text-subtle">
                No multi-vendor clusters found. Import more counterparties or flagged rows to
                strengthen graph signals.
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                {clusters.map((cluster) => (
                  <div
                    key={cluster.id}
                    className="rounded-[12px] border border-hairline bg-canvas p-4 sm:p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-[16px] font-bold text-ink">{cluster.title}</h3>
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[12px] font-semibold text-amber-900">
                        {cluster.vendorCount} vendors · {cluster.avgRisk}% avg
                      </span>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {cluster.vendors.map((vendor) => (
                        <li
                          key={vendor.name}
                          className="flex items-center justify-between gap-3 text-[14px]"
                        >
                          <span className="text-body">{vendor.name}</span>
                          <span className="shrink-0 font-semibold text-ink">{vendor.risk}% risk</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel className="mt-5 p-5 sm:p-6">
            <h2 className="text-[18px] font-bold text-ink">Strongest Vendor Connections</h2>
            <p className="mt-1.5 text-[14px] font-light text-subtle">
              Vendor pairs sharing multiple suspicious patterns
            </p>
            {connections.length === 0 ? (
              <p className="mt-5 text-[14px] font-light text-subtle">
                No strong connections yet. Shared amount bands and co-imported files create edges.
              </p>
            ) : (
              <ul className="mt-5 space-y-3">
                {connections.map((connection) => (
                  <li
                    key={`${connection.fromId}-${connection.toId}`}
                    className="rounded-[12px] border border-hairline px-4 py-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <p className="text-[14px] font-semibold text-ink">{connection.fromName}</p>
                      <Icon name="link-2" className="hidden h-4 w-4 text-primary sm:block" />
                      <p className="text-[14px] font-semibold text-ink">{connection.toName}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {connection.reasons.map((reason) => (
                        <span
                          key={reason}
                          className={cn(
                            "rounded-full bg-surface px-2.5 py-1 text-[12px] font-medium text-body",
                          )}
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </Container>
  );
}

function VendorNetworkMap({
  vendors,
  connections,
}: {
  vendors: NetworkSummary["vendors"];
  connections: NetworkSummary["connections"];
}) {
  const byId = useMemo(
    () => Object.fromEntries(vendors.map((vendor) => [vendor.id, vendor])),
    [vendors],
  );

  return (
    <div className="mt-5 overflow-x-auto">
      <svg
        viewBox="0 0 640 430"
        className="h-auto w-full min-w-[520px]"
        role="img"
        aria-label="Vendor relationship map"
      >
        <ellipse
          cx="320"
          cy="214"
          rx="268"
          ry="168"
          fill="#e0f5fb"
          stroke="#1fcaeb"
          strokeDasharray="7 6"
          strokeWidth="2"
        />
        {connections.map((edge) => {
          const a = byId[edge.fromId];
          const b = byId[edge.toId];
          if (!a || !b) return null;
          return (
            <line
              key={`${edge.fromId}-${edge.toId}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#199fc2"
              strokeWidth="2"
              opacity="0.55"
            />
          );
        })}
        {vendors.map((vendor) => (
          <g key={vendor.id}>
            <circle
              cx={vendor.x}
              cy={vendor.y}
              r="28"
              fill="white"
              stroke={riskColor(vendor.risk)}
              strokeWidth="3"
            />
            <text
              x={vendor.x}
              y={vendor.y + 5}
              textAnchor="middle"
              fontSize="13"
              fontWeight="700"
              fill="#0b1220"
            >
              {vendor.risk}
            </text>
            <text
              x={vendor.x}
              y={vendor.y + 48}
              textAnchor="middle"
              fontSize="12"
              fontWeight="600"
              fill="#0b1220"
            >
              {vendor.shortName}
            </text>
            <text
              x={vendor.x}
              y={vendor.y + 64}
              textAnchor="middle"
              fontSize="11"
              fill="#5b6670"
            >
              {vendor.risk}% risk · {vendor.transactions} txns
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
