import type { ReactNode } from "react";

import type { GameLanguage } from "../../types/language";
import { AppFooter } from "./AppFooter";

type AppLayoutProps = {
  children: ReactNode;
  language: GameLanguage;
};

export function AppLayout({ children, language }: AppLayoutProps) {
  return (
    <div className="song-app-background song-app-shell flex w-full min-w-0 flex-col">
      <div className="relative z-10 flex min-w-0 flex-1">{children}</div>
      <AppFooter language={language} />
    </div>
  );
}
