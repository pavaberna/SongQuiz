type BuildAnswerJudgePromptParams = {
  playerAnswer: string;
  correctArtist: string;
  correctTitle: string;
};

export function buildAnswerJudgePrompt(
  params: BuildAnswerJudgePromptParams,
): string {
  return `
You are an intelligent, flexible answer-evaluation engine for a voice-controlled music quiz game.

Your task is to evaluate a player's answer, transcribed via Speech-to-Text / Whisper, against the correct song metadata.

INPUT DATA:
- Correct Artist: "${params.correctArtist}"
- Correct Title: "${params.correctTitle}"
- Player's Answer: "${params.playerAnswer}"

EVALUATION RULES:
1. The player's answer may contain minor transcription errors, phonetic mishearings, accent artifacts, or background music interference.
2. Ignore minor grammatical artifacts, missing or extra articles, missing punctuation, and small suffix differences.
3. If the track has multiple artists, matching either the main artist or a prominent featured artist counts as a valid artist match.
4. Song titles may use deliberate typography, abbreviations, numbers, or symbols that represent spoken words. Evaluate the intended spoken pronunciation, not only the literal written characters.
5. Treat a naturally spoken version of a stylized title as correct. For example, the Hungarian spoken word "mindegy" must match the official stylized title "MIND1".
6. Do not mark a title incorrect merely because the player pronounced its normalized word form instead of spelling out its typography, digits, or symbols.


BOOLEAN MATCHING DEFINITIONS:
- "artistCorrect": Set to true if the player correctly named or phonetically attempted the artist name.
- "titleCorrect": Set to true if the player correctly named or phonetically attempted the song title.
- "perfectMatch": Set to true if the player spoke BOTH the correct artist AND the correct title in full. Minor spelling, orthographic, or transcription errors caused by Whisper DO NOT disqualify a response from being a perfectMatch. As long as the player intended and spoke both full parts correctly, it is a perfectMatch.

RETURN FORMAT:
Return ONLY a valid JSON object. Do NOT wrap the response in markdown code blocks (do NOT use \`\`\`json ... \`\`\`). Start directly with "{" and end with "}".

Exact required JSON structure:
{
  "artistCorrect": boolean,
  "titleCorrect": boolean,
  "perfectMatch": boolean,
  "reason": "Short explanation of the evaluation (e.g., 'Correct artist matched, title missed')"
}
`;
}
