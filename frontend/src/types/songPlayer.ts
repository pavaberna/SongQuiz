export type SongPlayerProps = {
  clipDuration: number;
  coverText: string;
  isCovered: boolean;
  manualPlayText: string;
  onComplete: () => void;
  onError: (message: string) => void;
  startOffset: number;
  youtubeId: string;
};
