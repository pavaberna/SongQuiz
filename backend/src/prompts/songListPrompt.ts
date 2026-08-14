import type { GenerateSongListParams } from "../types/song";
import type { PopularityTierCounts } from "../services/songDiversityService";

type BuildSongListPromptParams = GenerateSongListParams & {
  curationFocus: string;
  excludedSongs: { artist: string; title: string }[];
  generatedSongCount: number;
  hungarianSongCount: number;
  popularityTierCounts: PopularityTierCounts;
  requestedGenres: string[];
  variationId: string;
};

function buildGenreRules(params: BuildSongListPromptParams): string {
  const requestedGenres = params.requestedGenres.join(", ");

  if (params.requestedGenres.length === 0) {
    return `
Genre variety rules:
- No specific genre was requested.
- Select a varied mix of genuinely different genres from the requested music period.
- Include pop, rock, hip-hop, electronic, alternative, and other culturally relevant styles where they existed in that period.
- Do not let a single genre dominate the list.
- Every song's genres array must contain its accurate genres.`;
  }

  if (params.requestedGenres.length === 1) {
    return `
Genre rules:
- Every song must genuinely belong to the requested genre: ${requestedGenres}.
- A related subgenre is allowed only when the song still clearly belongs to ${requestedGenres}.
- Include "${requestedGenres}" in every song's genres array.`;
  }

  return `
Genre intersection rules (critical):
- The requested genres are: ${requestedGenres}.
- Treat these genres as an AND condition, never as alternatives.
- Every song must genuinely combine every requested genre.
- Reject songs that match only one or some of the requested genres.
- Do not substitute a requested genre with a merely related genre.
- Every song's genres array must explicitly contain all requested genres. Additional accurate genres are allowed.`;
}

function buildMusicPeriodRules(params: BuildSongListPromptParams): string {
  if (params.decade === "mixed") {
    return `
Music period rules:
- No specific decade or year was requested.
- Select songs from genuinely different decades and years.
- Spread the songs across at least four different decades when the requested song count allows it.
- Do not let one decade dominate the list.
- Every song's year must be its accurate original release year.`;
  }

  return `
Music period rules:
- Every song's year must match the requested music period: ${params.decade}.`;
}

function buildSongOriginRules(params: BuildSongListPromptParams): string {
  if (params.hungarianSongCount === params.generatedSongCount) {
    return `
1. Hungarian music:
   - Every song must be Hungarian.
   - Include Hungarian artists representing the selected music period and requested genre mix.
   - Choose mainstream radio hits or well-known local tracks with a solid following in Hungary.

2. International music:
   - Do not include international songs.`;
  }

  if (params.hungarianSongCount === 0) {
    return `
1. Hungarian music:
   - Do not include Hungarian songs or Hungarian artists.

2. International and European music:
   - Every song must be international.
   - Include major global hits from the US or UK that are widely recognized.
   - Include European songs from other countries only if they had noticeable airplay, viral success, or popularity in Hungary.`;
  }

  return `
1. Hungarian music integration:
   - Include exactly ${params.hungarianSongCount} Hungarian songs.
   - Include Hungarian artists representing the selected music period and requested genre mix.
   - These can be mainstream radio hits or solid mid-tier, indie, or hip-hop tracks that have at least a solid local following in Hungary.

2. International and European music:
   - Include major global hits from the US or UK that are widely recognized.
   - Include European songs from other countries only if they had noticeable airplay, viral success, or popularity in Hungary.
   - The remaining ${params.generatedSongCount - params.hungarianSongCount} songs must be international songs.`;
}

export function buildSongListPrompt(params: BuildSongListPromptParams): string {
  const requestedPeriodText =
    params.decade === "mixed"
      ? "Any year or decade (balanced random mix)"
      : params.decade;
  const requestedGenresText =
    params.requestedGenres.length === 0
      ? "Any genre (random mix)"
      : params.requestedGenres.join(", ");
  const excludedSongsText =
    params.excludedSongs.length === 0
      ? "- No songs are excluded from this request."
      : params.excludedSongs
          .map((song) => `- ${song.artist} - ${song.title}`)
          .join("\n");

  return `
You are an expert music curator for a song quiz app played specifically by Hungarian users.

Create exactly ${params.generatedSongCount} real, existing songs matching this setup:
- Music period: ${requestedPeriodText}
- Requested genres: ${requestedGenresText}
- Curation focus: ${params.curationFocus}
- Variation ID: ${params.variationId}

Return only a valid JSON array. Do not wrap the response in markdown code blocks. Start directly with "[" and end with "]". No explanations.

Each item must have exactly this shape:
{
  "artist": "Artist name",
  "title": "Song title",
  "year": 1999,
  "genres": ["genre1", "genre2"],
  "popularityTier": "mainstream"
}

Selection and cultural relevance rules (critical for Hungarian players):
${buildMusicPeriodRules(params)}

${buildGenreRules(params)}

${buildSongOriginRules(params)}

3. Strict exclusions:
   - Do not include local stars from other countries who are unknown to Hungarian audiences, even if they have millions of views in their home countries.
   - Every international song must be culturally recognizable to an average Hungarian music listener.

4. Popularity diversity:
   - Include exactly ${params.popularityTierCounts.mainstream} mainstream songs: major hits with very high YouTube reach and broad recognition in Hungary.
   - Include exactly ${params.popularityTierCounts.familiar} familiar songs: established songs with meaningful reach that are recognizable but are not the most predictable chart leaders.
   - Include exactly ${params.popularityTierCounts.discovery} discovery songs: lower-view, cult, local, alternative, or overlooked songs that still have a real audience in Hungary.
   - A discovery song must never be an obscure regional hit that is unknown in Hungary.
   - Set popularityTier to "mainstream", "familiar", or "discovery" according to these definitions.
   - Do not sort the output by popularity, artist, title, or year. Mix all three tiers throughout the array.

5. Recently generated songs that must not be returned:
${excludedSongsText}

General rules:
- Return exactly ${params.generatedSongCount} items.
- Do not include duplicate songs.
- Do not repeatedly default to the most obvious artist or song for this setup.
- Vary artists: avoid using the same artist more than once unless the requested pool would otherwise be too small.
- Use real, existing songs only.
- The artist field must include every officially credited primary, co-primary, and featured artist. Never omit collaborating artists or shorten a multi-artist credit to only the first artist.

Strict Accuracy Constraint:
Before outputting, double-check every single song title and artist combination. Do not invent, paraphrase, or slightly misspell any titles (e.g., do not write "cipőfűző" instead of "cipoe"). The song titles MUST be 100% exact official release titles available on Spotify or YouTube.
`;
}
