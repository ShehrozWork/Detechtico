import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginContent } from "@/components/auth/LoginContent";

export const metadata: Metadata = {
  title: "Log in — Detechtico",
  description: "Log in to your Detechtico account to access the platform.",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-dvh place-items-center bg-canvas">
          <p className="text-[14.5px] font-medium text-subtle">Loading…</p>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
