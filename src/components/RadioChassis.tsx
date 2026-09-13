import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  Tv,
  Video,
  Music,
  Radio,
  Power,
  ChevronDown,
  ChevronUp,
  Disc3,
  RotateCcw
} from 'lucide-react';
import { RadioStation, ScheduleSlot, BandMode } from '../types/radio';
import { AudioVisualizer } from './AudioVisualizer';
import { MarqueeText } from './MarqueeText';
import { audioEngine, ResolvedStreamInfo, PlaybackTelemetry, PlaybackTelemetryStatus } from '../services/audioEngine';

export type CamEffectMode = 'clean' | 'tft' | 'composite' | 'osd' | 'off';
export type AudioDisplayMode = 'lcd' | 'vfd';

interface RadioChassisProps {
  station: RadioStation;
  stations?: RadioStation[];
  onSelectStation?: (station: RadioStation) => void;
  onSeekPrev?: () => void;
  onSeekNext?: () => void;
  onSavePreset?: (presetIndex: number) => void;
  currentSlot?: ScheduleSlot;
  resolvedStream?: ResolvedStreamInfo | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onPlayTimeSignal?: () => void;
  onPlayJingle?: () => void;
  isLiveSync: boolean;
  activeBand?: BandMode;
  onToggleBand?: () => void;
  userLocalTimeStr?: string;
  broadcastTimeStr?: string;
  onOpenPresetManager?: () => void;
  camEffectMode?: CamEffectMode;
  audioDisplayMode?: AudioDisplayMode;
  telemetry?: PlaybackTelemetry;
}

export type StatusLedColor = 'red' | 'amber' | 'green' | 'grey';
export type StatusLedPattern = 'solid' | 'pulse-slow' | 'blink-fast' | 'off';

export interface StatusLedConfig {
  color: StatusLedColor;
  pattern: StatusLedPattern;
  className: string;
  actionHint: 'wait' | 'move_on' | 'action' | 'normal' | 'none';
  tooltipEn: string;
  tooltipKo: string;
}

export const getStatusLedConfig = (
  status?: PlaybackTelemetryStatus,
  isPlaying?: boolean,
  retryAttempt = 0,
  maxRetries = 3
): StatusLedConfig => {
  const currentStatus = status || (isPlaying ? 'playing' : 'idle');

  switch (currentStatus) {
    case 'playing':
      // NORMAL: Signal locked and playing smoothly (Solid Green)
      return {
        color: 'green',
        pattern: 'solid',
        className: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.95)]',
        actionHint: 'normal',
        tooltipEn: 'STATUS: Connected (Playing normal broadcast)',
        tooltipKo: '수신 상태: 정상 방송 수신 중',
      };

    case 'buffering':
    case 'tuning':
      // WAIT (Amber Slow Pulse): Establishing connection or buffering audio
      return {
        color: 'amber',
        pattern: 'pulse-slow',
        className: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-led-pulse-slow',
        actionHint: 'wait',
        tooltipEn: 'STATUS: Buffering... Please wait',
        tooltipKo: '수신 상태: 버퍼링 중... 잠시 기다려주세요',
      };

    case 'stalled':
    case 'reconnecting':
      // WAIT (Amber Fast Blink): Temporary network drop, actively retrying connection
      return {
        color: 'amber',
        pattern: 'blink-fast',
        className: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-led-blink-fast',
        actionHint: 'wait',
        tooltipEn: `STATUS: Reconnecting signal (${retryAttempt || 1}/${maxRetries || 3})... Please wait`,
        tooltipKo: `수신 상태: 신호 재연결 시도 중 (${retryAttempt || 1}/${maxRetries || 3})... 잠시 기다려주세요`,
      };

    case 'paywalled':
      // MOVE ON (Solid Red): Paywalled channel requiring external subscription; waiting won't help
      return {
        color: 'red',
        pattern: 'solid',
        className: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]',
        actionHint: 'move_on',
        tooltipEn: 'STATUS: Channel Locked (Subscription Required) - Please select another station',
        tooltipKo: '수신 상태: 유료 잠김 채널 - 다른 채널을 선택하세요',
      };

    case 'error':
      // ACTION REQUIRED / MOVE ON (Fast Blinking Red): Signal dead, reconnect failed
      return {
        color: 'red',
        pattern: 'blink-fast',
        className: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-led-blink-fast',
        actionHint: 'action',
        tooltipEn: 'STATUS: Signal Lost (Connection Failed) - Try again or select another station',
        tooltipKo: '수신 상태: 신호 끊김 (연결 실패) - 다른 채널을 선택하거나 재시도하세요',
      };

    case 'idle':
    default:
      if (isPlaying) {
        return {
          color: 'green',
          pattern: 'solid',
          className: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.95)]',
          actionHint: 'normal',
          tooltipEn: 'STATUS: Connected',
          tooltipKo: '수신 상태: 정상 방송 수신 중',
        };
      }
      // STANDBY (Grey Off): Idle or powered down
      return {
        color: 'grey',
        pattern: 'off',
        className: 'bg-stone-500/40 border border-stone-600/50 shadow-none',
        actionHint: 'none',
        tooltipEn: 'STATUS: Standby (Press Power or Select Preset)',
        tooltipKo: '수신 상태: 대기 모드 (전원을 켜거나 프리셋 선택)',
      };
  }
};

/**
 * Standard Audio / Radio Seek Icons:
 * Double arrow pointing towards a vertical line on each respective side.
 */
const SeekPrevIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5 text-stone-800' }) => (
  <svg
    viewBox="0 0 16 16"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    {/* Left Vertical Line */}
    <rect x="1.5" y="3" width="1.75" height="10" rx="0.5" />
    {/* Dual Arrows pointing left towards the vertical line */}
    <polygon points="8.5,3.2 3.5,8 8.5,12.8" />
    <polygon points="14.5,3.2 9.5,8 14.5,12.8" />
  </svg>
);

const SeekNextIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5 text-stone-800' }) => (
  <svg
    viewBox="0 0 16 16"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    {/* Dual Arrows pointing right towards the vertical line */}
    <polygon points="1.5,3.2 6.5,8 1.5,12.8" />
    <polygon points="7.5,3.2 12.5,8 7.5,12.8" />
    {/* Right Vertical Line */}
    <rect x="12.75" y="3" width="1.75" height="10" rx="0.5" />
  </svg>
);

/**
 * Countersunk Hardware Chassis Screw:
 * Authentic slotted CNC machine screw with recessed shadow and edge highlight.
 */
const CountersunkScrew: React.FC<{ className?: string; rotation?: string }> = ({
  className = 'w-2.5 h-2.5',
  rotation = 'rotate-45',
}) => (
  <div
    className={`rounded-full bg-gradient-to-b from-stone-500 via-stone-400 to-stone-600 p-[1px] shadow-[inset_0_1px_1.5px_rgba(0,0,0,0.8),0_1px_1px_rgba(255,255,255,0.4)] flex items-center justify-center shrink-0 ${className}`}
    aria-hidden="true"
  >
    <div className={`w-full h-[1px] bg-stone-900 shadow-[0_0.5px_0_rgba(255,255,255,0.35)] ${rotation}`} />
  </div>
);

