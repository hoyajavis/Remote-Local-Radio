import { useState, useEffect, useCallback } from 'react';
import { TimeShiftInfo, BandMode } from '../types/radio';
import { fetchTimeShiftStatus } from '../services/api';
import { audioEngine } from '../services/audioEngine';
import { DEFAULT_SCHEDULE } from '../data/defaultStations';

interface UseTimeShiftClockOptions {
  activeBand: BandMode;
  isPlaying: boolean;
  currentStationId: string;
}

export function useTimeShiftClock({
  activeBand,
  isPlaying,
  currentStationId
}: UseTimeShiftClockOptions) {
  const [userTimezone, setUserTimezone] = useState<string>(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles';
    } catch {
      return 'America/Los_Angeles';
    }
  });

  const [isLiveSync, setIsLiveSync] = useState<boolean>(true);
  const [scrubbedHour, setScrubbedHour] = useState<number>(7);

  const [timeShiftData, setTimeShiftData] = useState<Partial<TimeShiftInfo>>({
    userLocalTimeStr: '07:00:00',
    seoulLiveTimeStr: '23:00:00',
    broadcastTimeStr: '07:00:00',
    offsetHours: 16,
    currentSlot: DEFAULT_SCHEDULE[2],
  });

  // Accurate TimeShift Target Clock Calculator (sub-minute precision)
  const getTargetTime = useCallback(() => {
    const timeStr = isLiveSync
      ? (timeShiftData?.broadcastTimeStr || '07:00:00')
      : `${String(scrubbedHour).padStart(2, '0')}:00:00`;
    const parts = timeStr.split(':').map(Number);
    const hour = isNaN(parts[0]) ? 7 : parts[0];
    const minute = isNaN(parts[1]) ? 0 : parts[1];
    const second = isNaN(parts[2]) ? (isLiveSync ? new Date().getSeconds() : 0) : parts[2];
    return { hour, minute, second };
  }, [isLiveSync, timeShiftData?.broadcastTimeStr, scrubbedHour]);

  // Update time shift status from server with local math fallback
  const refreshTimeShift = useCallback(async () => {
    try {
      const data = await fetchTimeShiftStatus(
        userTimezone,
        isLiveSync,
        isLiveSync ? undefined : scrubbedHour,
        undefined,
        activeBand
      );
      if (data) {
        setTimeShiftData(data);
      }
    } catch {
      const now = new Date();
      const localH = now.getHours();
      const localM = now.getMinutes();
      const localS = now.getSeconds();
      const targetH = isLiveSync ? localH : scrubbedHour;
      setTimeShiftData((prev) => ({
        ...prev,
        userLocalTimeStr: `${String(localH).padStart(2, '0')}:${String(localM).padStart(2, '0')}:${String(localS).padStart(2, '0')}`,
        broadcastTimeStr: `${String(targetH).padStart(2, '0')}:${String(localM).padStart(2, '0')}:${String(localS).padStart(2, '0')}`,
        offsetHours: activeBand === 'seoul_in_usa' ? 16 : 8,
      }));
    }
  }, [userTimezone, isLiveSync, scrubbedHour, activeBand]);

  // Periodic clock update & Top-of-Hour Automatic Transition Checker
  useEffect(() => {
    refreshTimeShift();
    const interval = setInterval(() => {
      refreshTimeShift();
      if (isPlaying && isLiveSync) {
        const { hour, minute } = getTargetTime();
        const sec = new Date().getSeconds();
        audioEngine.checkTopOfHourTransition(hour, minute, sec, currentStationId, activeBand);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [refreshTimeShift, isPlaying, isLiveSync, getTargetTime, currentStationId, activeBand]);

  // Scrub hour
  const handleScrubHour = (hour: number) => {
    setScrubbedHour(hour);
    setIsLiveSync(false);
    if (isPlaying) {
      audioEngine.tuneTo(currentStationId, hour, 0, 0, activeBand);
    }
  };

  // Toggle Live Sync
  const handleToggleLiveSync = () => {
    const nextVal = !isLiveSync;
    setIsLiveSync(nextVal);
    if (nextVal && isPlaying) {
      const { hour, minute, second } = getTargetTime();
      audioEngine.tuneTo(currentStationId, hour, minute, second, activeBand);
    }
  };

  // Jump directly to local time
  const handleJumpLocalTime = () => {
    setIsLiveSync(true);
    if (isPlaying) {
      const { hour, minute, second } = getTargetTime();
      audioEngine.tuneTo(currentStationId, hour, minute, second, activeBand);
    }
  };

  return {
    userTimezone,
    setUserTimezone,
    isLiveSync,
    setIsLiveSync,
    scrubbedHour,
    setScrubbedHour,
    timeShiftData,
    setTimeShiftData,
    getTargetTime,
    refreshTimeShift,
    handleScrubHour,
    handleToggleLiveSync,
    handleJumpLocalTime,
  };
}
