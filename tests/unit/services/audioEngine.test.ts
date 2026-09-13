import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { audioEngine, PlaybackTelemetry } from '@/src/services/audioEngine';

describe('AudioEngine Service & Telemetry State Machine', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch = vi.fn();
    global.fetch = mockFetch as any;
    audioEngine.init();
    audioEngine.stop();
  });

  afterEach(() => {
    audioEngine.stop();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('initializes with idle telemetry state', () => {
    const telemetry = audioEngine.getTelemetry();
    expect(telemetry.status).toBe('idle');
    expect(telemetry.retryAttempt).toBe(0);
    expect(telemetry.maxRetries).toBe(3);
  });

  it('notifies subscribers when telemetry status changes', () => {
    const listener = vi.fn();
    const unsubscribe = audioEngine.subscribeTelemetry(listener);

    // Initial notification on subscribe
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'idle' })
    );

    audioEngine.setTelemetry('tuning');
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'tuning' })
    );

    unsubscribe();
    audioEngine.setTelemetry('playing');
    // Listener should not be called after unsubscribing
    expect(listener).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: 'playing' })
    );
  });

  it('transitions tuning -> buffering when playing a resolved stream', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        stationId: 'mbc-919',
        stationName: 'MBC FM4U',
        showTitle: '???FM ?????',
        showTitleKo: '???FM ?????',
        djName: '??',
        broadcastHour: 7,
        tier: 'tier1_rss',
        tierLabel: 'Official Podcast Stream',
        audioUrl: 'https://example.com/audio.mp3',
        seekOffsetSeconds: 120,
        totalDurationSeconds: 7200,
        isReplay: false,
      }),
    });

    const telemetryEvents: string[] = [];
    audioEngine.subscribeTelemetry((t) => telemetryEvents.push(t.status));

    const playPromise = audioEngine.play('mbc-919', 7, 2, 0, 'seoul_in_usa');
    await vi.runAllTimersAsync();
    await playPromise;

    expect(telemetryEvents).toContain('tuning');
    expect(telemetryEvents).toContain('buffering');
    expect(audioEngine.getIsPlaying()).toBe(true);
  });

  it('handles paywalled stations directly without retry loop', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        stationId: 'kpig-1075',
        stationName: 'KPIG 107.5',
        showTitle: 'Freedom In The Morning',
        showTitleKo: '??? ? ? ??',
        djName: 'KPIG',
        broadcastHour: 7,
        tier: 'paywalled',
        tierLabel: 'Paywalled Broadcaster',
        audioUrl: '',
        seekOffsetSeconds: 0,
        totalDurationSeconds: 0,
        isReplay: false,
        isPaywalled: true,
        paywallNotice: 'KPIG requires subscription',
      }),
    });

    const playPromise = audioEngine.play('kpig-1075', 7, 0, 0, 'california_in_seoul');
    await vi.runAllTimersAsync();
    await playPromise;

    const telemetry = audioEngine.getTelemetry();
    expect(telemetry.status).toBe('paywalled');
    expect(telemetry.message).toBe('KPIG requires subscription');
    expect(audioEngine.getIsPlaying()).toBe(false);
  });

  it('executes exponential backoff and sets error when max retries exceeded', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        stationId: 'kbs-891',
        audioUrl: 'https://example.com/fail.mp3',
        seekOffsetSeconds: 0,
        totalDurationSeconds: 3600,
      }),
    });

    await audioEngine.play('kbs-891', 8, 0, 0, 'seoul_in_usa');

    // Simulate media error trigger 1 -> retry 1 (1000ms)
    audioEngine.setTelemetry('stalled');
    (audioEngine as any).scheduleReconnect();
    expect(audioEngine.getTelemetry().status).toBe('reconnecting');
    expect(audioEngine.getTelemetry().retryAttempt).toBe(1);

    // Advance 1s -> retry 1 executes
    vi.advanceTimersByTime(1000);

    // Trigger retry 2 (2000ms)
    (audioEngine as any).scheduleReconnect();
    expect(audioEngine.getTelemetry().retryAttempt).toBe(2);
    vi.advanceTimersByTime(2000);

    // Trigger retry 3 (4000ms)
    (audioEngine as any).scheduleReconnect();
    expect(audioEngine.getTelemetry().retryAttempt).toBe(3);
    vi.advanceTimersByTime(4000);

    // Trigger retry 4 -> exceeds maxRetries (3) -> error
    (audioEngine as any).scheduleReconnect();
    expect(audioEngine.getTelemetry().status).toBe('error');
    expect(audioEngine.getTelemetry().message).toContain('Signal lost');
  });

  it('stops cleanly and resets telemetry to idle', () => {
    audioEngine.stop();
    const telemetry = audioEngine.getTelemetry();
    expect(telemetry.status).toBe('idle');
    expect(telemetry.retryAttempt).toBe(0);
    expect(audioEngine.getIsPlaying()).toBe(false);
  });

  it('ducks audio for video without causing network stall', () => {
    audioEngine.duckForVideo(true);
    expect(audioEngine.getIsDuckedForVideo()).toBe(true);

    audioEngine.duckForVideo(false);
    expect(audioEngine.getIsDuckedForVideo()).toBe(false);
  });

  it('adjusts volume and toggles mute properly', () => {
    audioEngine.setVolume(0.5);
    const muted = audioEngine.toggleMute();
    expect(muted).toBe(true);

    const unmuted = audioEngine.toggleMute();
    expect(unmuted).toBe(false);
  });

  it('manages Audio DSP effect modes and applies acoustic parameters', () => {
    // Default is clean
    expect(audioEngine.getAudioEffect()).toBe('clean');

    // Switch to Warm Tube
    audioEngine.setAudioEffect('tube');
    expect(audioEngine.getAudioEffect()).toBe('tube');

    // Switch to Tabletop Speaker
    audioEngine.setAudioEffect('tabletop');
    expect(audioEngine.getAudioEffect()).toBe('tabletop');

    // Switch to Vintage AM
    audioEngine.setAudioEffect('vintage_am');
    expect(audioEngine.getAudioEffect()).toBe('vintage_am');

    // Revert to Studio Hi-Fi Clean
    audioEngine.setAudioEffect('clean');
    expect(audioEngine.getAudioEffect()).toBe('clean');
  });
});
