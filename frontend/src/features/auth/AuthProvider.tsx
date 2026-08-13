import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  getAuthenticatedUser,
  loginWithGoogle,
  logout as requestLogout,
} from "../../api/authApi";
import { AUTHENTICATION_EXPIRED_EVENT } from "../../api/apiFetch";
import type { AuthUser } from "../../types/auth";
import { AuthContext, type AuthContextValue } from "./authContext";

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let isMounted = true;

    void getAuthenticatedUser()
      .then((authenticatedUser) => {
        if (isMounted) {
          setUser(authenticatedUser);
        }
      })
      .catch((error: unknown) => console.error(error))
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    function handleAuthenticationExpired(): void {
      setUser(null);
    }

    window.addEventListener(
      AUTHENTICATION_EXPIRED_EVENT,
      handleAuthenticationExpired,
    );

    return () => {
      isMounted = false;
      window.removeEventListener(
        AUTHENTICATION_EXPIRED_EVENT,
        handleAuthenticationExpired,
      );
    };
  }, []);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      async login(credential) {
        const authenticatedUser = await loginWithGoogle(credential);
        setUser(authenticatedUser);
      },
      async logout() {
        await requestLogout();
        setUser(null);
      },
      user,
    }),
    [isLoading, user],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
