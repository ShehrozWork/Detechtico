"use client";

import { useAuth } from "@/context/AuthContext";
import { postAuthHomePath } from "@/lib/staff";

export function useTrialHref() {
  const { user, isLoggedIn } = useAuth();
  return isLoggedIn ? postAuthHomePath(user) : "/signup";
}
