import type { ReactNode } from "react";

import type { GameLanguage } from "../../types/language";
import { AppFooter } from "./AppFooter";

type AppLayoutProps = {
  children: ReactNode;
  language: GameLanguage;
};

export function AppLayout({ children, language }: AppLayoutProps) {
  return (
    <div className="song-app-background flex min-h-dvh flex-col">
      <div className="relative z-10 flex flex-1">{children}</div>
      <AppFooter language={language} />
    </div>
  );
}
