import { buildAnswerJudgePrompt } from "../prompts/answerJudgePrompt";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { answerJudgeResponseSchema } from "../schemas/answerJudgeSchema";
import { JudgeSongAnswerParams, JudgeSongAnswerResult } from "../types/answer";

const GEMINI_MODEL = "gemini-3.1-flash-lite";

export async function judgeSongAnswer(
  params: JudgeSongAnswerParams,
): Promise<JudgeSongAnswerResult> {
  const startedAt = performance.now();
  const exactResult = judgeExactAnswer(params);

  if (exactResult !== null) {
    console.info(
      `[timing] answer judge total=${Math.round(performance.now() - startedAt)}ms source=local`,
    );
    return exactResult;
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }
  const ai = new GoogleGenAI({ apiKey });
  const prompt = buildAnswerJudgePrompt(params);

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      maxOutputTokens: 150,
      responseJsonSchema: answerJudgeResponseSchema,
      responseMimeType: "application/json",
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.MINIMAL,
      },
    },
  });
  const rawText = response.text?.trim();
  if (!rawText) {
    throw new Error("No response from Gemini API.");
  }

  const jsonText = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const parsed = JSON.parse(jsonText) as Record<string, unknown>;

  if (
    typeof parsed.artistCorrect !== "boolean" ||
    typeof parsed.titleCorrect !== "boolean" ||
    typeof parsed.fullArtistMatch !== "boolean" ||
    typeof parsed.fullTitleMatch !== "boolean" ||
    typeof parsed.reason !== "string"
  ) {
    throw new Error("Invalid answer judge response from Gemini.");
  }

  const result = {
    artistCorrect: parsed.artistCorrect,
    titleCorrect: parsed.titleCorrect,
    perfectMatch: parsed.fullArtistMatch && parsed.fullTitleMatch,
    reason: parsed.reason,
  };

  console.info(
    `[timing] answer judge total=${Math.round(performance.now() - startedAt)}ms source=gemini`,
  );

  return result;
}

export function calculateAnswerPoints(result: JudgeSongAnswerResult): number {
  let score: number = 0;
  if (result.perfectMatch) score += 25;
  else if (result.artistCorrect && result.titleCorrect) score += 20;
  else if (result.artistCorrect || result.titleCorrect) score += 10;

  return score;
}

function judgeExactAnswer(
  params: JudgeSongAnswerParams,
): JudgeSongAnswerResult | null {
  const playerWords = normalizeAnswerWords(params.playerAnswer);
  const normalizedArtistWords = normalizeAnswerWords(params.correctArtist);
  const artistWords = normalizedArtistWords.filter(
    (word, index) =>
      !isArtistConnector(word, index, normalizedArtistWords.length),
  );
  const titleWords = normalizeAnswerWords(params.correctTitle);

  if (!containsEveryRequiredWord(playerWords, [...artistWords, ...titleWords])) {
    return null;
  }

  return {
    artistCorrect: true,
    titleCorrect: true,
    perfectMatch: true,
    reason: "Full artist and title matched locally.",
  };
}

function normalizeAnswerWords(text: string): string[] {
  const punctuationMarks = [
    ".",
    ",",
    ":",
    ";",
    "!",
    "?",
    "-",
    "_",
    "/",
    "\\",
    "(",
    ")",
    "[",
    "]",
    "{",
    "}",
    "&",
  ];

  let normalizedText = removeDiacritics(text.trim().toLowerCase());

  for (const mark of punctuationMarks) {
    normalizedText = normalizedText.replaceAll(mark, " ");
  }

  return normalizedText.split(" ").filter(Boolean);
}

function removeDiacritics(text: string): string {
  let result = "";

  for (const character of text.normalize("NFD")) {
    const characterCode = character.charCodeAt(0);
    const isCombiningMark = characterCode >= 0x0300 && characterCode <= 0x036f;

    if (!isCombiningMark) {
      result += character;
    }
  }

  return result;
}

function isArtistConnector(
  word: string,
  index: number,
  wordCount: number,
): boolean {
  if (index === 0 || index === wordCount - 1) {
    return false;
  }

  return ["and", "es", "feat", "featuring", "ft", "x"].includes(word);
}

function containsEveryRequiredWord(
  spokenWords: string[],
  requiredWords: string[],
): boolean {
  const remainingSpokenWords = [...spokenWords];

  for (const requiredWord of requiredWords) {
    const matchingWordIndex = remainingSpokenWords.indexOf(requiredWord);

    if (matchingWordIndex === -1) {
      return false;
    }

    remainingSpokenWords.splice(matchingWordIndex, 1);
  }

  return true;
}
