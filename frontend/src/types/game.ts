export type SongListReadiness = {
  generatedSongCount: number;
  missingPlayableSongCount: number;
  playableSongCount: number;
  readyToStart: boolean;
  targetSongCount: number;
};

export type SongEnrichmentResult = {
  enriched: number;
  failed: number;
  remainingSongsWithoutYoutubeData: number;
};

export type PreparedGameSession = {
  id: string;
  status: "ready";
};

export type PrepareGameSessionResponse =
  | {
      ready: true;
      readiness: SongListReadiness;
      session: PreparedGameSession;
    }
  | {
      enrichment: SongEnrichmentResult;
      ready: false;
      readiness: SongListReadiness;
      session: null;
    };

export type GamePlayer = {
  id: number;
  score: number;
};

export type GameSong = {
  artist: string;
  title: string;
  youtubeId: string | null;
  duration: number | null;
};

export type GameRound = {
  roundNumber: number;
  currentPlayer: GamePlayer;
  currentSong: GameSong;
  startOffset: number;
  clipDuration: number;
  status: "playing" | "answering" | "scoring" | "completed";
};

export type StartedRoundSession = {
  id: string;
  status: "in_progress" | "finished";
  currentRound: GameRound | null;
};

export type RoundVoiceInstruction = {
  key: "round_started" | "next_player";
  params: {
    roundNumber: number;
    playerId: number;
  };
};

export type StartRoundResponse = {
  session: StartedRoundSession;
  voice: RoundVoiceInstruction | null;
};
