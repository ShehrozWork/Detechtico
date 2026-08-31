"use client";

import { useEffect, useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "@/components/dashboard/Panel";
import { SegmentedTabs } from "@/components/dashboard/SegmentedTabs";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ActionButton } from "@/components/dashboard/ActionButton";
import { formatCurrency, workspaceTabs, type WorkspaceTab } from "@/data/dashboard";
import { parseTransactionsFile } from "@/utils/parseTransactionsFile";
import {
  clearTransactions,
  getRiskSettings,
  getTransactions,
  importTransactions,
  updateTransactionStatus,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/api-types";
import type { Transaction } from "@/lib/api-types";

type ImportedFile = {
  name: string;
  url: string;
};

type ImportGroup = {
  filename: string;
  recordCount: number;
  latestCreatedAt: string;
};

function buildImportHistory(transactions: Transaction[]): ImportGroup[] {
  const groups = new Map<string, ImportGroup>();
  for (const txn of transactions) {
    const existing = groups.get(txn.source_filename);
    if (existing) {
      existing.recordCount += 1;
      if (txn.created_at > existing.latestCreatedAt) {
        existing.latestCreatedAt = txn.created_at;
      }
    } else {
      groups.set(txn.source_filename, {
        filename: txn.source_filename,
        recordCount: 1,
        latestCreatedAt: txn.created_at,
      });
    }
  }
  return Array.from(groups.values()).sort((a, b) =>
    b.latestCreatedAt.localeCompare(a.latestCreatedAt),
  );
}

function formatImportDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type WorkspacePanelProps = {
  initialTransactions?: Transaction[];
  transactionsReady?: boolean;
  onTransactionsChange?: Dispatch<SetStateAction<Transaction[]>>;
};

export function WorkspacePanel({
  initialTransactions,
  transactionsReady,
  onTransactionsChange,
}: WorkspacePanelProps = {}) {
  const [tab, setTab] = useState<WorkspaceTab>("import");
  const [fileName, setFileName] = useState<string | null>(null);
  const [importedFiles, setImportedFiles] = useState<ImportedFile[]>([]);
  const [importedTransactions, setImportedTransactions] = useState<Transaction[]>(
    initialTransactions ?? [],
  );
  const [ready, setReady] = useState(Boolean(transactionsReady && initialTransactions));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [parseStatus, setParseStatus] = useState<
    | { state: "parsing" }
    | { state: "saving" }
    | { state: "error"; message: string }
    | null
  >(null);
  const objectUrls = useRef<string[]>([]);

  useEffect(() => {
    if (initialTransactions) {
      setImportedTransactions(initialTransactions);
      setReady(Boolean(transactionsReady));
    }
  }, [initialTransactions, transactionsReady]);

  useEffect(() => {
    if (initialTransactions) return;
    let cancelled = false;
    getTransactions()
      .then((rows) => {
        if (!cancelled) {
          setImportedTransactions(rows);
          setLoadError(null);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setLoadError(getErrorMessage(caught, "Unable to load imported transactions."));
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [initialTransactions]);

  useEffect(() => {
    return () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const syncTransactions = (updater: SetStateAction<Transaction[]>) => {
    setImportedTransactions(updater);
    onTransactionsChange?.(updater);
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      setFileName(null);
      return;
    }

    setFileName(file.name);
    const url = URL.createObjectURL(file);
    objectUrls.current.push(url);
    setImportedFiles((current) => [{ name: file.name, url }, ...current]);

    setParseStatus({ state: "parsing" });
    try {
      const risk = await getRiskSettings().catch(() => null);
      const rows = await parseTransactionsFile(
        file,
        risk
          ? {
              amountAlert: risk.amountAlert,
              highRiskThreshold: risk.highRiskThreshold,
              mediumRiskThreshold: risk.mediumRiskThreshold,
            }
          : undefined,
      );
      if (rows.length === 0) {
        setParseStatus({
          state: "error",
          message: "No transaction rows were found in that file.",
        });
        return;
      }

      setParseStatus({ state: "saving" });
      const saved = await importTransactions(file.name, rows);
      syncTransactions((current) => [...saved, ...current]);
      setParseStatus(null);
    } catch (error) {
      setParseStatus({
        state: "error",
        message: getErrorMessage(error, "Could not read that file."),
      });
    }
  };

  const importHistory = buildImportHistory(importedTransactions);
  const flagged = importedTransactions.filter((txn) => txn.status !== "clear");

  const handleStatusChange = async (
    transactionId: string,
    status: Transaction["status"],
  ) => {
    try {
      const updated = await updateTransactionStatus(transactionId, status);
      syncTransactions((current) =>
        current.map((row) => (row.id === transactionId ? updated : row)),
      );
    } catch (error) {
      setParseStatus({
        state: "error",
        message: getErrorMessage(error, "Unable to update transaction status."),
      });
    }
  };

  const handleClearImported = async () => {
    if (importedTransactions.length === 0) return;
    if (!window.confirm("Remove all imported transactions from your account?")) return;
    try {
      await clearTransactions();
      syncTransactions([]);
      setImportedFiles([]);
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.current = [];
    } catch (error) {
      setParseStatus({
        state: "error",
        message: getErrorMessage(error, "Unable to clear imported transactions."),
      });
    }
  };

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-hairline px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <SegmentedTabs
          tabs={workspaceTabs}
          value={tab}
          onChange={setTab}
          ariaLabel="Workspace"
        />
      </div>

      <div className="p-5 sm:p-6">
        {loadError ? (
          <p className="mb-4 text-sm text-[#9f1239]" role="alert">
            {loadError}
          </p>
        ) : null}

        {tab === "import" ? (
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <label className="relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[14px] border border-dashed border-line bg-canvas px-6 py-12 text-center transition-colors hover:border-primary">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-sunken text-primary">
                <Icon name="upload" className="h-6 w-6" />
              </div>
              <p className="mt-4 text-[16px] font-semibold text-ink">
                Import transactions
              </p>
              <p className="mt-2 max-w-[36ch] text-[14px] font-light leading-[1.7] text-subtle">
                CSV, JSON, or Excel files. Rows are parsed in your browser
                and saved to your account.
              </p>
              <span className="mt-5 inline-flex rounded-[10px] bg-ink px-4 py-2 text-[13.5px] font-semibold text-white">
                Choose file
              </span>
              {fileName ? (
                <p className="mt-3 text-[13.5px] font-medium text-primary">
                  {fileName}
                </p>
              ) : null}
              {parseStatus?.state === "parsing" ? (
                <p className="mt-1 text-[12.5px] text-subtle">
                  Reading transactions…
                </p>
              ) : null}
              {parseStatus?.state === "saving" ? (
                <p className="mt-1 text-[12.5px] text-subtle">
                  Saving to your account…
                </p>
              ) : null}
              {parseStatus?.state === "error" ? (
                <p className="mt-1 text-[12.5px] text-red-600">
                  {parseStatus.message}
                </p>
              ) : null}
              <input
                type="file"
                className="absolute inset-0 cursor-pointer opacity-0"
                accept=".csv,.json,.xlsx,.xls"
                onChange={handleFile}
              />
            </label>

            <div>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[15px] font-semibold text-ink">
                  Recent imports
                </h3>
                {importedTransactions.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleClearImported}
                    className="text-[12.5px] font-semibold text-red-600 hover:underline"
                  >
                    Clear imported data
                  </button>
                ) : null}
              </div>
              {!ready ? (
                <p className="mt-3 text-[13.5px] font-light text-subtle">Loading imports…</p>
              ) : importHistory.length > 0 ? (
                <ul className="mt-3 divide-y divide-hairline rounded-[12px] border border-hairline">
                  {importHistory.map((group) => {
                    const liveFile = importedFiles.find(
                      (item) => item.name === group.filename,
                    );
                    return (
                      <li
                        key={group.filename}
                        className="flex items-start justify-between gap-3 px-4 py-3.5"
                      >
                        <div className="min-w-0">
                          {liveFile ? (
                            <a
                              href={liveFile.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate text-[14px] font-semibold text-primary hover:underline"
                            >
                              {group.filename}
                            </a>
                          ) : (
                            <p className="truncate text-[14px] font-semibold text-ink">
                              {group.filename}
                            </p>
                          )}
                          <p className="mt-0.5 text-[12.5px] text-subtle">
                            {group.recordCount.toLocaleString()} records ·{" "}
                            {formatImportDate(group.latestCreatedAt)}
                          </p>
                        </div>
                        <Icon
                          name="check-circle"
                          className="mt-0.5 h-4.5 w-4.5 shrink-0 text-primary"
                        />
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 rounded-[12px] border border-dashed border-line px-4 py-6 text-[13.5px] font-light text-subtle">
                  No imports yet. Upload a CSV, JSON, or Excel file to populate your ledger.
                </p>
              )}
            </div>
          </div>
        ) : null}

        {tab === "transactions" ? (
          !ready ? (
            <p className="text-[14px] font-light text-subtle">Loading transactions…</p>
          ) : importedTransactions.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-line px-5 py-10 text-center">
              <p className="text-[15px] font-medium text-body">No imported transactions yet.</p>
              <p className="mt-2 text-[13.5px] font-light text-subtle">
                Use the Import tab to upload a ledger file.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="border-b border-hairline text-[12px] font-semibold tracking-[0.08em] text-subtle uppercase">
                    <th className="pb-3 pr-4 font-semibold">ID</th>
                    <th className="pb-3 pr-4 font-semibold">Merchant</th>
                    <th className="pb-3 pr-4 font-semibold">Amount</th>
                    <th className="pb-3 pr-4 font-semibold">Date</th>
                    <th className="pb-3 pr-4 font-semibold">Risk</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {importedTransactions.map((txn) => (
                    <tr key={txn.id} className="border-b border-hairline last:border-0">
                      <td className="py-3.5 pr-4 text-[13.5px] font-semibold text-ink">
                        {txn.external_id ?? txn.id.slice(0, 8)}
                      </td>
                      <td className="py-3.5 pr-4 text-[13.5px] text-body">
                        {txn.merchant}
                      </td>
                      <td className="py-3.5 pr-4 text-[13.5px] font-medium text-ink">
                        {formatCurrency(txn.amount, txn.currency)}
                      </td>
                      <td className="py-3.5 pr-4 text-[13.5px] text-subtle">
                        {txn.date}
                      </td>
                      <td className="py-3.5 pr-4 text-[13.5px] font-semibold text-ink">
                        {txn.riskScore}%
                      </td>
                    <td className="py-3.5">
                      <div className="flex flex-col gap-2">
                        <StatusBadge status={txn.status} />
                        <select
                          className="rounded-[8px] border border-line bg-white px-2 py-1 text-[12px] text-ink"
                          value={txn.status}
                          onChange={(event) =>
                            void handleStatusChange(
                              txn.id,
                              event.target.value as Transaction["status"],
                            )
                          }
                        >
                          <option value="flagged">Flagged</option>
                          <option value="review">Review</option>
                          <option value="clear">Clear</option>
                        </select>
                      </div>
                    </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}

        {tab === "fraud" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {!ready ? (
              <p className="text-[14px] font-light text-subtle sm:col-span-2">
                Loading flagged imports…
              </p>
            ) : flagged.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-line px-5 py-10 text-center sm:col-span-2">
                <p className="text-[15px] font-medium text-body">
                  No flagged imported transactions.
                </p>
                <p className="mt-2 text-[13.5px] font-light text-subtle">
                  Statement findings live in Explainable AI. Import heuristics only flag ledger rows.
                </p>
              </div>
            ) : (
              flagged.map((txn) => (
                <div
                  key={txn.id}
                  className="rounded-[12px] border border-hairline p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-semibold text-subtle">
                        {txn.external_id ?? txn.id.slice(0, 8)}
                      </p>
                      <p className="mt-1 text-[15px] font-semibold text-ink">
                        {txn.merchant}
                      </p>
                    </div>
                    <StatusBadge status={txn.status} />
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <p className="text-[18px] font-bold text-ink">
                      {formatCurrency(txn.amount, txn.currency)}
                    </p>
                    <p className="text-[13.5px] font-semibold text-primary">
                      {txn.riskScore}% risk
                    </p>
                  </div>
                  <select
                    className="mt-3 w-full rounded-[8px] border border-line bg-white px-2 py-1.5 text-[12px] text-ink"
                    value={txn.status}
                    onChange={(event) =>
                      void handleStatusChange(
                        txn.id,
                        event.target.value as Transaction["status"],
                      )
                    }
                  >
                    <option value="flagged">Flagged</option>
                    <option value="review">Review</option>
                    <option value="clear">Clear</option>
                  </select>
                </div>
              ))
            )}
            <div className="sm:col-span-2">
              <ActionButton href="/dashboard/explainable-ai" variant="secondary">
                Open Explainable AI
                <Icon name="arrow-right" className="h-4 w-4" strokeWidth={2} />
              </ActionButton>
            </div>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
