export type SongPlayerProps = {
  clipDuration: number;
  coverText: string;
  isCovered: boolean;
  manualPlayText: string;
  onComplete: (playbackId: string) => void;
  onError: (message: string) => void;
  playbackId: string;
  startOffset: number;
  youtubeId: string;
  isPaused: boolean;
};
