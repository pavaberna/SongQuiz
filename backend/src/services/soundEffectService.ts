import { readFile } from "fs/promises";
import path from "path";

import {
  isRandomizedSoundEffectKey,
  soundEffectFiles,
  type SoundEffectKey,
} from "../config/soundEffects";

const previousFileByKey = new Map<SoundEffectKey, string>();

function selectSoundEffectFile(key: SoundEffectKey): string {
  const files: readonly string[] = soundEffectFiles[key];

  if (files.length === 0) {
    throw new Error(`No audio file is configured for ${key}.`);
  }

  if (!isRandomizedSoundEffectKey(key) || files.length === 1) {
    return files[0];
  }

  const previousFile = previousFileByKey.get(key);
  const availableFiles = files.filter((file) => file !== previousFile);
  const selectedFile =
    availableFiles[Math.floor(Math.random() * availableFiles.length)];

  previousFileByKey.set(key, selectedFile);

  return selectedFile;
}

export async function readSoundEffect(
  key: SoundEffectKey,
): Promise<Buffer> {
  const selectedFile = selectSoundEffectFile(key);
  const assetPath = path.join(
    __dirname,
    "..",
    "assets",
    selectedFile,
  );

  return readFile(assetPath);
}
