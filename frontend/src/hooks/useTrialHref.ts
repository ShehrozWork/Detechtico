"use client";

import { useAuth } from "@/context/AuthContext";

export function useTrialHref() {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? "/dashboard" : "/signup";
}
