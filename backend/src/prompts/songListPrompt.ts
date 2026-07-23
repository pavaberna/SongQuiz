import type { GenerateSongListParams } from "../types/song";

type BuildSongListPromptParams = GenerateSongListParams & {
  generatedSongCount: number;
};

export function buildSongListPrompt(params: BuildSongListPromptParams): string {
  return `
You are an expert music curator for a song quiz app played specifically by Hungarian users.

Create exactly ${params.generatedSongCount} real, existing songs matching this setup:
- Decade: ${params.decade}
- Genre: ${params.genre}

Return only a valid JSON array. Do not wrap the response in markdown code blocks. Start directly with "[" and end with "]". No explanations.

Each item must have exactly this shape:
{
  "artist": "Artist name",
  "title": "Song title",
  "year": 1999,
  "genres": ["genre1", "genre2"]
}

Selection and cultural relevance rules (critical for Hungarian players):
1. Hungarian music integration (approx. 20-30% of the list):
   - Include Hungarian artists representing the selected decade and genre.
   - These can be mainstream radio hits or solid mid-tier, indie, or hip-hop tracks that have at least a solid local following in Hungary.

2. International and European music:
   - Include major global hits from the US or UK that are widely recognized.
   - Include European songs from other countries only if they had noticeable airplay, viral success, or popularity in Hungary.

3. Strict exclusions:
   - Do not include local stars from other countries who are unknown to Hungarian audiences, even if they have millions of views in their home countries.
   - Every international song must be culturally recognizable to an average Hungarian music listener.

General rules:
- Return exactly ${params.generatedSongCount} items.
- Do not include duplicate songs.
- Use real, existing songs only.
- The year must match the requested decade.
- The genres must match or be closely related to the requested genre.
`;
}
