import { createContext, useContext } from "react";

import type { AuthUser } from "../../types/auth";

export type AuthContextValue = {
  isLoading: boolean;
  login: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  user: AuthUser | null;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
