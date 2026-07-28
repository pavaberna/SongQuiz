import type { GameLanguage } from "../../types/language";
import { enVoiceLines } from "./enVoice";
import { huVoiceLines } from "./huVoice";
import type {
  VoiceLineCatalog,
  VoiceLineKey,
  VoiceLineParams,
} from "./voiceTypes";
import { requiredVoiceLineParams } from "./voiceTypes";

const voiceLinesByLanguage: Record<GameLanguage, VoiceLineCatalog> = {
  hu: huVoiceLines,
  en: enVoiceLines,
};

export function getVoiceLine(
  language: GameLanguage,
  key: VoiceLineKey,
  params: VoiceLineParams = {},
): string {
  const missingParams = getMissingVoiceLineParams(key, params);

  if (missingParams.length > 0) {
    throw new Error(
      `Missing voice line parameters: ${missingParams.join(", ")}.`,
    );
  }

  const voiceLine = voiceLinesByLanguage[language][key];

  if (typeof voiceLine === "function") {
    return voiceLine(params);
  }

  return voiceLine;
}

export function getMissingVoiceLineParams(
  key: VoiceLineKey,
  params: VoiceLineParams,
): (keyof VoiceLineParams)[] {
  const requiredParams = requiredVoiceLineParams[key] ?? [];

  return requiredParams.filter((paramName) => {
    const value = params[paramName];

    return value === undefined || value === null;
  });
}

export function voiceLineRequiresParams(key: VoiceLineKey): boolean {
  return (requiredVoiceLineParams[key]?.length ?? 0) > 0;
}
