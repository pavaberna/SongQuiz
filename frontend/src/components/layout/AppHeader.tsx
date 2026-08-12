import { Radio } from "lucide-react";
import type { ReactNode } from "react";

import type { GameLanguage } from "../../types/language";
import { FlagIcon, type FlagCountry } from "../ui/FlagIcon";
import { Select, type SelectOption } from "../ui/Select";

type AppHeaderProps = {
  centerContent?: ReactNode;
  isLanguageLocked?: boolean;
  language: GameLanguage;
  onLanguageChange?: (language: GameLanguage) => void;
};

const languageOptions: readonly SelectOption[] = [
  {
    icon: <FlagIcon country="hu" />,
    label: "Magyar",
    value: "hu",
  },
  {
    icon: <FlagIcon country="gb" />,
    label: "English",
    value: "en",
  },
];

const languageDetails: Record<
  GameLanguage,
  { country: FlagCountry; label: string }
> = {
  en: { country: "gb", label: "English" },
  hu: { country: "hu", label: "Magyar" },
};

export function AppHeader({
  centerContent,
  isLanguageLocked = false,
  language,
  onLanguageChange,
}: AppHeaderProps) {
  const selectedLanguage = languageDetails[language];

  return (
    <header className="relative z-20 mx-auto grid w-full max-w-6xl grid-cols-2 items-center gap-4 md:grid-cols-[1fr_minmax(18rem,30rem)_1fr]">
      <div className="flex items-center gap-3 justify-self-start">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-fuchsia-400/40 bg-black shadow-[0_0_22px_rgba(217,70,239,0.35)]">
          <Radio className="h-5 w-5 text-cyan-300" />
        </div>

        <p className="bg-gradient-to-r from-fuchsia-300 via-purple-200 to-cyan-300 bg-clip-text text-lg font-black tracking-[0.24em] text-transparent">
          SONG QUIZ
        </p>
      </div>

      {centerContent && (
        <div className="col-span-2 row-start-2 flex w-full justify-center md:col-span-1 md:col-start-2 md:row-start-1">
          {centerContent}
        </div>
      )}

      <div className="w-40 justify-self-end md:col-start-3 md:row-start-1">
        {isLanguageLocked || !onLanguageChange ? (
          <div className="flex h-11 w-full items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950/80 px-4 text-sm font-semibold text-foreground shadow-inner">
            <FlagIcon country={selectedLanguage.country} />
            <span>{selectedLanguage.label}</span>
          </div>
        ) : (
          <Select
            id="language"
            onValueChange={(value) =>
              onLanguageChange(value as GameLanguage)
            }
            options={languageOptions}
            value={language}
          />
        )}
      </div>
    </header>
  );
}
