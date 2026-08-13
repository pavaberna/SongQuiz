export type FindYoutubeVideoParams = {
  artist: string;
  title: string;
};

export type YoutubeVideoMatch = {
  youtubeId: string;
  duration: number;
  videoTitle: string;
  channelTitle: string;
  description: string;
  embeddable: boolean;
  viewCount: number;
};

export type YoutubeVideoValidation = {
  artistMatches: boolean;
  titleMatches: boolean;
  blocked: boolean;
};

export type YoutubeSongMatch = FindYoutubeVideoParams & YoutubeVideoMatch;
