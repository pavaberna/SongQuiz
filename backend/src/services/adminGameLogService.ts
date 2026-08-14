import { readGameLogForUser } from "./gameLogStore";
import { readUserProfiles } from "./userProfileStore";
import type { GameLogUserSummary } from "../types/gameLog";

export async function getGameLogUserSummaries(): Promise<
  GameLogUserSummary[]
> {
  const profiles = await readUserProfiles();
  const summaries = await Promise.all(
    profiles.map(async (profile): Promise<GameLogUserSummary> => {
      const entries = await readGameLogForUser(profile.userStorageKey);
      const lastEntry = entries.at(-1);

      return {
        email: profile.email,
        entryCount: entries.length,
        lastEntryAt: lastEntry?.createdAt ?? null,
        name: profile.name,
        userStorageKey: profile.userStorageKey,
      };
    }),
  );

  return summaries.sort((first, second) =>
    first.email.localeCompare(second.email),
  );
}
