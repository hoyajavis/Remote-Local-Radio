export interface StationShowConfig {
  startHour: number;
  endHour: number;
  title: string;
  titleKo: string;
  dj: string;
  feedUrl?: string;
  youtubeVideoId?: string;
}

export interface StationArchiveConfig {
  name: string;
  nameKo: string;
  defaultDj: string;
  youtubeVideoId?: string;
  primaryFeedUrl?: string;
  liveStreamUrl?: string;
  isPaywalled?: boolean;
  paywallNotice?: string;
  shows: StationShowConfig[];
}
