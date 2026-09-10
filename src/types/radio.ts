export interface RadioStation {
  id: string;
  name: string;
  nameKo: string;
  frequency: string; // e.g. "91.9 MHz"
  mhz: number; // e.g. 91.9
  network: string; // "MBC", "KBS", "SBS", "TBS", "EBS", "Arirang"
  tagline: string;
  taglineKo: string;
  genre: string;
  color: string;
  streamUrl?: string;
  logoText: string;
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

export interface BufferSegment {
  id: string;
  stationId: string;
  kstHour: number;
  kstMinute: number;
  duration: number; // in seconds
  timestamp: number;
  audioUrl: string;
  cachedOffline: boolean;
}

export interface RadioState {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number; // 0 - 1
  currentStationId: string;
  frequencyMhz: number;
  userTimezone: string;
  isLiveSync: boolean;
  scrubbedHour: number; // when not live sync
  scrubbedMinute: number;
  isOffline: boolean;
  isSimulatedOffline: boolean;
  cachedMinutes: number;
  bufferHealthPct: number;
  hourlyTimeSignalEnabled: boolean;
}
