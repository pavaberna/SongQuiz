import { GoogleGenAI } from "@google/genai";

export type GenerateSongListParams = {
  players: number;
  decade: string;
  genre: string;
};

export type GeneratedSong = {
  artist: string;
  title: string;
  year: number;
  genres: string[];
};

const GEMINI_MODEL = "gemini-3.1-flash-lite";

export async function generateSongList(
  params: GenerateSongListParams,
): Promise<GeneratedSong[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  if (!Number.isInteger(params.players) || params.players < 1) {
    throw new Error("Invalid number of players.");
  }

  const requiredCount = params.players * 10; // 10 song per player

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
You are an expert music curator for a song quiz app played specifically by Hungarian users.

Create exactly ${requiredCount} real, existing songs matching this setup:
- Decade: ${params.decade}
- Genre: ${params.genre}

Return only a valid JSON array. Do not wrap the response in markdown code blocks (do NOT use \`\`\`json ... \`\`\`). Start directly with "[" and end with "]". No explanations.

Each item must have exactly this shape:
{
  "artist": "Artist name",
  "title": "Song title",
  "year": 1999,
  "genres": ["genre1", "genre2"]
}

Selection & Cultural Relevance Rules (CRITICAL for Hungarian players):
1. Hungarian Music Integration (Approx. 20-30% of the list):
   - Include Hungarian artists representing the selected decade and genre.
   - These can be mainstream radio hits or solid mid-tier/indie/hip-hop tracks (e.g., Carson Coma, Krúbi, Bongor, or older classics depending on the decade) that have at least a solid local following in Hungary (approx. 50k-100k+ views on YouTube).

2. International & European Music:
   - Include major global hits (US/UK) that are widely recognized.
   - Include European songs from other countries ONLY if they had noticeable airplay, viral success, or popularity in Hungary (e.g., Stromae, Little Big, Salvatore Ganacci).

3. Exclusions (Strict):
   - Do NOT include local stars from other countries who are unknown to Hungarian audiences (e.g., do NOT include Polish rappers like Quebonafide, regional French/German pop stars, or local Indian pop, even if they have millions of views in their home countries).
   - Every international song must be culturally recognizable to an average Hungarian music listener.

General Rules:
- Return exactly ${requiredCount} items.
- Do not include duplicate songs.
- Use real, existing songs only.
- The year must match the requested decade.
- The genres must match or be closely related to the requested genre.
`;

  console.log(
    `Generating ${requiredCount} songs with ${GEMINI_MODEL}...`,
  );

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

  const parsed = JSON.parse(jsonText);

  if (!Array.isArray(parsed)) {
    throw new Error("Gemini response is not a JSON array");
  }

  if (parsed.length !== requiredCount) {
    throw new Error(
      `Expected ${requiredCount} songs, but got ${parsed.length}`,
    );
  }

  return parsed.map((item, index) => {
    const song = item as Record<string, unknown>;
    if (
      typeof song.artist !== "string" ||
      typeof song.title !== "string" ||
      typeof song.year !== "number" ||
      !Array.isArray(song.genres) ||
      !song.genres.every((genre) => typeof genre === "string")
    ) {
      throw new Error(`Invalid song format at index ${index}.`);
    }

    return {
      artist: song.artist,
      title: song.title,
      year: song.year,
      genres: song.genres,
    };
  });
}
