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
    <footer className="relative z-20 flex min-h-12 items-center justify-center border-t border-neutral-900 bg-black/80 px-4 py-3 text-center text-xs text-neutral-500 backdrop-blur">
      <p>
        © {currentYear} Song Quiz · {createdByText[language]} Mónok-Páva
        Bernadett
      </p>
    </footer>
  );
}
