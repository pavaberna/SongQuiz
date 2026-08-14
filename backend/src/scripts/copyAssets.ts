import { copyFile, mkdir, readdir } from "fs/promises";
import path from "path";

import { soundEffectFiles } from "../config/soundEffects";

async function copyAssets(): Promise<void> {
  const sourceDirectory = path.join(process.cwd(), "src", "assets");
  const targetDirectory = path.join(process.cwd(), "dist", "assets");
  const files = await readdir(sourceDirectory);
  const configuredFiles = Object.values(soundEffectFiles).flat();
  const missingFiles = configuredFiles.filter((file) => !files.includes(file));

  if (missingFiles.length > 0) {
    throw new Error(
      `Missing sound effect assets: ${missingFiles.join(", ")}`,
    );
  }

  await mkdir(targetDirectory, { recursive: true });

  await Promise.all(
    files
      .filter((file) => file.toLowerCase().endsWith(".mp3"))
      .map((file) =>
        copyFile(
          path.join(sourceDirectory, file),
          path.join(targetDirectory, file),
        ),
      ),
  );
}

void copyAssets();
