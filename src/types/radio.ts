export type BandMode = 'seoul_in_usa' | 'california_in_seoul';

export interface RadioStation {
  id: string;
  name: string;
  nameKo: string;
  frequency: string; // e.g. "91.9 MHz"
  mhz: number; // e.g. 91.9
  network: string; // "MBC", "KBS", "SBS", "TBS", "EBS", "Arirang", "NPR", "Community"
  tagline: string;
  taglineKo: string;
  genre: string;
  color: string;
  streamUrl?: string;
  logoText: string;
  band?: BandMode;
  city?: string;
  country?: string;
  youtubeVideoId?: string;
  hasVisibleRadio?: boolean;
  isPaywalled?: boolean;
  paywallNotice?: string;
}

export interface ScheduleSlot {
  id: string;
  startHour: number; // 0-23 in KST (Seoul time)
  startMinute: number; // 0-59
  durationMinutes: number; // e.g. 60 or 120
  stationId: string;
  showTitle: string;
  showTitleKo: string;
  djName: string;
  djNameKo: string;
  genre: string;
  description: string;
  sourceStreamUrl?: string;
  customAudioKey?: string;
  isLiveBuffered?: boolean;
  youtubeVideoId?: string;
  hasVisibleRadio?: boolean;
}

export interface TimeShiftInfo {
  userTimezone: string;
  userLocalTimeStr: string;
  userLocalHour: number;
  userLocalMinute: number;
  seoulLiveTimeStr: string;
  seoulLiveHour: number;
  seoulLiveMinute: number;
  broadcastTimeStr: string; // The virtual KST broadcast time currently playing
  broadcastHour: number;
  broadcastMinute: number;
  offsetHours: number; // e.g. 16 hours for California PDT
  isLiveSync: boolean; // true = current local time matches Seoul time; false = user scrubbed
  currentSlot: ScheduleSlot;
  nextSlot: ScheduleSlot | null;
  elapsedInSlotMinutes: number;
  totalSlotMinutes: number;
}
