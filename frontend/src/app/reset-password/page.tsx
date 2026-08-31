import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordContent } from "@/components/auth/ResetPasswordContent";

export const metadata: Metadata = {
  title: "Reset password — Detechtico",
  description: "Choose a new Detechtico account password.",
};

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-dvh place-items-center bg-canvas">
          <p className="text-[14.5px] font-medium text-subtle">Loading…</p>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
