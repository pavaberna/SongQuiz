import { prepareGameSession } from "../../api/gameApi";
import type { PreparedGameSession } from "../../types/game";

const ENRICHMENT_LIMIT = 10;

export async function prepareGame(
  generatedSongCount: number,
  signal?: AbortSignal,
): Promise<PreparedGameSession> {
  const maxRequests = Math.max(
    1,
    Math.ceil(generatedSongCount / ENRICHMENT_LIMIT),
  );

  for (let requestCount = 0; requestCount < maxRequests; requestCount++) {
    const isLastRequest = requestCount === maxRequests - 1;
    const result = await prepareGameSession(
      ENRICHMENT_LIMIT,
      signal,
      isLastRequest,
    );

    if (result.ready) {
      return result.session;
    }
  }

  throw new Error("Not enough playable songs were found.");
}
