"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ActionButton } from "@/components/dashboard/ActionButton";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel } from "@/components/dashboard/Panel";
import { StepUpModal, withStepUpRetry } from "@/components/admin/StepUpModal";
import {
  abandonAdminJob,
  listAdminJobs,
  requeueAdminJob,
  revealAdminDocument,
} from "@/lib/api";
import { getErrorMessage, type AdminJobItem } from "@/lib/api-types";
import { fieldClassName } from "@/data/admin";
import { useAuth } from "@/context/AuthContext";

export function AdminJobsContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [status, setStatus] = useState("");
  const [stuck, setStuck] = useState(searchParams.get("stuck") === "1");
  const [items, setItems] = useState<AdminJobItem[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);

  const load = async () => {
    try {
      const data = await listAdminJobs({
        status: status || undefined,
        stuck: stuck || undefined,
      });
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (caught) {
      setError(getErrorMessage(caught, "Unable to load jobs."));
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runPrivileged = async (action: () => Promise<void>) => {
    setError(null);
    const result = await withStepUpRetry(action, () => {
      setPendingAction(() => action);
      setStepUpOpen(true);
    });
    if (result !== undefined) await load();
  };

  const isSuper = user?.staff_role === "superadmin";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analysis jobs"
        description="Monitor stuck or failed jobs. Requeue is capped per job row; re-uploads create a fresh job."
      />

      <Panel className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <label className="flex-1 text-[13px] font-semibold text-ink">
          Status
          <select
            className={fieldClassName}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All</option>
            <option value="queued">queued</option>
            <option value="running">running</option>
            <option value="failed">failed</option>
            <option value="succeeded">succeeded</option>
            <option value="abandoned">abandoned</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-[14px] text-ink">
          <input
            type="checkbox"
            checked={stuck}
            onChange={(event) => setStuck(event.target.checked)}
          />
          Stuck only
        </label>
        <ActionButton type="button" onClick={() => void load()}>
          Refresh
        </ActionButton>
      </Panel>

      {error ? <p className="text-[14px] text-[#9f1239]">{error}</p> : null}
      {message ? <p className="text-[14px] font-medium text-primary-deep">{message}</p> : null}

      <Panel className="overflow-hidden">
        <div className="border-b border-hairline px-5 py-3 text-[13px] text-subtle">
          {total} job{total === 1 ? "" : "s"}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[14px]">
            <thead className="bg-sunken text-[12px] uppercase tracking-[0.06em] text-subtle">
              <tr>
                <th className="px-5 py-3 font-semibold">Job</th>
                <th className="px-5 py-3 font-semibold">User</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Retries</th>
                <th className="px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((job) => (
                <tr key={job.id} className="border-t border-hairline align-top">
                  <td className="px-5 py-3">
                    <p className="font-mono text-[12.5px]">{job.id.slice(0, 8)}</p>
                    <p className="text-[13px] text-subtle">{job.original_filename}</p>
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/admin/users/${job.user_id}`} className="text-primary">
                      {job.user_email}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    {job.status}
                    {job.error_code ? ` · ${job.error_code}` : ""}
                  </td>
                  <td className="px-5 py-3">{job.retry_count}</td>
                  <td className="px-5 py-3">
                    {isSuper ? (
                      <div className="flex flex-wrap gap-2">
                        <ActionButton
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            void runPrivileged(async () => {
                              await requeueAdminJob(job.id);
                              setMessage("Job requeued.");
                            })
                          }
                        >
                          Requeue
                        </ActionButton>
                        <ActionButton
                          type="button"
                          size="sm"
                          variant="danger"
                          onClick={() =>
                            void runPrivileged(async () => {
                              await abandonAdminJob(job.id);
                              setMessage("Job abandoned.");
                            })
                          }
                        >
                          Abandon
                        </ActionButton>
                        <ActionButton
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            void runPrivileged(async () => {
                              const reveal = await revealAdminDocument(job.document_id);
                              setMessage(
                                `Reveal until ${new Date(reveal.expires_at).toLocaleString()} · ${reveal.original_filename} · ${reveal.size_bytes} bytes`,
                              );
                            })
                          }
                        >
                          Reveal meta
                        </ActionButton>
                      </div>
                    ) : (
                      <span className="text-subtle">View only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

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
