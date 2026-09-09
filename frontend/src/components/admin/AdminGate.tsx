"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type AdminGateProps = {
  children: ReactNode;
};

export function AdminGate({ children }: AdminGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoggedIn, isReady } = useAuth();

  useEffect(() => {
    if (!isReady) return;
    if (!isLoggedIn) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!user?.is_staff && !user?.staff_role) {
      router.replace("/");
      return;
    }
    const onSecurity = pathname === "/admin/security";
    if (!user.totp_enrolled && !onSecurity) {
      router.replace("/admin/security");
    }
  }, [isLoggedIn, isReady, pathname, router, user]);

  if (!isReady || !isLoggedIn || (!user?.is_staff && !user?.staff_role)) {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas px-5">
        <p className="text-[14.5px] font-medium text-subtle">Checking staff access…</p>
      </div>
    );
  }

  if (!user.totp_enrolled && pathname !== "/admin/security") {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas px-5">
        <p className="text-[14.5px] font-medium text-subtle">Redirecting to security setup…</p>
      </div>
    );
  }

  return children;
}
