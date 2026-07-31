import { prepareGameSession } from "../../api/gameApi";
import type { PreparedGameSession } from "../../types/game";

const ENRICHMENT_LIMIT = 10;

export async function prepareGame(
  generatedSongCount: number,
): Promise<PreparedGameSession> {
  const maxRequests = Math.ceil(generatedSongCount / ENRICHMENT_LIMIT);

  for (let requestCount = 0; requestCount < maxRequests; requestCount++) {
    const result = await prepareGameSession(ENRICHMENT_LIMIT);

    if (result.ready) {
      return result.session;
    }
  }

  throw new Error("Not enough playable songs were found.");
}
