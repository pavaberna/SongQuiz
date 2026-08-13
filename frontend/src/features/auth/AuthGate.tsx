import type { ReactNode } from "react";

import { AppFooter } from "../../components/layout/AppFooter";
import { useAuth } from "./authContext";
import { LoginPage } from "./LoginPage";

type AuthGateProps = {
  children: ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="song-app-background song-app-shell flex w-full min-w-0 flex-col text-sm font-semibold text-neutral-300">
        <div className="relative z-10 flex flex-1 items-center justify-center px-4 text-center">
          Bejelentkezés ellenőrzése...
        </div>
        <AppFooter language="hu" />
      </div>
    );
  }

  if (user === null) {
    return <LoginPage />;
  }

  return children;
}
