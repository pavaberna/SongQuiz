import type { GameLanguage } from "../../types/language";

type AppFooterProps = {
  language: GameLanguage;
};

const createdByText = {
  en: "Created by",
  hu: "Készítette",
};

export function AppFooter({ language }: AppFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="song-app-footer relative z-20 mt-auto flex min-h-12 shrink-0 items-center justify-center border-t border-neutral-900 bg-black/80 px-4 pt-3 text-center text-xs text-neutral-500 backdrop-blur">
      <p>
        © {currentYear} Song Quiz · {createdByText[language]}: Mónok-Páva
        Bernadett
      </p>
    </footer>
  );
}
