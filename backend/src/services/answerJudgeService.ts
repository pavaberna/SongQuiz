import { buildAnswerJudgePrompt } from "../prompts/answerJudgePrompt";
import { GoogleGenAI } from "@google/genai";
import { JudgeSongAnswerParams, JudgeSongAnswerResult } from "../types/answer";

const GEMINI_MODEL = "gemini-3.1-flash-lite";

export async function judgeSongAnswer(
  params: JudgeSongAnswerParams,
): Promise<JudgeSongAnswerResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }
  const ai = new GoogleGenAI({ apiKey });
  const prompt = buildAnswerJudgePrompt(params);

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
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
    typeof parsed.perfectMatch !== "boolean" ||
    typeof parsed.reason !== "string"
  ) {
    throw new Error("Invalid answer judge response from Gemini.");
  }

  return {
    artistCorrect: parsed.artistCorrect,
    titleCorrect: parsed.titleCorrect,
    perfectMatch: parsed.perfectMatch,
    reason: parsed.reason,
  };
}

export function calculateAnswerPoints(result: JudgeSongAnswerResult): number {
  let score: number = 0;
  if (result.perfectMatch) score += 25;
  else if (result.artistCorrect && result.titleCorrect) score += 20;
  else if (result.artistCorrect || result.titleCorrect) score += 10;

  return score;
}
