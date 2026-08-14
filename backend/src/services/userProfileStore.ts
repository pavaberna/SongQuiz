import { mkdir, readFile, readdir, writeFile } from "fs/promises";
import path from "path";

import { createUserStorageKey } from "../lib/requestContext";
import type { AuthUser } from "../types/auth";

export type StoredUserProfile = {
  email: string;
  name: string | null;
  updatedAt: string;
  userStorageKey: string;
};

const usersRuntimeDirectory = path.join(
  process.cwd(),
  "runtime",
  "users",
);

export async function saveUserProfile(user: AuthUser): Promise<void> {
  const userStorageKey = createUserStorageKey(user.googleSubject);
  const userRuntimeDirectory = path.join(
    usersRuntimeDirectory,
    userStorageKey,
  );
  const profile: StoredUserProfile = {
    email: user.email,
    name: user.name,
    updatedAt: new Date().toISOString(),
    userStorageKey,
  };

  await mkdir(userRuntimeDirectory, { recursive: true });
  await writeFile(
    path.join(userRuntimeDirectory, "profile.json"),
    JSON.stringify(profile, null, 2),
    "utf-8",
  );
}

export async function readUserProfiles(): Promise<StoredUserProfile[]> {
  const entries = await readdir(usersRuntimeDirectory, {
    withFileTypes: true,
  }).catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  });

  const profiles = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry): Promise<StoredUserProfile | null> => {
        try {
          const content = await readFile(
            path.join(usersRuntimeDirectory, entry.name, "profile.json"),
            "utf-8",
          );
          const profile = JSON.parse(content) as StoredUserProfile;

          return profile.userStorageKey === entry.name ? profile : null;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") {
            return null;
          }

          throw error;
        }
      }),
  );

  return profiles.filter(
    (profile): profile is StoredUserProfile => profile !== null,
  );
}
