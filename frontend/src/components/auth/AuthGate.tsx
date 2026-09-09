"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isStaffUser } from "@/lib/staff";

type AuthGateProps = {
  children: ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoggedIn, isReady } = useAuth();

  useEffect(() => {
    if (!isReady) return;
    if (!isLoggedIn) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (isStaffUser(user)) {
      router.replace("/admin");
    }
  }, [isLoggedIn, isReady, pathname, router, user]);

  if (!isReady || !isLoggedIn) {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas px-5">
        <p className="text-[14.5px] font-medium text-subtle">Checking access…</p>
      </div>
    );
  }

  if (isStaffUser(user)) {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas px-5">
        <p className="text-[14.5px] font-medium text-subtle">Redirecting to admin…</p>
      </div>
    );
  }

  return children;
}
