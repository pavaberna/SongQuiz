import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { GameLanguage } from "../../types/language";
import type { VoiceLineKey } from "./voiceTypes";

const runtimeDir = path.join(process.cwd(), "runtime");
const voiceLinesDir = path.join(runtimeDir, "voice-lines");

function getVoiceLineAudioPath(
  language: GameLanguage,
  key: VoiceLineKey,
): string {
  return path.join(voiceLinesDir, language, `${key}.mp3`);
}

export async function readVoiceLineAudio(
  language: GameLanguage,
  key: VoiceLineKey,
): Promise<Buffer | null> {
  try {
    return await readFile(getVoiceLineAudioPath(language, key));
  } catch (error) {
    return null;
  }
}

export async function saveVoiceLineAudio(
  language: GameLanguage,
  key: VoiceLineKey,
  audioBuffer: Buffer,
): Promise<void> {
  const filePath = getVoiceLineAudioPath(language, key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, audioBuffer);
}
