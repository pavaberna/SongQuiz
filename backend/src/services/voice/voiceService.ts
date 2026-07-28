import type { GameLanguage } from "../../types/language";
import { enVoiceLines } from "./enVoice";
import { huVoiceLines } from "./huVoice";
import type {
  VoiceLineCatalog,
  VoiceLineKey,
  VoiceLineParams,
} from "./voiceTypes";

const voiceLinesByLanguage: Record<GameLanguage, VoiceLineCatalog> = {
  hu: huVoiceLines,
  en: enVoiceLines,
};

export function getVoiceLine(
  language: GameLanguage,
  key: VoiceLineKey,
  params: VoiceLineParams = {},
): string {
  const voiceLine = voiceLinesByLanguage[language][key];

  if (typeof voiceLine === "function") {
    return voiceLine(params);
  }

  return voiceLine;
}