export const RadioChassis: React.FC<RadioChassisProps> = ({
  station,
  stations = [],
  onSelectStation,
  onSeekPrev,
  onSeekNext,
  onSavePreset,
  currentSlot,
  resolvedStream,
  isPlaying,
  onTogglePlay,
  volume,
  onVolumeChange,
  isMuted,
  onToggleMute,
  onPlayTimeSignal,
  onPlayJingle,
  isLiveSync,
  activeBand = 'seoul_in_usa',
  onToggleBand,
  userLocalTimeStr = '07:24:00',
  broadcastTimeStr = '07:24:00',
  onOpenPresetManager,
  camEffectMode = 'tft',
  audioDisplayMode = 'lcd',
  telemetry,
}) => {
  const isSeoulBand = activeBand === 'seoul_in_usa';
  const stationDisplayName = isSeoulBand ? (station.nameKo || station.name) : station.name;

  const [isStudioCamActive, setIsStudioCamActive] = useState<boolean>(false);
  const [isTransitioningCam, setIsTransitioningCam] = useState<boolean>(false);
  const [clockMode, setClockMode] = useState<'local' | 'broadcast'>('local');

  // Trigger brief transition animation when switching into CAM mode
  useEffect(() => {
    if (isStudioCamActive) {
      setIsTransitioningCam(true);
      const timer = setTimeout(() => setIsTransitioningCam(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isStudioCamActive]);

  // Car Stereo Presets: Long-press (>= 800ms) to save current station to preset slot
  const [savedPresetNotification, setSavedPresetNotification] = useState<{
    slotNumber: number;
    stationName: string;
  } | null>(null);
  const [flashPresetIdx, setFlashPresetIdx] = useState<number | null>(null);
  const pressTimerRef = useRef<{ [idx: number]: ReturnType<typeof setTimeout> }>({});
  const didLongPressRef = useRef<{ [idx: number]: boolean }>({});

  useEffect(() => {
    return () => {
      Object.keys(pressTimerRef.current).forEach((key) => {
        const timer = pressTimerRef.current[Number(key)];
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  const handlePresetPointerDown = (idx: number, e: React.PointerEvent) => {
    if (e.button !== undefined && e.button !== 0) return;
    didLongPressRef.current[idx] = false;
    if (pressTimerRef.current[idx]) {
      clearTimeout(pressTimerRef.current[idx]);
    }
    pressTimerRef.current[idx] = setTimeout(() => {
      didLongPressRef.current[idx] = true;
      if (onSavePreset) {
        onSavePreset(idx);
      }
      audioEngine.playPresetSavedTone();
      setFlashPresetIdx(idx);
      setTimeout(() => setFlashPresetIdx(null), 1200);
      const savedName = stationDisplayName;
      setSavedPresetNotification({
        slotNumber: idx + 1,
        stationName: `${station.frequency} ${savedName}`,
      });
      setTimeout(() => setSavedPresetNotification(null), 2500);
    }, 800);
  };

  const handlePresetClick = (st: RadioStation, idx: number) => {
    if (didLongPressRef.current[idx]) {
      didLongPressRef.current[idx] = false;
      return;
    }
    if (onSelectStation) {
      onSelectStation(st);
    }
  };

  const handlePresetPointerUp = (st: RadioStation, idx: number) => {
    if (pressTimerRef.current[idx]) {
      clearTimeout(pressTimerRef.current[idx]);
      delete pressTimerRef.current[idx];
    }
    if (!didLongPressRef.current[idx]) {
      if (onSelectStation) {
        onSelectStation(st);
      }
    }
    // Allow slight delay before resetting didLongPress so trailing click event is suppressed
    setTimeout(() => {
      didLongPressRef.current[idx] = false;
    }, 50);
  };

  const handlePresetPointerCancel = (idx: number) => {
    if (pressTimerRef.current[idx]) {
      clearTimeout(pressTimerRef.current[idx]);
      delete pressTimerRef.current[idx];
    }
    didLongPressRef.current[idx] = false;
  };

  // Gating: Only stations with explicit Visible Radio support allow Studio Cam
  const hasVideo = !!(station.hasVisibleRadio && (resolvedStream?.youtubeVideoId || station.youtubeVideoId));
  const videoId = hasVideo ? (resolvedStream?.youtubeVideoId || station.youtubeVideoId) : undefined;

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [videoStartSeconds, setVideoStartSeconds] = useState<number>(0);

  // Compute exact show offset in seconds (hour, minute, and second)
  const calculateVideoSeekSeconds = useCallback((): number => {
    // 1. If currently playing a Live On-Air broadcast or live video stream, always start at the live edge (0s)
    if (resolvedStream?.isLiveOnAir || resolvedStream?.isLiveVideoStream) {
      return 0;
    }

    // 2. If audio was already playing with an active seek position, use audio element position for seamless handoff
    const audioCurrentTime = audioEngine.getCurrentTime();
    if (audioCurrentTime > 0) {
      return Math.floor(audioCurrentTime);
    }

    // 3. Calculate directly from current broadcast clock (e.g. "07:24:35")
    if (broadcastTimeStr) {
      const parts = broadcastTimeStr.split(':').map(Number);
      const bHour = isNaN(parts[0]) ? 7 : parts[0];
      const bMin = isNaN(parts[1]) ? 0 : parts[1];
      const bSec = isNaN(parts[2]) ? 0 : parts[2];

      const startH = resolvedStream?.showStartHour ?? bHour;
      const hoursIntoShow = Math.max(0, bHour - startH);
      const offsetSeconds = (hoursIntoShow * 3600) + (bMin * 60) + bSec;

      const duration = resolvedStream?.totalDurationSeconds || 7200;
      const safeDuration = duration > 30 ? (duration - 10) : duration;
      return safeDuration > 0 ? Math.floor(offsetSeconds % safeDuration) : Math.floor(offsetSeconds);
    }

    // 4. Fallback to server-resolved seek offset
    return Math.floor(resolvedStream?.videoSeekOffsetSeconds ?? resolvedStream?.seekOffsetSeconds ?? 0);
  }, [broadcastTimeStr, resolvedStream]);

  // Synchronize video start timestamp whenever CAM mode opens, station changes, or hour changes
  useEffect(() => {
    if (isStudioCamActive && hasVideo && videoId) {
      const start = calculateVideoSeekSeconds();
      setVideoStartSeconds(start);
    }
  }, [isStudioCamActive, videoId, station.id, resolvedStream?.broadcastHour, calculateVideoSeekSeconds]);

  // Audio-Video Handshake: mute/pause radio audio when CAM is ON, restore when OFF
  const handleToggleStudioCam = () => {
    if (!hasVideo) return;
    const nextState = !isStudioCamActive;
    setIsStudioCamActive(nextState);
    if (!nextState) {
      // Exiting video mode: calculate current broadcast offset so audio resumes at current time
      const currentSeconds = calculateVideoSeekSeconds();
      audioEngine.duckForVideo(false, currentSeconds);
    } else {
      audioEngine.duckForVideo(true);
    }
  };

  const handleIframeLoad = () => {
    if (videoStartSeconds > 0 && iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: 'seekTo',
            args: [videoStartSeconds, true]
          }),
          '*'
        );
      } catch {}
    }
  };

  // If station switches to an audio-only channel, automatically exit CAM mode and restore audio
  useEffect(() => {
    if (!hasVideo && isStudioCamActive) {
      setIsStudioCamActive(false);
      audioEngine.duckForVideo(false);
    }
  }, [hasVideo, isStudioCamActive]);

  // Clean up ducking on unmount
  useEffect(() => {
    return () => {
      audioEngine.duckForVideo(false);
    };
  }, []);


  // Only accept stream metadata if it strictly matches this station
  const isMatchingStream = resolvedStream && resolvedStream.stationId === station.id;
  // Only accept schedule slot if it strictly matches this station
  const isMatchingSlot = currentSlot && currentSlot.stationId === station.id;

  // Native broadcast origin:
  // Seoul stations originate in Korean -> showTitleKo || showTitle
  // California stations originate in English -> showTitle || showTitleKo

  const showTitle = isMatchingStream
    ? (isSeoulBand ? (resolvedStream.showTitleKo || resolvedStream.showTitle) : (resolvedStream.showTitle || resolvedStream.showTitleKo))
    : isMatchingSlot
      ? (isSeoulBand ? (currentSlot.showTitleKo || station.nameKo) : (currentSlot.showTitle || station.name))
      : stationDisplayName;

  const rawPresenterName = isMatchingStream
    ? resolvedStream.djName
    : isMatchingSlot
      ? (isSeoulBand ? (currentSlot.djNameKo || currentSlot.djName) : (currentSlot.djName || currentSlot.djNameKo))
      : undefined;

  const isTalkStation = station.network === 'NPR' || station.network === 'KQED/NPR' || station.genre.toLowerCase().includes('news') || station.genre.toLowerCase().includes('talk');
  const presenterBadgeText = (() => {
    if (!rawPresenterName) return null;
    const trimmed = rawPresenterName.trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();

    // Filter out generic placeholder phrases that aren't individual presenters
    const GENERIC_KEYWORDS = ['staff', 'on-air', 'slugs', 'student', 'curator', 'volunteer', 'broadcast', 'automated', 'team', 'newsroom', 'after midnite', 'kdfc hosts', 'kqed host', 'npr host', 'npr hosts', 'bbc news', 'the pig crew'];
    if (GENERIC_KEYWORDS.some(kw => lower.includes(kw))) {
      return null;
    }

    if (isSeoulBand) {
      return trimmed.startsWith('DJ') ? trimmed : `DJ ${trimmed}`;
    }

    if (trimmed.startsWith('DJ ') || trimmed.startsWith('Host: ') || trimmed.startsWith('Hosts: ')) {
      return trimmed;
    }

    if (isTalkStation || lower.includes('&') || lower.includes(' and ')) {
      const isPlural = lower.includes('&') || lower.includes(' and ');
      return `${isPlural ? 'Hosts' : 'Host'}: ${trimmed}`;
    }

    return `DJ ${trimmed}`;
  })();

  const tagline = isSeoulBand ? (station.taglineKo || station.tagline) : station.tagline;

  // Format time for the amber 7-segment LCD clock (e.g. "AM 7:24" or "PM 11:00")
  const activeClockTime = clockMode === 'local' ? userLocalTimeStr : broadcastTimeStr;
  const timeParts = activeClockTime.split(':');
  const rawHour = parseInt(timeParts[0] || '7', 10);
  const rawMin = timeParts[1] || '00';
  const ampm = rawHour >= 12 ? 'PM' : 'AM';
  const displayHour = rawHour % 12 === 0 ? 12 : rawHour % 12;
  const amberClockText = `${ampm} ${String(displayHour).padStart(2, ' ')}:${rawMin}`;
  const clockDigits = `${String(displayHour).padStart(2, ' ')}:${rawMin}`;
  const formattedFreq = station.mhz ? station.mhz.toFixed(1) : (station.frequency.match(/[\d.]+/)?.[0] || '91.9');
  const freqUnit = station.frequency.includes('AM') ? 'kHz' : 'MHz';
  const currentStationPresetIdx = stations ? stations.findIndex(s => s.id === station.id) : -1;
  const presetChText = currentStationPresetIdx >= 0 && currentStationPresetIdx < 6 ? String(currentStationPresetIdx + 1).padStart(2, '0') : '01';

  // Episode subtitle deduplication: suppress subtitle if identical to show title or station name
  const rawSubtitle = resolvedStream?.episodeSubtitle?.trim();
  const currentShowTitleTrimmed = showTitle?.trim();
  const currentStationNameTrimmed = stationDisplayName?.trim();
  const cleanSubtitle = rawSubtitle &&
    rawSubtitle !== currentShowTitleTrimmed &&
    rawSubtitle !== currentStationNameTrimmed
      ? rawSubtitle
      : undefined;

  const hasSubtitleContent = Boolean(
    cleanSubtitle || (resolvedStream?.guests && resolvedStream.guests.length > 0) || resolvedStream?.cornerTitle
  );

  const isLine3Alert = Boolean(
    (telemetry && (telemetry.status === 'stalled' || telemetry.status === 'reconnecting' || telemetry.status === 'error')) ||
    station.isPaywalled ||
    resolvedStream?.isPaywalled
  );

  const line3Text = (() => {
    if (telemetry && (telemetry.status === 'stalled' || telemetry.status === 'reconnecting' || telemetry.status === 'error')) {
      const symbol = telemetry.status === 'error' ? '✕' : telemetry.status === 'reconnecting' ? '↻' : '▲';
      const msg = telemetry.message || telemetry.messageKo || '';
      return `${symbol} ${msg}`;
    }

    if (station.isPaywalled || resolvedStream?.isPaywalled) {
      const notice = station.paywallNotice || resolvedStream?.paywallNotice || 'Broadcaster requires official paid subscription';
      return `🔒 [PAYWALLED] ${notice}`;
    }

    const parts: string[] = [];
    if (presenterBadgeText) {
      parts.push(presenterBadgeText);
    }

    if (hasSubtitleContent) {
      const subParts: string[] = [];
      if (resolvedStream?.cornerTitle) {
        subParts.push(`[${resolvedStream.cornerTitle}]`);
      }
      if (resolvedStream?.guests && resolvedStream.guests.length > 0) {
        const guestPrefix = isSeoulBand ? '게스트:' : 'Guests:';
        subParts.push(`${guestPrefix} ${resolvedStream.guests.join(', ')}`);
      }
      if (cleanSubtitle) {
        subParts.push(cleanSubtitle);
      }
      if (subParts.length > 0) {
        parts.push(subParts.join(' • '));
      }
    }

    if (parts.length === 0) return null;
    return parts.join(' • ');
  })();

  const ledConfig = getStatusLedConfig(
    telemetry?.status,
    isPlaying,
    telemetry?.retryAttempt,
    telemetry?.maxRetries
  );

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-2">
      {/* 1. TOP KITCHEN CABINET OVERHANG (Dark Walnut Apartment Cabinetry with Countersunk Chassis Screws) */}
      <div className="w-full h-4 bg-gradient-to-r from-[#1c1511] via-[#2d221b] to-[#1a130f] rounded-t-xl border-t border-x border-[#3d2f26] shadow-md relative overflow-hidden flex items-center justify-between px-3">
        {/* Subtle wood grain sheen */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.03)_50%,transparent_100%)] pointer-events-none" />
        {/* Mounting Hardware Screws */}
        <CountersunkScrew className="w-2 h-2" rotation="rotate-45" />
        <CountersunkScrew className="w-2 h-2" rotation="-rotate-12" />
      </div>

      {/* 2. THE COSTEL HORIZONTAL CONTROL PANEL STRIP (CNC Brushed Aluminum Fascia) */}
      <div className="w-full bg-gradient-to-b from-[#f3f4f6] via-[#d6d9df] to-[#9ca3af] border-x border-b-2 border-stone-500 p-2 sm:p-3 shadow-xl relative text-stone-900">
        {/* Top Chamfer Specular Highlight */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-white/80 pointer-events-none" />
        {/* Subtle Hairline Brushing Overlay */}
        <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(0,0,0,0.015)_2px,rgba(0,0,0,0.015)_4px)] pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
          {/* Left: Recessed Preset Push-Button Well (1-6) & Dual SEEK Rocker */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Shared Recessed Keycap Well */}
            <div className="flex items-center gap-1 sm:gap-1.5 p-1 rounded bg-[#a8adb5]/60 border border-stone-400/80 shadow-[inset_0_1.5px_4px_rgba(0,0,0,0.35),0_1px_0_rgba(255,255,255,0.6)] shrink-0">
              {stations.slice(0, 6).map((st, idx) => {
                const isSelected = st.id === station.id;
                const presetNum = idx + 1;
                const isFlashing = flashPresetIdx === idx;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handlePresetClick(st, idx)}
                    onPointerDown={(e) => handlePresetPointerDown(idx, e)}
                    onPointerUp={() => handlePresetPointerUp(st, idx)}
                    onPointerCancel={() => handlePresetPointerCancel(idx)}
                    onContextMenu={(e) => e.preventDefault()}
                    className={`flex flex-col items-center justify-between py-1 px-0.5 w-6 sm:w-7 h-9 sm:h-11 rounded-[3px] border transition-all select-none touch-manipulation relative cursor-pointer ${
                      isSelected
                        ? 'translate-y-[1px] bg-gradient-to-b from-stone-400 via-stone-500 to-stone-600 border-stone-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]'
                        : 'translate-y-0 bg-gradient-to-b from-stone-50 via-stone-200 to-stone-300 hover:from-white hover:to-stone-200 border-t-white/90 border-x-stone-300 border-b-stone-400 shadow-[0_2px_3px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.8)] active:translate-y-[1px] active:shadow-inner'
                    }`}
                    title={`[${presetNum}] ${st.frequency} ${isSeoulBand ? (st.nameKo || st.name) : st.name} (Hold to Save Current Station)`}
                  >
                    {/* Flush Molded Optical Tally Lens */}
                    <div className="w-2.5 sm:w-3 h-1.5 rounded-[1px] bg-[#1a140a] p-[1px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)] flex items-center justify-center">
                      <span
                        className={`w-full h-full rounded-[0.5px] transition-all ${
                          isFlashing
                            ? 'bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,1)] animate-ping'
                            : isSelected
                              ? 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,1),inset_0_0.5px_1px_rgba(255,255,255,0.8)]'
                              : 'bg-[#4d3205]/80'
                        }`}
                      />
                    </div>
                    {/* Pad-Printed / Laser-Etched Number-Only Label */}
                    <span
                      className={`text-[9.5px] sm:text-xs font-black font-mono leading-none transition-colors ${
                        isSelected
                          ? 'text-amber-300 drop-shadow-[0_0_3px_rgba(251,191,36,0.6)]'
                          : 'text-stone-800 drop-shadow-[0_0.5px_0_rgba(255,255,255,0.8)]'
                      }`}
                    >
                      {presetNum}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Car Stereo Dual SEEK Rocker (SEEK on top row, |◀◀ | ▶▶| on bottom row) */}
            <div
              className="flex flex-col h-9 sm:h-11 w-14 sm:w-20 rounded-[3px] border border-t-white/90 border-x-stone-300 border-b-stone-400 bg-gradient-to-b from-stone-100 via-stone-200 to-stone-300 shadow-[0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.8)] overflow-hidden shrink-0 select-none"
              title="Seek Previous / Next Station"
            >
              {/* Top Row: Centered SEEK Label */}
              <div className="w-full h-3.5 sm:h-4 bg-stone-300/60 border-b border-stone-300 flex items-center justify-center pointer-events-none">
                <span className="text-[6.5px] sm:text-[7.5px] font-mono font-black text-stone-600 tracking-widest leading-none uppercase">
                  SEEK
                </span>
              </div>

              {/* Bottom Row: |◀◀ | ▶▶| Split with Molded Parting Groove */}
              <div className="flex items-stretch flex-1 w-full relative">
                <button
                  type="button"
                  onClick={onSeekPrev}
                  aria-label="Seek Previous"
                  className="flex-1 hover:bg-white active:bg-stone-300 active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.35)] active:translate-y-[0.5px] flex items-center justify-center transition-all cursor-pointer touch-manipulation group"
                  title="Seek Previous Station (|◀◀)"
                >
                  <SeekPrevIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-stone-700 group-hover:text-stone-950 transition-colors" />
                </button>

                {/* Center Molded Parting Groove Divider */}
                <div
                  className="w-[2px] self-stretch my-0.5 rounded-full bg-stone-400/90 shadow-[1px_0_0_rgba(255,255,255,0.7),inset_1px_0_0_rgba(0,0,0,0.25)] shrink-0 pointer-events-none"
                  aria-hidden="true"
                />

                <button
                  type="button"
                  onClick={onSeekNext}
                  aria-label="Seek Next"
                  className="flex-1 hover:bg-white active:bg-stone-300 active:shadow-[inset_0_1px_3px_rgba(0,0,0,0.35)] active:translate-y-[0.5px] flex items-center justify-center transition-all cursor-pointer touch-manipulation group"
                  title="Seek Next Station (▶▶|)"
                >
                  <SeekNextIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-stone-700 group-hover:text-stone-950 transition-colors" />
                </button>
              </div>
            </div>

            {/* Model & Micro Status Indicators with Turned Metal Collars */}
            <div className="hidden md:flex flex-col pl-2 border-l border-stone-400/70">
              <span className="text-[8px] font-mono font-black text-stone-700 tracking-wider">ST-2006</span>
              <div className="flex items-center gap-2 text-[7px] font-mono font-bold text-stone-700 mt-0.5">
                <span className="flex items-center gap-1" title="Stereo Reception">
                  <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-b from-stone-400 to-stone-200 p-[1px] shadow-[inset_0_1px_1.5px_rgba(0,0,0,0.6)] flex items-center justify-center">
                    <span className={`w-1.5 h-1.5 rounded-full transition-all ${isPlaying ? 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.9)]' : 'bg-stone-500/50'}`} />
                  </span>
                  <span>ST</span>
                </span>
                <span className="flex items-center gap-1" title="TimeShift Live Sync Active">
                  <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-b from-stone-400 to-stone-200 p-[1px] shadow-[inset_0_1px_1.5px_rgba(0,0,0,0.6)] flex items-center justify-center">
                    <span className={`w-1.5 h-1.5 rounded-full transition-all ${isLiveSync ? 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.9)] animate-pulse' : 'bg-amber-500/60'}`} />
                  </span>
                  <span>SYNC</span>
                </span>
              </div>
            </div>
          </div>

          {/* Center: Iconic Amber 7-Segment STN LCD Clock with Inky Liquid Crystals & Domed IR Sensor */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setClockMode(clockMode === 'local' ? 'broadcast' : 'local')}
              className="bg-gradient-to-b from-stone-500 via-stone-600 to-stone-700 p-0.5 sm:p-1 rounded-md border border-stone-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_1px_0_rgba(255,255,255,0.4)] group relative cursor-pointer"
              title={
                clockMode === 'local'
                  ? 'Local Time (Click to toggle Broadcast Time)'
                  : 'Broadcast Time (Click to toggle Local Time)'
              }
            >
              {/* Authentic Amber STN LCD Well with Inky Liquid Crystals & Parallax Drop Shadow */}
              <div className="amber-clock-module px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-[3px] flex items-center gap-1 sm:gap-1.5 relative overflow-hidden select-none">
                {/* AM/PM Tag */}
                <span className="font-mono text-[8px] sm:text-[9.5px] font-black tracking-tight text-[#141713] drop-shadow-[0.5px_0.5px_0px_rgba(40,25,5,0.35)]">
                  {ampm}
                </span>

                {/* 7-Segment DSEG Clock with Unlit Ghost 88:88 */}
                <div className="relative inline-block font-dseg-7 text-xs sm:text-base font-bold tracking-widest leading-none">
                  <span className="amber-clock-ghost">88:88</span>
                  <span className="absolute inset-0 amber-clock-active">{clockDigits}</span>
                </div>

                {clockMode === 'broadcast' && (
                  <span className="text-[7px] sm:text-[8px] font-mono font-black text-[#141713] uppercase tracking-tighter leading-none drop-shadow-[0.5px_0.5px_0px_rgba(40,25,5,0.35)]">
                    {activeBand === 'seoul_in_usa' ? 'SEOUL' : 'CA'}
                  </span>
                )}
                {/* Glass Specular Glare */}
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.22)_0%,transparent_50%)] pointer-events-none" />
              </div>
            </button>

            {/* Domed Dark Ruby IR Receiver Lens */}
            <div
              className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-gradient-to-b from-stone-500 to-stone-300 p-[1px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.7)] flex items-center justify-center hidden sm:flex"
              title="Infrared Remote Receiver"
            >
              <div className="w-full h-full rounded-full bg-gradient-to-br from-[#800a0a] via-[#450707] to-[#150202] shadow-[inset_0_1px_1px_rgba(255,100,100,0.4)] relative flex items-center justify-center">
                <span className="w-0.5 h-0.5 rounded-full bg-white/70 absolute top-[1px] left-[1px]" />
              </div>
            </div>
          </div>

          {/* Right: Power Button (Latching Push-Switch with Depressed Inset & Warm Amber Glow) */}
          <div className="flex items-center shrink-0">
            <button
              onClick={onTogglePlay}
              className={`flex flex-col items-center justify-center w-8 sm:w-10 h-9 sm:h-11 rounded-md border transition-all select-none cursor-pointer ${
                isPlaying
                  ? 'translate-y-[1.5px] bg-gradient-to-b from-stone-950 via-stone-900 to-stone-900 border-stone-900 text-amber-400 shadow-[inset_0_2px_5px_rgba(0,0,0,0.85),0_0_10px_rgba(245,158,11,0.25)]'
                  : 'translate-y-0 bg-gradient-to-b from-stone-700 via-stone-800 to-stone-900 border-stone-600 hover:border-stone-500 text-stone-400 shadow-[0_2px_4px_rgba(0,0,0,0.35)] active:scale-95'
              }`}
              title="Main Power (전원)"
            >
              <Power
                className={`w-3.5 sm:w-4 h-3.5 sm:h-4 mb-0.5 transition-colors ${
                  isPlaying ? 'text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.8)]' : 'text-stone-400'
                }`}
              />
              <span
                className={`text-[7px] sm:text-[8px] font-mono font-black tracking-tight transition-colors leading-none ${
                  isPlaying ? 'text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.7)]' : 'text-stone-400'
                }`}
              >
                전원
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. CENTRAL SWIVEL MOUNTING HINGE (Heavy Cast Knuckle connecting Control Strip to Monitor) */}
      <div className="flex justify-center">
        <div className="w-24 sm:w-32 h-4 sm:h-5 bg-gradient-to-b from-stone-500 via-stone-600 to-stone-700 rounded-b-lg border-x-2 border-b-2 border-stone-600 shadow-[0_4px_8px_rgba(0,0,0,0.4)] relative flex items-center justify-center overflow-hidden">
          {/* Metallic Radial Highlight */}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.15)_30%,rgba(255,255,255,0.3)_50%,rgba(255,255,255,0.15)_70%,transparent_100%)] pointer-events-none" />
          {/* Center Pivot Seam Groove */}
          <div className="w-14 sm:w-18 h-[2px] bg-[#1a1715] rounded-full shadow-[0_1px_0_rgba(255,255,255,0.35),inset_0_1px_1px_rgba(0,0,0,0.8)]" />
        </div>
      </div>

      {/* 4. THE HANGING SWIVEL MONITOR (COSTEL / TIMESHIFT APARTMENT SCREEN) */}
      <div className="w-full max-w-2xl mx-auto -mt-1 relative">
        <div className="bg-gradient-to-b from-[#e5e7eb] via-[#d6d3d1] to-[#a8a29e] p-3 sm:p-4 rounded-3xl border-2 border-stone-400/90 shadow-2xl shadow-stone-950/80 relative overflow-hidden">
          {/* Bezel Metallic Highlights */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-white/80 pointer-events-none" />

          {/* Top Bezel Header: Upper-Left Video (CAM) Button, Central Branding & Upper-Right STATUS LED */}
          <div className="relative flex items-center justify-between mb-2 px-1">
            {/* Upper Left of Bezel: Physical Tactile CAM / Visible Radio Button */}
            <button
              type="button"
              onClick={handleToggleStudioCam}
              disabled={!hasVideo}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:py-1 rounded border transition-all select-none ${
                hasVideo
                  ? isStudioCamActive
                    ? 'bg-gradient-to-b from-rose-200 to-rose-400 border-rose-600 shadow-inner text-rose-950 cursor-pointer'
                    : 'bg-gradient-to-b from-stone-100 via-stone-200 to-stone-300 hover:from-white border-stone-400 shadow-[0_1px_3px_rgba(0,0,0,0.2)] text-stone-800 cursor-pointer active:scale-95'
                  : 'bg-stone-300/60 border-stone-400/40 text-stone-500/60 cursor-not-allowed opacity-60'
              }`}
              title={
                hasVideo
                  ? (isStudioCamActive
                    ? 'Switch to Audio Mode (Turn off Studio Cam)'
                    : 'Turn On Visible Radio Studio Cam (CAM)')
                  : 'Audio-Only Broadcast (No Studio Cam)'
              }
              aria-label="Toggle Visible Radio Studio Cam"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  hasVideo
                    ? isStudioCamActive
                      ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,1)] animate-pulse'
                      : 'bg-stone-400'
                    : 'bg-stone-400/50'
                }`}
              />
              <Video className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span className="text-[7.5px] sm:text-[8.5px] font-mono font-black uppercase tracking-tight">
                CAM
              </span>
            </button>

            <span className="text-[9px] sm:text-[10px] font-sans font-bold tracking-widest text-stone-600 uppercase text-center">
              MULTIMEDIA HOME SYSTEM
            </span>

            {/* Upper Right of the Bezel: Physical Hardware LED with static label STATUS */}
            <div
              className="flex items-center gap-1.5 font-mono cursor-default"
              title={ledConfig.tooltipEn}
              data-testid="status-led-container"
            >
              <span className="text-[7.5px] sm:text-[8.5px] font-bold tracking-wider text-stone-600 uppercase">
                STATUS
              </span>
              {/* Recessed Metallic LED Holder */}
              <div className="w-3 h-3 rounded-full bg-gradient-to-b from-stone-400 to-stone-200 p-[1px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] flex items-center justify-center">
                <span
                  data-testid="status-led"
                  data-status={telemetry?.status || (isPlaying ? 'playing' : 'idle')}
                  data-color={ledConfig.color}
                  data-pattern={ledConfig.pattern}
                  data-action={ledConfig.actionHint}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${ledConfig.className}`}
                />
              </div>
            </div>
          </div>

          {/* Inner Screen Chassis Frame (Dark LCD Housing with Cavity Bevel) */}
          <div className="relative rounded-2xl bg-black border-2 border-stone-700 shadow-[inset_0_3px_10px_rgba(0,0,0,0.9)] overflow-hidden">
            {isStudioCamActive && hasVideo && videoId ? (
              /* Video Mode: Embedded 16:9 YouTube Visible Radio Player with Selectable Hardware After-Effects */
              <div
                className={`relative w-full aspect-video flex items-center justify-center overflow-hidden transition-all duration-200 ${
                  camEffectMode === 'tft' || camEffectMode === 'osd'
                    ? 'bg-[#050b0e]'
                    : 'bg-black'
                } ${
                  isTransitioningCam && (camEffectMode === 'tft' || camEffectMode === 'osd')
                    ? 'animate-tft-power-dip'
                    : ''
                }`}
              >
                {/* 1. Underlying YouTube Video Stream with Conditional Post-Processing Filter */}
                <div
                  className="w-full h-full"
                  style={{
                    filter:
                      camEffectMode === 'tft' || camEffectMode === 'osd'
                        ? 'contrast(1.04) brightness(0.98) saturate(1.08)'
                        : camEffectMode === 'composite'
                          ? 'contrast(1.08) saturate(1.12) hue-rotate(-1deg)'
                          : 'none',
                  }}
                >
                  <iframe
                    ref={iframeRef}
                    key={`${videoId}-${resolvedStream?.broadcastHour || station.id}-${isStudioCamActive}`}
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1${videoStartSeconds > 0 ? `&start=${videoStartSeconds}` : ''}&mute=0&controls=1&modestbranding=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`}
                    title={showTitle}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    onLoad={handleIframeLoad}
                  />
                </div>

                {/* Era-Unified Video Hardware Optics */}
                {audioDisplayMode === 'vfd' ? (
                  /* ============================================================
                     1980s-90s ANALOG BROADCAST CRT / COMPOSITE STUDIO MONITOR
                     Matching the VFD component rack: NTSC scanlines,
                     analog sync sweep, and phosphor studio telemetry.
                     ============================================================ */
                  <>
                    {/* H-Sync sweep on mode switch */}
                    {isTransitioningCam && (
                      <div
                        aria-hidden="true"
                        className="absolute inset-x-0 h-10 bg-white/20 blur-[2px] pointer-events-none z-30 animate-hsync-sweep"
                      />
                    )}

                    {/* Analog Composite NTSC Horizontal Raster Scanlines */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 pointer-events-none z-20 opacity-[0.08]"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(to bottom, rgba(0,0,0,0.85) 0px, rgba(0,0,0,0.85) 1px, transparent 1px, transparent 2px)',
                      }}
                    />

                    {/* CRT Glass Curvature & Glare */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 pointer-events-none z-22 shadow-[inset_0_3px_18px_rgba(0,0,0,0.9)]"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 pointer-events-none z-25 bg-[linear-gradient(135deg,rgba(255,255,255,0.08)_0%,transparent_38%)]"
                    />

                    {/* Analog Broadcast OSD Telemetry */}
                    <div
                      className={`absolute top-3 left-3 pointer-events-none z-30 font-mono flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/80 border border-emerald-500/70 text-[#34d399] text-[9.5px] font-black tracking-wider shadow-md drop-shadow-[0_0_3px_rgba(52,211,153,0.8)] ${
                        isTransitioningCam ? 'animate-osd-double-blink' : ''
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span>CAM 1 • CH {station.frequency}</span>
                    </div>

                    <div
                      className="absolute top-3 right-28 sm:right-32 pointer-events-none z-30 font-mono text-[8.5px] px-2 py-0.5 rounded bg-black/80 border border-emerald-900/60 text-emerald-400/90 hidden sm:flex items-center gap-1.5 shadow-md"
                    >
                      <span>NTSC 480i</span>
                      <span className="text-emerald-700">•</span>
                      <span>STEREO</span>
                      <span className="text-emerald-700">•</span>
                      <span>{activeBand === 'seoul_in_usa' ? 'KST' : 'PDT'} {broadcastTimeStr || '07:24:00'}</span>
                    </div>

                    <div className="absolute bottom-3 left-3 max-w-[65%] pointer-events-none z-30 font-mono text-[8.5px] px-2 py-0.5 rounded bg-black/80 border border-emerald-950/80 text-emerald-300/80 truncate hidden sm:block shadow-md">
                      <span>ON-AIR: {showTitle}</span>
                    </div>
                  </>
                ) : (
                  /* ============================================================
                     2000s COLOR ACTIVE-MATRIX TFT-LCD MONITOR
                     Matching the Color TFT audio screen: RGB subpixel triad
                     aperture grid, CCFL edge glow, and digital receiver telemetry.
                     ============================================================ */
                  <>
                    {/* RGB Subpixel Triad Aperture Grid */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 tft-subpixel-grid opacity-20 pointer-events-none z-20"
                    />

                    {/* CCFL Edge Glow & Acrylic Anti-Reflective Glare */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 tft-glare pointer-events-none z-25"
                    />

                    {/* Modern Digital Multimedia Receiver OSD */}
                    <div
                      className="absolute top-3 left-3 pointer-events-none z-30 font-mono flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/75 border border-sky-600/40 text-sky-200 text-[9.5px] font-bold tracking-wider shadow-md"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_4px_rgba(244,63,94,0.9)]" />
                      <span>
                        {resolvedStream?.isLiveVideoStream
                          ? 'LIVE CAM 1 • 1080p60'
                          : 'STUDIO VOD • 1080p60'}
                      </span>
                    </div>

                    <div
                      className="absolute top-3 right-28 sm:right-32 pointer-events-none z-30 font-mono text-[8.5px] px-2 py-0.5 rounded bg-black/75 border border-sky-900/50 text-sky-300/90 hidden sm:flex items-center gap-1.5 shadow-md"
                    >
                      <span>CH {presetChText}</span>
                      <span className="text-sky-600">•</span>
                      <span className="text-emerald-400 font-bold">SYNC +0.0ms</span>
                      <span className="text-sky-600">•</span>
                      <span>{station.frequency}</span>
                    </div>

                    <div className="absolute bottom-3 left-3 max-w-[65%] pointer-events-none z-30 font-mono text-[8.5px] px-2 py-0.5 rounded bg-black/75 border border-sky-950/80 text-sky-200/90 truncate hidden sm:block shadow-md">
                      <span className="text-amber-400 font-bold mr-1">▶</span>
                      <span>{showTitle}</span>
                    </div>
                  </>
                )}

                {/* Return to Radio Audio Mode Button (Interactive, high z-index) */}
                <button
                  type="button"
                  onClick={handleToggleStudioCam}
                  className="absolute top-3 right-3 z-40 bg-stone-900/90 hover:bg-stone-900 active:scale-95 text-stone-200 text-[10px] font-mono px-2 py-1 rounded border border-stone-600 shadow-md flex items-center gap-1 transition-all cursor-pointer"
                  title="Return to Radio Audio Mode"
                >
                  ✕ Audio Mode
                </button>
              </div>
            ) : (
              /* Audio Mode: Selectable LCD Matrix or VFD Vacuum Tube Screen (Zero Layout Shift) */
              <div
                data-testid="audio-display-screen"
                data-display-mode={audioDisplayMode}
                className={`p-3 sm:p-4.5 flex flex-col justify-between h-[255px] sm:h-[280px] relative overflow-hidden transition-colors duration-300 ${
                  audioDisplayMode === 'vfd'
                    ? 'bg-gradient-to-b from-[#020507] via-[#03090c] to-[#010304] border border-cyan-950/40 shadow-[inset_0_4px_24px_rgba(0,0,0,0.98)]'
                    : 'bg-gradient-to-br from-[#0a1215] via-[#070e10] to-[#020506] shadow-[inset_0_4px_16px_rgba(0,0,0,0.9)]'
                }`}
              >
                {/* Saved Preset Toast Banner (Shared OSD Overlay) */}
                {savedPresetNotification && (
                  <div
                    data-testid="preset-saved-banner"
                    className="absolute top-2 left-2 right-2 sm:top-3 sm:left-4 sm:right-4 z-50 px-3 py-1.5 rounded-lg bg-amber-500 text-stone-950 font-mono text-xs font-bold flex items-center justify-between shadow-xl shadow-amber-500/40 animate-pulse"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-stone-950" />
                      <span>
                        PRESET [{savedPresetNotification.slotNumber}] SAVED
                      </span>
                    </span>
                    <span className="text-[11px] font-semibold truncate max-w-[170px]">
                      {savedPresetNotification.stationName}
                    </span>
                  </div>
                )}

                {audioDisplayMode === 'vfd' ? (
                  /* ============================================================
                     AUTHENTIC VFD (VACUUM FLUORESCENT DISPLAY) HARDWARE ENGINE
                     Physical 505nm ZnO:Zn phosphors, DSEG segmented numerals,
                     unlit ghost pads, spring-tensioned cathode filaments,
                     and stamped hardware audio tuner annunciators.
                     ============================================================ */
                  <>
                    {/* Layer 1: Hexagonal Wire Mesh Control Grid Screen */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 vfd-hex-grid opacity-20 pointer-events-none z-10"
                    />

                    {/* Layer 2: Cylindrical Convex Smoked Glass Specular Glare */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 vfd-glass-glare pointer-events-none z-40"
                    />

                    {/* TOP ROW: Hardware Annunciators & 7-Segment Amber Clock */}
                    <div className="relative z-20 flex items-center justify-between border-b border-cyan-950/40 pb-1.5 sm:pb-2">
                      {/* Left: TUNED Carrier Lock Indicator */}
                      <div className="flex items-center gap-1.5 sm:gap-2.5">
                        <div className="px-1.5 py-0.5 rounded border border-cyan-900/50 bg-[#020b0e]/90 flex items-center shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]">
                          <span className="font-mono text-[9.5px] font-black tracking-wider vfd-glow-cyan">TUNED</span>
                        </div>
                      </div>

                      {/* Right: LIVE / TIMESHIFT Tally */}
                      <div className="flex items-center flex-shrink-0 ml-2">
                        {/* Source Tally Badge */}
                        {(station.isPaywalled || resolvedStream?.isPaywalled) ? (
                          <div className="px-2 py-0.5 rounded border border-red-950/70 bg-[#160204]/90 flex items-center gap-1 shadow-[inset_0_1px_3px_rgba(0,0,0,0.9)]">
                            <span className="font-mono text-[10px] font-black tracking-wider vfd-glow-red">🔒 PAYWALLED</span>
                          </div>
                        ) : (resolvedStream?.tier === 'live_direct' || (resolvedStream as any)?.isLiveOnAir) ? (
                          <div className="px-2 py-0.5 rounded border border-red-950/70 bg-[#160204]/90 flex items-center gap-1.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.9)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_#ff4757] animate-pulse" />
                            <span className="font-mono text-[10px] font-black tracking-wider vfd-glow-red">
                              LIVE ON-AIR
                            </span>
                          </div>
                        ) : (
                          <div className="px-2 py-0.5 rounded border border-cyan-950/60 bg-[#021316]/90 flex items-center gap-1.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.9)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#38efc6]" />
                            <span className="font-mono text-[10px] font-black tracking-wider vfd-glow-cyan">
                              {resolvedStream?.isReplay ? 'TIMESHIFT REPLAY' : 'TIMESHIFT AOD'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* MIDDLE ROW: Main Show Title & Large Segmented Frequency Module */}
                    <div className="relative z-20 my-auto py-1 flex items-center justify-between gap-2.5 sm:gap-4">
                      {/* Left: Station & Show Info with Dot-Matrix Phosphor Mask */}
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center justify-start gap-1.5 sm:gap-2 mb-1 min-w-0">
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-black tracking-widest bg-cyan-950/70 border border-cyan-500/40 vfd-glow-cyan flex-shrink-0">
                            {stationDisplayName}
                          </span>
                          <span className="text-[10px] font-mono text-cyan-400/70 truncate min-w-0">
                            {station.city}
                          </span>
                        </div>

                        {/* Show Title with Marquee Auto-Scroll & Dot-Matrix Phosphor Mask */}
                        <h3 className="vfd-glow-cyan vfd-dot-matrix-text min-w-0">
                          <MarqueeText
                            text={showTitle}
                            className="text-base sm:text-2xl font-black tracking-tight leading-none"
                          />
                        </h3>

                        {/* LINE 3: Dynamic Content Row (Host, Guests, Episode Subtitle, Telemetry, or Blank Line) */}
                        {line3Text ? (
                          <div className="mt-1 h-[21px] sm:h-[23px] flex items-center min-w-0">
                            <MarqueeText
                              text={line3Text}
                              className={`text-[10px] sm:text-[11px] font-mono ${
                                isLine3Alert
                                  ? 'vfd-glow-red font-black text-red-300'
                                  : 'vfd-glow-amber font-bold text-amber-300/90'
                              }`}
                            />
                          </div>
                        ) : (
                          /* Blank line placeholder: preserves line height so layout never jumps across stations */
                          <div className="mt-1 h-[21px] sm:h-[23px] text-[10px] sm:text-[10.5px] font-mono select-none opacity-0 pointer-events-none" aria-hidden="true">
                            &nbsp;
                          </div>
                        )}
                      </div>

                      {/* Right: Giant DSEG Segmented Frequency Module with Physical Unlit Ghost Pads */}
                      <div className="flex-shrink-0 flex items-baseline gap-1 sm:gap-1.5 bg-[#020b0e]/95 border border-cyan-800/40 rounded-lg px-1.5 sm:px-2.5 py-1 sm:py-1.5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.95)]">
                        <div className="relative font-dseg-7 text-xl sm:text-3xl lg:text-4xl font-black tracking-normal leading-none select-none">
                          {/* Unlit Ghost 888.8 (Fixed 4-Cell Frame: Hundreds, Tens, Ones+Dot, Tenths) */}
                          <span className="vfd-unlit">888.8</span>
                          {/* Active Frequency Digits: strictly fixed place, aligned right */}
                          <span className="absolute inset-0 text-right vfd-glow-cyan">{formattedFreq}</span>
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="font-mono text-xs sm:text-sm font-black tracking-widest vfd-glow-cyan">{freqUnit}</span>
                          <span className="font-mono text-[9px] text-cyan-500/60 font-bold -mt-0.5">BAND</span>
                        </div>
                      </div>
                    </div>

                    {/* BOTTOM ROW: Spectrum Analyzer with Stepped Fluorescent Ladder Physics */}
                    <div className="relative z-20 w-full pt-1 sm:pt-1.5 border-t border-cyan-950/40">
                      <div className="flex items-center justify-start text-[8px] sm:text-[9.5px] font-mono text-cyan-500/60 pb-1 px-1">
                        <span className="tracking-wider">SPECTRUM ANALYZER</span>
                      </div>
                      <div className="w-full h-10 sm:h-12 bg-black/90 rounded border border-cyan-900/40 p-1 shadow-[inset_0_2px_6px_rgba(0,0,0,0.95)]">
                        <AudioVisualizer isPlaying={isPlaying} color="#38efc6" isVfd={true} />
                      </div>
                    </div>
                  </>
                ) : (
                  /* ============================================================
                     COLOR ACTIVE-MATRIX TFT-LCD MULTI-FUNCTION MONITOR
                     Physical RGB subpixel aperture grid, CCFL edge luminescence,
                     backlit DSEG frequency module with 888.88 ghost,
                     hardware annunciators (Stereo concentric rings, 5-bar signal),
                     and multi-color stepped level ladder visualizer.
                     ============================================================ */
                  <>
                    {/* Layer 1: Physical RGB Subpixel Aperture Grid */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 tft-subpixel-grid opacity-20 pointer-events-none z-20"
                    />

                    {/* Layer 2: CCFL Edge Luminescence & Anti-Reflective Acrylic Glare */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 tft-glare pointer-events-none z-25"
                    />

                    {/* TOP ROW: Hardware Annunciators, Stereo Concentric Rings, 5-Bar Signal Meter, & Status */}
                    <div className="relative z-10 flex items-center justify-between border-b border-sky-950/60 pb-1.5 sm:pb-2">
                      {/* Left: TUNED Carrier Lock Indicator & 5-Bar Signal Meter */}
                      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
                        <div
                          className="px-1.5 py-0.5 rounded border border-sky-900/40 bg-sky-950/30 text-[9.5px] font-mono text-sky-300 font-bold flex items-center gap-1.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]"
                          title="Carrier Locked: Signal Strength 5/5"
                        >
                          <span className="tracking-wider">TUNED</span>
                          <div className="inline-flex items-flex-end gap-[2px] h-2.5">
                            <div className="w-[2px] h-1 bg-sky-400 rounded-[0.5px]" />
                            <div className="w-[2px] h-1.5 bg-sky-400 rounded-[0.5px]" />
                            <div className="w-[2px] h-2 bg-sky-400 rounded-[0.5px]" />
                            <div className="w-[2px] h-2.5 bg-sky-400 rounded-[0.5px]" />
                          </div>
                        </div>
                      </div>

                      {/* Right side: Source Indicator Badge (LIVE / TIMESHIFT / PAYWALLED) */}
                      <div className="flex items-center flex-shrink-0 ml-2">
                        {(station.isPaywalled || resolvedStream?.isPaywalled) ? (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-amber-950/90 text-amber-300 border-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.4)]">
                            🔒 PAYWALLED
                          </span>
                        ) : resolvedStream && (
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border inline-flex items-center gap-1.5 bg-sky-950/60 text-sky-300 border-sky-800/60">
                            {resolvedStream.tier === 'live_direct' || (resolvedStream as any).isLiveOnAir ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_6px_rgba(244,63,94,0.9)]" />
                                <span className="text-rose-200 font-bold">LIVE ON-AIR</span>
                              </>
                            ) : resolvedStream.isReplay ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.8)]" />
                                <span className="text-amber-200 font-bold">TIMESHIFT [Replay]</span>
                              </>
                            ) : (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]" />
                                <span className="text-emerald-200 font-bold">TIMESHIFT [AOD]</span>
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* MIDDLE ROW: Full-Color Station & Show Info + Backlit DSEG Frequency Module */}
                    <div className="relative z-10 my-auto py-1 flex items-center justify-between gap-2.5 sm:gap-4">
                      {/* Left: Station Metadata, Show Title, DJ */}
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center justify-start gap-1.5 sm:gap-2 mb-1 min-w-0">
                          <span className="text-xs font-bold font-mono tracking-tight text-sky-400 drop-shadow-[0_0_4px_rgba(56,189,248,0.4)] flex-shrink-0">
                            {stationDisplayName}
                          </span>
                          <span className="text-[10px] font-mono text-stone-400 truncate min-w-0">
                            {station.city}
                          </span>
                        </div>

                        {/* Show Title with Marquee Auto-Scroll */}
                        <h3 className="min-w-0">
                          <MarqueeText
                            text={showTitle}
                            className="text-base sm:text-2xl font-black tracking-tight leading-none text-[#f8fafc] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                          />
                        </h3>

                        {/* LINE 3: Dynamic Content Row (Host, Guests, Episode Subtitle, Telemetry, or Blank Line) */}
                        {line3Text ? (
                          <div className="mt-1 h-[21px] sm:h-[23px] flex items-center min-w-0">
                            <MarqueeText
                              text={line3Text}
                              className={`text-[10.5px] sm:text-[11.5px] font-mono ${
                                isLine3Alert
                                  ? 'text-rose-400 drop-shadow-[0_0_4px_rgba(244,63,94,0.5)] font-bold'
                                  : 'text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.4)] font-semibold'
                              }`}
                            />
                          </div>
                        ) : (
                          /* Blank line placeholder: preserves line height so layout never jumps across stations */
                          <div className="mt-1 h-[21px] sm:h-[23px] text-[10px] sm:text-[11px] font-mono select-none opacity-0 pointer-events-none" aria-hidden="true">
                            &nbsp;
                          </div>
                        )}
                      </div>

                      {/* Right: Backlit DSEG Segmented Frequency Module with 888.8 Ghost */}
                      <div className="flex-shrink-0 flex items-baseline gap-1 sm:gap-1.5 bg-[#040a10]/95 border border-sky-600/30 rounded-lg px-1.5 sm:px-2.5 py-1 sm:py-1.5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8),0_0_12px_rgba(2,132,199,0.15)]">
                        <div className="relative font-dseg-7 text-xl sm:text-3xl lg:text-4xl font-black tracking-normal leading-none select-none">
                          {/* Unlit Ghost 888.8 (Fixed 4-Cell Frame) */}
                          <span className="text-sky-950/40 select-none">888.8</span>
                          {/* Active Frequency Digits in Backlit Cyan-White, aligned right */}
                          <span className="absolute inset-0 text-right text-sky-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]">
                            {formattedFreq}
                          </span>
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="font-mono text-xs sm:text-sm font-black tracking-widest text-sky-400">{freqUnit}</span>
                          <span className="font-mono text-[9px] text-sky-600 font-bold -mt-0.5">BAND</span>
                        </div>
                      </div>
                    </div>

                    {/* BOTTOM ROW: Color TFT Stepped Level Meter Visualizer */}
                    <div className="relative z-10 w-full pt-1 sm:pt-1.5 border-t border-sky-950/60">
                      <div className="flex items-center justify-start text-[8px] sm:text-[9.5px] font-mono text-sky-500/70 pb-1 px-1">
                        <span className="tracking-wider">SPECTRUM ANALYZER</span>
                      </div>
                      <div className="w-full h-10 sm:h-12 bg-black/90 rounded border border-sky-900/40 p-1 shadow-[inset_0_2px_6px_rgba(0,0,0,0.95)]">
                        <AudioVisualizer isPlaying={isPlaying} color="#0284c7" isVfd={false} />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Bottom Bezel Branding Silkscreen: TIMESHIFT & Punched Speaker Grille */}
          <div className="flex items-center justify-between mt-2 px-2">
            <div className="w-8" />
            {/* TIMESHIFT Brand Logo (in Costel Typographic Style) */}
            <span className="font-sans font-black tracking-[0.25em] text-xs sm:text-sm text-stone-700 uppercase drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]">
              TIMESHIFT
            </span>

            {/* Mic / Speaker Perforation Dots (3x4 Stamped Punched Holes) */}
            <div className="grid grid-cols-4 gap-1 opacity-80" aria-hidden="true">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-[#1c1917] shadow-[0.5px_0.5px_0_rgba(255,255,255,0.45),inset_0_1px_1px_rgba(0,0,0,0.9)]"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
