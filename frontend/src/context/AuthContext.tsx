"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  confirmSignup as confirmSignupRequest,
  getMe,
  login as loginRequest,
  logout as logoutRequest,
  requestSignup as requestSignupApi,
} from "@/lib/api";
import type { User } from "@/lib/api-types";

type AuthContextValue = {
  user: User | null;
  isLoggedIn: boolean;
  isReady: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<User>;
  requestSignup: (input: {
    name: string;
    email: string;
    password: string;
    acceptedTerms: boolean;
  }) => Promise<{
    message: string;
    email: string;
    expires_in_seconds: number;
    resend_after_seconds: number;
  }>;
  confirmSignup: (email: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  setUser: (user: User | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getMe()
      .then((current) => {
        if (!cancelled) setUser(current);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const current = await loginRequest(email, password, remember);
    setUser(current);
    return current;
  }, []);

  const requestSignup = useCallback(
    async (input: {
      name: string;
      email: string;
      password: string;
      acceptedTerms: boolean;
    }) => {
      return requestSignupApi({
        name: input.name,
        email: input.email,
        password: input.password,
        accepted_terms: input.acceptedTerms,
      });
    },
    [],
  );

  const confirmSignup = useCallback(async (email: string, otp: string) => {
    const current = await confirmSignupRequest(email, otp);
    setUser(current);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const current = await getMe();
    setUser(current);
    return current;
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoggedIn: Boolean(user),
      isReady,
      login,
      requestSignup,
      confirmSignup,
      logout,
      refreshUser,
      setUser,
    }),
    [user, isReady, login, requestSignup, confirmSignup, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
