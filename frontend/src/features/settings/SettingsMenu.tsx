import { Download, Settings, Trash2 } from "lucide-react";
import { useState } from "react";

import {
  MAX_SONGS_PER_PLAYER,
  MIN_SONGS_PER_PLAYER,
} from "../../config/gameSettings";
import type { GameLanguage } from "../../types/language";
import type {
  GameSettings,
  HungarianSongMode,
} from "../../types/settings";
import type { GameLogUserSummary } from "../../types/gameLog";
import {
  clearGameLog,
  downloadGameLog,
  readGameLogUsers,
} from "../../services/gameLogStore";

type SettingsMenuProps = {
  disabled?: boolean;
  isAdmin?: boolean;
  language: GameLanguage;
  onChange: (settings: GameSettings) => void;
  settings: GameSettings;
};

const textByLanguage = {
  hu: {
    foreignOnly: "Kikapcsolva",
    clearLog: "Napló törlése",
    downloadLog: "Napló letöltése",
    hungarianOnly: "Mind",
    mixed: "Vegyes",
    musicOrigin: "Magyar zenék",
    playAnswerSoundEffects: "Válaszeffektek",
    playRules: "Játékszabályok felolvasása",
    settings: "Beállítások",
    songsPerPlayer: "Dalok játékosonként",
    testLog: "Tesztelési napló",
    logUser: "Felhasználó",
    loadingLogs: "Naplók betöltése...",
    noLogUsers: "Még nincs felhasználói napló.",
  },
  en: {
    foreignOnly: "Off",
    clearLog: "Clear log",
    downloadLog: "Download log",
    hungarianOnly: "All",
    mixed: "Mixed",
    musicOrigin: "Hungarian songs",
    playAnswerSoundEffects: "Answer sound effects",
    playRules: "Read the game rules",
    settings: "Settings",
    songsPerPlayer: "Songs per player",
    testLog: "Test log",
    logUser: "User",
    loadingLogs: "Loading logs...",
    noLogUsers: "There are no user logs yet.",
  },
};

