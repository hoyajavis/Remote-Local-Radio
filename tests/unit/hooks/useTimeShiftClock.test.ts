import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimeShiftClock } from '@/src/hooks/useTimeShiftClock';
import * as api from '@/src/services/api';
import { audioEngine } from '@/src/services/audioEngine';

vi.mock('@/src/services/api', () => ({
  fetchTimeShiftStatus: vi.fn().mockResolvedValue({
    userLocalTimeStr: '07:24:00',
    seoulLiveTimeStr: '23:24:00',
    broadcastTimeStr: '07:24:00',
    offsetHours: 16,
  }),
}));

vi.mock('@/src/services/audioEngine', () => ({
  audioEngine: {
    checkTopOfHourTransition: vi.fn(),
    tuneTo: vi.fn(),
  },
}));

describe('useTimeShiftClock hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with live sync enabled and fetches status', async () => {
    let hookResult: any;
    await act(async () => {
      hookResult = renderHook(() =>
        useTimeShiftClock({
          activeBand: 'seoul_in_usa',
          isPlaying: false,
          currentStationId: 'mbc-919',
        })
      );
    });

    const { result } = hookResult;
    expect(result.current.isLiveSync).toBe(true);
    expect(result.current.userTimezone).toBeTruthy();
    expect(result.current.timeShiftData.broadcastTimeStr).toBe('07:24:00');
    expect(result.current.timeShiftData.offsetHours).toBe(16);
  });

  it('switches to scrub mode when handleScrubHour is called', async () => {
    let hookResult: any;
    await act(async () => {
      hookResult = renderHook(() =>
        useTimeShiftClock({
          activeBand: 'seoul_in_usa',
          isPlaying: true,
          currentStationId: 'mbc-919',
        })
      );
    });

    const { result } = hookResult;

    await act(async () => {
      result.current.handleScrubHour(14);
    });

    expect(result.current.isLiveSync).toBe(false);
    expect(result.current.scrubbedHour).toBe(14);
    expect(audioEngine.tuneTo).toHaveBeenCalledWith('mbc-919', 14, 0, 0, 'seoul_in_usa');
  });

  it('toggles live sync with handleToggleLiveSync', async () => {
    let hookResult: any;
    await act(async () => {
      hookResult = renderHook(() =>
        useTimeShiftClock({
          activeBand: 'seoul_in_usa',
          isPlaying: true,
          currentStationId: 'sbs-1077',
        })
      );
    });

    const { result } = hookResult;

    // Initial state is true -> toggle to false
    await act(async () => {
      result.current.handleToggleLiveSync();
    });
    expect(result.current.isLiveSync).toBe(false);

    // Toggle back to true -> tunes to target time
    await act(async () => {
      result.current.handleToggleLiveSync();
    });
    expect(result.current.isLiveSync).toBe(true);
    expect(audioEngine.tuneTo).toHaveBeenCalled();
  });

  it('jumps to local time with handleJumpLocalTime', async () => {
    let hookResult: any;
    await act(async () => {
      hookResult = renderHook(() =>
        useTimeShiftClock({
          activeBand: 'california_in_seoul',
          isPlaying: true,
          currentStationId: 'kqei-893',
        })
      );
    });

    const { result } = hookResult;

    // First scrub
    await act(async () => {
      result.current.handleScrubHour(21);
    });
    expect(result.current.isLiveSync).toBe(false);

    // Jump back to local time
    await act(async () => {
      result.current.handleJumpLocalTime();
    });
    expect(result.current.isLiveSync).toBe(true);
    expect(audioEngine.tuneTo).toHaveBeenCalled();
  });

  it('uses local fallback calculation when API request fails', async () => {
    vi.mocked(api.fetchTimeShiftStatus).mockRejectedValueOnce(new Error('Network offline'));

    let hookResult: any;
    await act(async () => {
      hookResult = renderHook(() =>
        useTimeShiftClock({
          activeBand: 'seoul_in_usa',
          isPlaying: false,
          currentStationId: 'kbs-891',
        })
      );
    });

    const { result } = hookResult;
    expect(result.current.timeShiftData.userLocalTimeStr).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(result.current.timeShiftData.offsetHours).toBe(16);
  });
});
