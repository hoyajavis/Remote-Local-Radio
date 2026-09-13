import React, { ReactElement } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RadioChassis } from '@/src/components/RadioChassis';
import { LanguageProvider } from '@/src/i18n/translations';
import { RadioStation } from '@/src/types/radio';

const mockStation: RadioStation = {
  id: 'mbc-919',
  name: 'MBC FM4U',
  frequency: '91.9 FM',
  city: 'Seoul, South Korea',
  genre: 'K-Pop',
  tagline: 'Music & Morning Rush',
  hasVisibleRadio: true,
  youtubeVideoId: 'test_video_id',
} as any as RadioStation;

const renderWithProvider = (ui: ReactElement) => {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
};

describe('RadioChassis Component', () => {
  const defaultProps = {
    station: mockStation,
    isPlaying: false,
    onTogglePlay: vi.fn(),
    volume: 0.85,
    onVolumeChange: vi.fn(),
    isMuted: false,
    onToggleMute: vi.fn(),
    isLiveSync: true,
    activeBand: 'seoul_in_usa' as const,
  };

  it('renders station name, frequency, and callsign', () => {
    renderWithProvider(<RadioChassis {...defaultProps} />);

    expect(screen.getAllByText('MBC FM4U').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/91\.9/)).toBeInTheDocument();
    expect(screen.getByText(/Seoul, South Korea/i)).toBeInTheDocument();
  });

  it('triggers onTogglePlay when power/play button is clicked', () => {
    const onTogglePlay = vi.fn();
    renderWithProvider(<RadioChassis {...defaultProps} onTogglePlay={onTogglePlay} />);

    const playBtn = screen.getByTitle(/Main Power \(전원\)/i);
    fireEvent.click(playBtn);
    expect(onTogglePlay).toHaveBeenCalledTimes(1);
  });

  it('does not render volume, fullscreen, band, or chime buttons on the control strip', () => {
    renderWithProvider(<RadioChassis {...defaultProps} />);

    expect(screen.queryByTitle('Volume Up')).toBeNull();
    expect(screen.queryByTitle('Volume Down')).toBeNull();
    expect(screen.queryByTitle(/Fullscreen/i)).toBeNull();
    expect(screen.queryByTitle(/Switch Band/i)).toBeNull();
    expect(screen.queryByTitle(/Play Top-of-Hour Chime/i)).toBeNull();
  });

  it('triggers onSelectStation when a preset button is clicked', () => {
    const onSelectStation = vi.fn();
    renderWithProvider(
      <RadioChassis
        {...defaultProps}
        stations={[mockStation]}
        onSelectStation={onSelectStation}
      />
    );

    const presetBtn = screen.getByTitle(/\[1\] 91.9 FM/i);
    fireEvent.click(presetBtn);
    expect(onSelectStation).toHaveBeenCalledWith(mockStation);
  });

  it('triggers onSeekPrev and onSeekNext when SEEK rocker buttons are clicked', () => {
    const onSeekPrev = vi.fn();
    const onSeekNext = vi.fn();
    renderWithProvider(
      <RadioChassis
        {...defaultProps}
        onSeekPrev={onSeekPrev}
        onSeekNext={onSeekNext}
      />
    );

    const prevBtn = screen.getByRole('button', { name: /이전 방송 탐색|Seek Previous/i });
    const nextBtn = screen.getByRole('button', { name: /다음 방송 탐색|Seek Next/i });

    fireEvent.click(prevBtn);
    expect(onSeekPrev).toHaveBeenCalledTimes(1);

    fireEvent.click(nextBtn);
    expect(onSeekNext).toHaveBeenCalledTimes(1);
  });

  it('triggers onSavePreset and shows banner when a preset button is long-pressed for >= 800ms', async () => {
    vi.useFakeTimers();
    const onSavePreset = vi.fn();
    const onSelectStation = vi.fn();

    renderWithProvider(
      <RadioChassis
        {...defaultProps}
        stations={[mockStation]}
        onSelectStation={onSelectStation}
        onSavePreset={onSavePreset}
      />
    );

    const presetBtn = screen.getByTitle(/\[1\] 91.9 FM/i);

    // Simulate pointerdown (press and hold)
    fireEvent.pointerDown(presetBtn, { button: 0 });

    // Advance timers past 800ms threshold
    await vi.advanceTimersByTimeAsync(850);

    expect(onSavePreset).toHaveBeenCalledWith(0);
    expect(screen.getByTestId('preset-saved-banner')).toBeInTheDocument();

    // Release pointer
    fireEvent.pointerUp(presetBtn);

    // onSelectStation should not be called because it was a long-press save
    expect(onSelectStation).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('displays static STATUS label and idle LED when idle', () => {
    renderWithProvider(
      <RadioChassis
        {...defaultProps}
        telemetry={{
          status: 'idle',
          retryAttempt: 0,
          maxRetries: 3,
          lastUpdated: Date.now(),
        }}
      />
    );

    expect(screen.getByText('STATUS')).toBeInTheDocument();
    const led = screen.getByTestId('status-led');
    expect(led).toHaveAttribute('data-status', 'idle');
    expect(led).toHaveAttribute('data-color', 'grey');
    expect(led).toHaveAttribute('data-pattern', 'off');
    expect(led).toHaveAttribute('data-action', 'none');
  });

  it('displays tuning LED with amber slow pulse (wait) when tuning', () => {
    renderWithProvider(
      <RadioChassis
        {...defaultProps}
        telemetry={{
          status: 'tuning',
          retryAttempt: 0,
          maxRetries: 3,
          lastUpdated: Date.now(),
        }}
      />
    );

    expect(screen.getByText('STATUS')).toBeInTheDocument();
    const led = screen.getByTestId('status-led');
    expect(led).toHaveAttribute('data-status', 'tuning');
    expect(led).toHaveAttribute('data-color', 'amber');
    expect(led).toHaveAttribute('data-pattern', 'pulse-slow');
    expect(led).toHaveAttribute('data-action', 'wait');
  });

  it('displays playing LED with solid green (normal) when playing', () => {
    renderWithProvider(
      <RadioChassis
        {...defaultProps}
        isPlaying={true}
        telemetry={{
          status: 'playing',
          retryAttempt: 0,
          maxRetries: 3,
          lastUpdated: Date.now(),
        }}
      />
    );

    expect(screen.getByText('STATUS')).toBeInTheDocument();
    const led = screen.getByTestId('status-led');
    expect(led).toHaveAttribute('data-status', 'playing');
    expect(led).toHaveAttribute('data-color', 'green');
    expect(led).toHaveAttribute('data-pattern', 'solid');
    expect(led).toHaveAttribute('data-action', 'normal');
  });

  it('displays RECONNECTING badge with amber fast blink (wait) when reconnecting', () => {
    renderWithProvider(
      <RadioChassis
        {...defaultProps}
        isPlaying={true}
        telemetry={{
          status: 'reconnecting',
          retryAttempt: 2,
          maxRetries: 3,
          message: 'Reconnecting (2/3)...',
          messageKo: '신호 재연결 시도 (2/3)...',
          lastUpdated: Date.now(),
        }}
      />
    );

    const led = screen.getByTestId('status-led');
    expect(led).toHaveAttribute('data-status', 'reconnecting');
    expect(led).toHaveAttribute('data-color', 'amber');
    expect(led).toHaveAttribute('data-pattern', 'blink-fast');
    expect(led).toHaveAttribute('data-action', 'wait');
    expect(screen.getAllByText(/Reconnecting \(2\/3\)|신호 재연결 시도/i).length).toBeGreaterThanOrEqual(1);
  });

  it('displays SIGNAL LOST badge with red fast blink (action required) on fatal error', () => {
    renderWithProvider(
      <RadioChassis
        {...defaultProps}
        telemetry={{
          status: 'error',
          retryAttempt: 3,
          maxRetries: 3,
          message: 'Signal lost. Reconnect failed.',
          messageKo: '신호 끊김. 재연결 실패',
          lastUpdated: Date.now(),
        }}
      />
    );

    const led = screen.getByTestId('status-led');
    expect(led).toHaveAttribute('data-status', 'error');
    expect(led).toHaveAttribute('data-color', 'red');
    expect(led).toHaveAttribute('data-pattern', 'blink-fast');
    expect(led).toHaveAttribute('data-action', 'action');
    expect(screen.getAllByText(/Signal lost|신호 끊김/i).length).toBeGreaterThanOrEqual(1);
  });

  it('displays paywalled LED badge with solid red (move on) for paywalled station', () => {
    const paywalledStation: RadioStation = {
      ...mockStation,
      id: 'kpig-1075',
      name: 'KPIG 107.5',
      isPaywalled: true,
      paywallNotice: 'Broadcaster requires official paid subscription',
    };

    renderWithProvider(
      <RadioChassis
        {...defaultProps}
        station={paywalledStation}
        telemetry={{
          status: 'paywalled',
          retryAttempt: 0,
          maxRetries: 3,
          lastUpdated: Date.now(),
        }}
      />
    );

    const led = screen.getByTestId('status-led');
    expect(led).toHaveAttribute('data-status', 'paywalled');
    expect(led).toHaveAttribute('data-color', 'red');
    expect(led).toHaveAttribute('data-pattern', 'solid');
    expect(led).toHaveAttribute('data-action', 'move_on');
    expect(screen.getAllByText(/PAYWALLED|유료 구독 채널/i).length).toBeGreaterThanOrEqual(1);
  });

  it('never displays Korean DJ name on US stations when currentSlot belongs to a different station', () => {
    const usStation: RadioStation = {
      ...mockStation,
      id: 'kdfc-899',
      name: 'KDFC 89.9',
      nameKo: 'KDFC 89.9',
      network: 'Classical California',
      genre: 'Classical',
      band: 'california_in_seoul',
    };

    // Mismatched slot from Korean schedule (Kim Shin-young on MBC)
    const koreanSlot = {
      id: 'slot-12-14',
      stationId: 'mbc-919',
      showTitle: "Hope Song at Noon",
      showTitleKo: "정오의 희망곡 김신영입니다",
      djName: 'Kim Shin-young',
      djNameKo: '김신영',
      startHour: 12,
      startMinute: 0,
      durationMinutes: 120,
      genre: 'Variety',
      description: 'Korean midday talk',
    };

    renderWithProvider(
      <RadioChassis
        {...defaultProps}
        station={usStation}
        activeBand="california_in_seoul"
        currentSlot={koreanSlot}
      />
    );

    expect(screen.queryByText(/Kim Shin-young/i)).toBeNull();
    expect(screen.queryByText(/김신영/i)).toBeNull();
  });

  it('omits the presenter badge for stations with generic placeholder staff', () => {
    const kwavStation: RadioStation = {
      ...mockStation,
      id: 'kwav-969',
      name: 'KWAV 96.9',
      network: 'Stephens Media',
      genre: 'Pop',
      tagline: 'Monterey Pop Hits',
    };

    renderWithProvider(
      <RadioChassis
        {...defaultProps}
        station={kwavStation}
        activeBand="california_in_seoul"
        resolvedStream={{
          stationId: 'kwav-969',
          stationName: 'KWAV 96.9',
          showTitle: 'Overnight Pop',
          showTitleKo: '심야 팝',
          djName: 'KWAV Music Staff',
          broadcastHour: 2,
          tier: 'live_direct',
          tierLabel: 'Live',
          audioUrl: 'https://ice9.securenetsystems.net/KWAV',
          seekOffsetSeconds: 0,
          totalDurationSeconds: 3600,
          isReplay: false,
        } as any}
      />
    );

    // "KWAV Music Staff" should be omitted entirely, showing show title with clean line 3
    expect(screen.queryByText(/Music Staff/i)).toBeNull();
    expect(screen.queryByText(/DJ/i)).toBeNull();
    expect(screen.getAllByText('Overnight Pop').length).toBeGreaterThan(0);
  });

  it('displays Host: for US talk station with an individual named host', () => {
    const kqedStation: RadioStation = {
      ...mockStation,
      id: 'kqei-893',
      name: 'KQEI 89.3',
      network: 'KQED/NPR',
      genre: 'NPR News, Public Affairs',
      tagline: 'KQED Public Radio',
    };

    renderWithProvider(
      <RadioChassis
        {...defaultProps}
        station={kqedStation}
        activeBand="california_in_seoul"
        resolvedStream={{
          stationId: 'kqei-893',
          stationName: 'KQEI 89.3',
          showTitle: 'KQED Forum with Alexis Madrigal',
          showTitleKo: '포럼 알렉시스 마드리갈',
          djName: 'Alexis Madrigal',
          broadcastHour: 10,
          tier: 'tier1_rss',
          tierLabel: 'AOD',
          audioUrl: 'https://test.mp3',
          seekOffsetSeconds: 0,
          totalDurationSeconds: 3600,
          isReplay: false,
        } as any}
      />
    );

    expect(screen.getAllByText('Host: Alexis Madrigal').length).toBeGreaterThan(0);
  });

  it('renders CAM button on the monitor bezel and toggles studio cam when clicked', () => {
    renderWithProvider(
      <RadioChassis
        {...defaultProps}
        station={mockStation}
        resolvedStream={{
          stationId: 'mbc-919',
          stationName: 'MBC FM4U',
          showTitle: '굿모닝FM 테이입니다',
          youtubeVideoId: 'test_video_id',
        } as any}
      />
    );

    const camBtn = screen.getByRole('button', { name: /보이는 라디오 영상 전환|Toggle Visible Radio Studio Cam/i });
    expect(camBtn).toBeInTheDocument();
    expect(camBtn).not.toBeDisabled();

    // Click CAM to toggle video player
    fireEvent.click(camBtn);

    // When active, YouTube iframe should be rendered
    const iframe = screen.getByTitle('굿모닝FM 테이입니다');
    expect(iframe).toBeInTheDocument();
  });

  it('disables CAM button when station does not support visible radio (audio-only)', () => {
    const audioOnlyStation: RadioStation = {
      ...mockStation,
      id: 'tbs-951',
      hasVisibleRadio: false,
      youtubeVideoId: undefined,
    };

    renderWithProvider(<RadioChassis {...defaultProps} station={audioOnlyStation} />);

    const camBtn = screen.getByRole('button', { name: /보이는 라디오 영상 전환|Toggle Visible Radio Studio Cam/i });
    expect(camBtn).toBeDisabled();
  });

  it('styles power button with depressed inset and warm glow when playing, raised when off, with no red dot', () => {
    const { rerender } = renderWithProvider(<RadioChassis {...defaultProps} isPlaying={false} />);

    const powerBtn = screen.getByTitle(/Main Power \(전원\)/i);
    expect(powerBtn).toBeInTheDocument();
    // In off state, should be raised (translate-y-0) and not have red dot
    expect(powerBtn.className).toContain('translate-y-0');
    expect(powerBtn.innerHTML).not.toContain('bg-red-500');

    // When playing is true, should be depressed (translate-y-[1.5px]) and warm amber
    rerender(
      <LanguageProvider>
        <RadioChassis {...defaultProps} isPlaying={true} />
      </LanguageProvider>
    );

    expect(powerBtn.className).toContain('translate-y-[1.5px]');
    expect(powerBtn.className).toContain('text-amber-400');
    expect(powerBtn.innerHTML).not.toContain('bg-red-500');
    expect(powerBtn.innerHTML).not.toContain('bg-emerald-400');
  });

  it('renders era-matched analog OSD telemetry when CAM mode is active in VFD mode', () => {
    renderWithProvider(
      <RadioChassis
        {...defaultProps}
        audioDisplayMode="vfd"
        resolvedStream={{
          stationId: mockStation.id,
          showTitleKo: '굿모닝FM 테이입니다',
          showTitle: 'Good Morning FM Tei',
          youtubeVideoId: 'test_video_id',
          isLiveVideoStream: false,
          tier: 'tier1_rss',
          resolvedUrl: 'http://example.com/stream.mp3',
        } as any}
      />
    );

    const camBtn = screen.getByRole('button', { name: /보이는 라디오 영상 전환|Toggle Visible Radio Studio Cam/i });
    fireEvent.click(camBtn);

    // Analog CRT OSD badge and telemetry should be present
    expect(screen.getByText(/CAM 1 • CH 91.9 FM/i)).toBeInTheDocument();
    expect(screen.getByText(/NTSC 480i/i)).toBeInTheDocument();
    expect(screen.getByText(/STEREO/i)).toBeInTheDocument();
  });

  it('renders modern digital receiver OSD telemetry when CAM mode is active in Color TFT mode', () => {
    renderWithProvider(
      <RadioChassis
        {...defaultProps}
        audioDisplayMode="lcd"
        resolvedStream={{
          stationId: mockStation.id,
          showTitleKo: '굿모닝FM 테이입니다',
          showTitle: 'Good Morning FM Tei',
          youtubeVideoId: 'test_video_id',
          isLiveVideoStream: false,
          tier: 'tier1_rss',
          resolvedUrl: 'http://example.com/stream.mp3',
        } as any}
      />
    );

    const camBtn = screen.getByRole('button', { name: /보이는 라디오 영상 전환|Toggle Visible Radio Studio Cam/i });
    fireEvent.click(camBtn);

    // Digital Color TFT OSD telemetry should be present
    expect(screen.getByText(/1080p60/i)).toBeInTheDocument();
    expect(screen.getByText(/SYNC \+0.0ms/i)).toBeInTheDocument();
  });

  it('renders LCD Matrix display physics by default in Audio Mode', () => {
    renderWithProvider(
      <RadioChassis
        {...defaultProps}
        audioDisplayMode="lcd"
      />
    );

    const screenEl = screen.getByTestId('audio-display-screen');
    expect(screenEl).toHaveAttribute('data-display-mode', 'lcd');
    expect(screenEl.className).toContain('from-[#0a1215]');
  });

  it('renders authentic VFD Vacuum Tube physics when audioDisplayMode is vfd', () => {
    renderWithProvider(
      <RadioChassis
        {...defaultProps}
        audioDisplayMode="vfd"
      />
    );

    const screenEl = screen.getByTestId('audio-display-screen');
    expect(screenEl).toHaveAttribute('data-display-mode', 'vfd');
    expect(screenEl.className).toContain('from-[#020507]');
  });
});

