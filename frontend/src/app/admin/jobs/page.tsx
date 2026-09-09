import { Suspense } from "react";
import { AdminJobsContent } from "@/components/admin/AdminJobsContent";

export default function AdminJobsPage() {
  return (
    <Suspense fallback={<p className="text-[14.5px] text-subtle">Loading jobs…</p>}>
      <AdminJobsContent />
    </Suspense>
  );
}