export function SettingsMenu({
  disabled = false,
  isAdmin = false,
  language,
  onChange,
  settings,
}: SettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLogLoading, setIsLogLoading] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [logUsers, setLogUsers] = useState<GameLogUserSummary[]>([]);
  const [selectedLogUserKey, setSelectedLogUserKey] = useState("");
  const text = textByLanguage[language];
  const selectedLogUser = logUsers.find(
    (user) => user.userStorageKey === selectedLogUserKey,
  );

  async function refreshLogUsers(): Promise<void> {
    setIsLogLoading(true);
    setLogError(null);

    try {
      const users = await readGameLogUsers();

      setLogUsers(users);
      setSelectedLogUserKey((currentKey) =>
        users.some((user) => user.userStorageKey === currentKey)
          ? currentKey
          : (users[0]?.userStorageKey ?? ""),
      );
    } catch (error) {
      console.error("Failed to load the test log.", error);
      setLogError(
        error instanceof Error ? error.message : "Unknown log error.",
      );
    } finally {
      setIsLogLoading(false);
    }
  }

  const songModeOptions: Array<{
    label: string;
    value: HungarianSongMode;
  }> = [
    { label: text.hungarianOnly, value: "hungarian_only" },
    { label: text.mixed, value: "mixed" },
    { label: text.foreignOnly, value: "foreign_only" },
  ];

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <button
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-neutral-800 bg-neutral-950/80 text-neutral-200 shadow-inner transition-colors hover:border-fuchsia-400/60 hover:text-fuchsia-200 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/20 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={disabled}
        onClick={() => {
          if (!isOpen && isAdmin) {
            void refreshLogUsers();
          }

          setIsOpen((currentValue) => !currentValue);
        }}
        title={text.settings}
        type="button"
      >
        <Settings className="h-5 w-5" />
      </button>

      {isOpen && !disabled && (
        <div className="fixed left-4 right-4 top-20 z-30 max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain rounded-panel border border-fuchsia-400/30 bg-neutral-950/95 p-4 text-left shadow-[0_0_32px_rgba(217,70,239,0.2)] backdrop-blur-xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[min(22rem,calc(100vw-2.5rem))] sm:p-5">
          <h2 className="text-base font-black text-white">{text.settings}</h2>

          <div className="mt-5 border-t border-neutral-800 pt-4">
            <p className="mb-3 text-sm font-bold text-neutral-200">
              {text.musicOrigin}
            </p>

            <div className="grid grid-cols-3 gap-1 rounded-control border border-neutral-800 bg-black p-1">
              {songModeOptions.map((option) => {
                const isSelected =
                  settings.hungarianSongMode === option.value;

                return (
                  <button
                    className={`min-h-10 min-w-0 rounded-control px-1 py-2 text-[0.6875rem] font-bold leading-tight transition-colors sm:px-2 sm:text-xs ${
                      isSelected
                        ? "bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-[0_0_14px_rgba(217,70,239,0.28)]"
                        : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
                    }`}
                    key={option.value}
                    onClick={() =>
                      onChange({
                        ...settings,
                        hungarianSongMode: option.value,
                      })
                    }
                    type="button"
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 border-t border-neutral-800 pt-4">
            <div className="mb-3 flex items-center justify-between gap-4">
              <label
                className="text-sm font-bold text-neutral-200"
                htmlFor="songs-per-player"
              >
                {text.songsPerPlayer}
              </label>
              <span className="min-w-9 rounded-control bg-cyan-500/15 px-2 py-1 text-center text-sm font-black text-cyan-200">
                {settings.songsPerPlayer}
              </span>
            </div>

            <input
              className="w-full cursor-pointer accent-fuchsia-500"
              id="songs-per-player"
              max={MAX_SONGS_PER_PLAYER}
              min={MIN_SONGS_PER_PLAYER}
              onChange={(event) =>
                onChange({
                  ...settings,
                  songsPerPlayer: Number(event.target.value),
                })
              }
              type="range"
              value={settings.songsPerPlayer}
            />

            <div className="mt-1 flex justify-between text-xs font-semibold text-neutral-500">
              <span>{MIN_SONGS_PER_PLAYER}</span>
              <span>{MAX_SONGS_PER_PLAYER}</span>
            </div>
          </div>

          <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 border-t border-neutral-800 pt-4 text-sm font-bold text-neutral-200">
            <span>{text.playRules}</span>
            <input
              checked={settings.playRules}
              className="h-5 w-5 shrink-0 cursor-pointer accent-fuchsia-500"
              onChange={(event) =>
                onChange({
                  ...settings,
                  playRules: event.target.checked,
                })
              }
              type="checkbox"
            />
          </label>

          <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 border-t border-neutral-800 pt-4 text-sm font-bold text-neutral-200">
            <span>{text.playAnswerSoundEffects}</span>
            <input
              checked={settings.playAnswerSoundEffects}
              className="h-5 w-5 shrink-0 cursor-pointer accent-fuchsia-500"
              onChange={(event) =>
                onChange({
                  ...settings,
                  playAnswerSoundEffects: event.target.checked,
                })
              }
              type="checkbox"
            />
          </label>

          {isAdmin && (
            <div className="mt-5 border-t border-neutral-800 pt-4">
              <div className="mb-3 flex items-center justify-between gap-4">
                <p className="text-sm font-bold text-neutral-200">
                  {text.testLog}
                </p>
                <span className="text-xs font-bold text-neutral-500">
                  {selectedLogUser?.entryCount ?? 0}
                </span>
              </div>

              {isLogLoading ? (
                <p className="text-xs font-semibold text-neutral-400">
                  {text.loadingLogs}
                </p>
              ) : logUsers.length === 0 ? (
                <p className="text-xs font-semibold text-neutral-400">
                  {text.noLogUsers}
                </p>
              ) : (
                <label className="mb-3 block text-xs font-bold text-neutral-300">
                  <span className="mb-2 block">{text.logUser}</span>
                  <select
                    className="h-10 w-full rounded-control border border-neutral-700 bg-black px-3 text-sm text-white outline-none transition-colors focus:border-fuchsia-400"
                    onChange={(event) =>
                      setSelectedLogUserKey(event.target.value)
                    }
                    value={selectedLogUserKey}
                  >
                    {logUsers.map((user) => (
                      <option
                        key={user.userStorageKey}
                        value={user.userStorageKey}
                      >
                        {user.email} ({user.entryCount})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {logError && (
                <p className="mb-3 text-xs font-semibold text-rose-300">
                  {logError}
                </p>
              )}

              <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
                <button
                  className="flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-control border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-100 transition-colors hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={
                    isLogLoading ||
                    !selectedLogUser ||
                    selectedLogUser.entryCount === 0
                  }
                  onClick={() => {
                    if (!selectedLogUser) {
                      return;
                    }

                    void downloadGameLog(selectedLogUser).catch(
                      (error: unknown) => {
                        console.error(
                          "Failed to download the test log.",
                          error,
                        );
                        setLogError(
                          error instanceof Error
                            ? error.message
                            : "Unknown log error.",
                        );
                      },
                    );
                  }}
                  type="button"
                >
                  <Download className="h-4 w-4" />
                  {text.downloadLog}
                </button>

                <button
                  className="flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-control border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-100 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={
                    isLogLoading ||
                    !selectedLogUser ||
                    selectedLogUser.entryCount === 0
                  }
                  onClick={() => {
                    if (!selectedLogUser) {
                      return;
                    }

                    void clearGameLog(selectedLogUser.userStorageKey)
                      .then(refreshLogUsers)
                      .catch((error: unknown) => {
                        console.error("Failed to clear the test log.", error);
                        setLogError(
                          error instanceof Error
                            ? error.message
                            : "Unknown log error.",
                        );
                      });
                  }}
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                  {text.clearLog}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
