import type { ReactNode } from "react";

import { useAuth } from "./authContext";
import { LoginPage } from "./LoginPage";

type AuthGateProps = {
  children: ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="song-app-background flex min-h-dvh items-center justify-center text-sm font-semibold text-neutral-300">
        Bejelentkezés ellenőrzése...
      </div>
    );
  }

  if (user === null) {
    return <LoginPage />;
  }

  return children;
}
