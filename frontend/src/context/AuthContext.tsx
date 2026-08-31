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
import { getMe, login as loginRequest, logout as logoutRequest, signup as signupRequest } from "@/lib/api";
import type { User } from "@/lib/api-types";

type AuthContextValue = {
  user: User | null;
  isLoggedIn: boolean;
  isReady: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  signup: (input: {
    name: string;
    email: string;
    password: string;
    acceptedTerms: boolean;
  }) => Promise<void>;
  logout: () => Promise<void>;
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
  }, []);

  const signup = useCallback(
    async (input: {
      name: string;
      email: string;
      password: string;
      acceptedTerms: boolean;
    }) => {
      const current = await signupRequest({
        name: input.name,
        email: input.email,
        password: input.password,
        accepted_terms: input.acceptedTerms,
      });
      setUser(current);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoggedIn: Boolean(user),
      isReady,
      login,
      signup,
      logout,
    }),
    [user, isReady, login, signup, logout],
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
