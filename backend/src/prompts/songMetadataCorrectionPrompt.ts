import type {
  FindYoutubeVideoParams,
  YoutubeVideoMatch,
} from "../types/youtube";

export function buildSongMetadataCorrectionPrompt(
  song: FindYoutubeVideoParams,
  video: YoutubeVideoMatch,
): string {
  return `
You correct song metadata using information from a specific YouTube video.

The originally requested metadata may contain a hallucinated or misspelled song title.

ORIGINAL REQUEST:
- Artist: "${song.artist}"
- Title: "${song.title}"

YOUTUBE EVIDENCE:
- Video title: "${video.videoTitle}"
- Channel: "${video.channelTitle}"
- Description: "${video.description}"

RULES:
1. Treat the YouTube video title as the strongest evidence.
2. Return the real artist and the exact song title represented by this video.
3. Remove YouTube-specific labels such as "official video", "official audio", "lyrics", and "full".
4. Include every artist visibly credited for the track, including primary, co-primary, and featured artists connected with "x", "feat.", "ft.", "&", or commas. Never omit a secondary credited artist.
5. Do not trust the original title if the YouTube evidence contradicts it.
6. Do not invent information that is absent from the evidence.

Return only the corrected artist and title.
`;
}
