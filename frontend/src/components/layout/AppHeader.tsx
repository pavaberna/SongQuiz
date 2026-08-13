import { LogOut, Radio } from "lucide-react";
import { useState, type ReactNode } from "react";

import { SettingsMenu } from "../../features/settings/SettingsMenu";
import type { GameLanguage } from "../../types/language";
import type { GameSettings } from "../../types/settings";
import { FlagIcon, type FlagCountry } from "../ui/FlagIcon";
import { Select, type SelectOption } from "../ui/Select";
import { useAuth } from "../../features/auth/authContext";

type AppHeaderProps = {
  centerContent?: ReactNode;
  isLanguageLocked?: boolean;
  isSettingsLocked?: boolean;
  language: GameLanguage;
  onLanguageChange?: (language: GameLanguage) => void;
  onSettingsChange: (settings: GameSettings) => void;
  settings: GameSettings;
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
  isSettingsLocked = false,
  language,
  onLanguageChange,
  onSettingsChange,
  settings,
}: AppHeaderProps) {
  const selectedLanguage = languageDetails[language];
  const { logout, user } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const logoutLabel =
    language === "hu" ? "Kijelentkezés" : "Sign out";

  async function handleLogout(): Promise<void> {
    setIsLoggingOut(true);

    try {
      await logout();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="relative z-20 mx-auto grid w-full max-w-6xl grid-cols-2 items-center gap-4 md:grid-cols-[1fr_minmax(18rem,30rem)_1fr]">
      <div className="flex items-center gap-3 justify-self-start">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-fuchsia-400/40 bg-black shadow-[0_0_22px_rgba(217,70,239,0.35)]">
          <Radio className="h-5 w-5 text-cyan-300" />
        </div>

        <p className="bg-gradient-to-r from-fuchsia-300 via-purple-200 to-cyan-300 bg-clip-text text-sm font-black tracking-[0.1em] text-transparent sm:text-lg sm:tracking-[0.24em]">
          SONG QUIZ
        </p>
      </div>

      {centerContent && (
        <div className="col-span-2 row-start-2 flex w-full justify-center md:col-span-1 md:col-start-2 md:row-start-1">
          {centerContent}
        </div>
      )}

      <div className="flex justify-self-end gap-2 md:col-start-3 md:row-start-1">
        <div className="w-12 sm:w-40">
          {isLanguageLocked || !onLanguageChange ? (
            <div className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-neutral-800 bg-neutral-950/80 px-3 text-sm font-semibold text-foreground shadow-inner sm:justify-start sm:px-4">
              <FlagIcon country={selectedLanguage.country} />
              <span className="hidden sm:inline">{selectedLanguage.label}</span>
            </div>
          ) : (
            <Select
              compactOnMobile
              id="language"
              onValueChange={(value) =>
                onLanguageChange(value as GameLanguage)
              }
              options={languageOptions}
              value={language}
            />
          )}
        </div>

        <SettingsMenu
          disabled={isSettingsLocked}
          key={isSettingsLocked ? "settings-locked" : "settings-unlocked"}
          language={language}
          onChange={onSettingsChange}
          settings={settings}
        />

        <button
          aria-label={logoutLabel}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-800 bg-neutral-950/80 text-neutral-300 transition-colors hover:border-fuchsia-400/50 hover:text-fuchsia-200 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={isSettingsLocked || isLoggingOut}
          onClick={() => void handleLogout()}
          title={`${logoutLabel}${user ? ` (${user.email})` : ""}`}
          type="button"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
