import React, { useState, useEffect, useCallback } from 'react';
import { Clock, HelpCircle } from 'lucide-react';
import { RadioStation, BandMode } from './types/radio';
import { fetchStations } from './services/api';
import { audioEngine, ResolvedStreamInfo, PlaybackTelemetry, AudioEffectMode } from './services/audioEngine';
import { BandSelector } from './components/BandSelector';
import { RadioChassis, AudioDisplayMode } from './components/RadioChassis';
import { useLanguage } from './i18n/translations';
import { getStationsForBand } from './data/defaultStations';
import { useTimeShiftClock } from './hooks/useTimeShiftClock';
import { useRadioPresets } from './hooks/useRadioPresets';
import { useWakeLock } from './hooks/useWakeLock';

export default function App() {
  const { language, t, setLanguage } = useLanguage();

  // Active Band: 'seoul_in_usa' (Seoul radio in America) or 'california_in_seoul' (CA radio in Korea)
  const [activeBand, setActiveBand] = useState<BandMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('timeshift_band') as BandMode;
      if (saved === 'seoul_in_usa' || saved === 'california_in_seoul') return saved;
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        if (tz.includes('America/')) return 'seoul_in_usa';
        if (tz.includes('Seoul') || tz.includes('Asia/Tokyo')) return 'california_in_seoul';
      } catch {}
    }
    return 'seoul_in_usa';
  });

  // Station states
  const [bandStations, setBandStations] = useState<RadioStation[]>(() => getStationsForBand(activeBand));
  const [currentStation, setCurrentStation] = useState<RadioStation>(() => getStationsForBand(activeBand)[0]);

  // Playback & Stream State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('timeshift_volume');
      if (saved) return parseFloat(saved);
    }
    return 0.85;
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [resolvedStream, setResolvedStream] = useState<ResolvedStreamInfo | null>(null);
  const [telemetry, setTelemetry] = useState<PlaybackTelemetry>(() => audioEngine.getTelemetry());

  // Help modal state
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  // Audio Display Mode: 'lcd' | 'vfd'
  const [audioDisplayMode, setAudioDisplayMode] = useState<AudioDisplayMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('timeshift_audio_display') as AudioDisplayMode;
      if (saved === 'lcd' || saved === 'vfd') {
        return saved;
      }
    }
    return 'lcd';
  });

  const handleSelectAudioDisplay = (mode: AudioDisplayMode) => {
    setAudioDisplayMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('timeshift_audio_display', mode);
    }
  };

  // Audio DSP Effect Mode: 'clean' | 'tube' | 'tabletop' | 'vintage_am'
  const [audioEffectMode, setAudioEffectMode] = useState<AudioEffectMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('timeshift_audio_effect') as AudioEffectMode;
      if (saved === 'clean' || saved === 'tube' || saved === 'tabletop' || saved === 'vintage_am') {
        return saved;
      }
    }
    return 'clean';
  });

  const handleSelectAudioEffect = (mode: AudioEffectMode) => {
    setAudioEffectMode(mode);
    audioEngine.setAudioEffect(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('timeshift_audio_effect', mode);
    }
  };

  // Synchronize audio effect to audioEngine
  useEffect(() => {
    audioEngine.setAudioEffect(audioEffectMode);
  }, [audioEffectMode]);

  // Custom Hardware Presets Hook
  const {
    activePresetIds,
    presetStations,
    handleUpdatePreset,
    handleResetPresets,
  } = useRadioPresets({ activeBand, bandStations });

  // Time-Shift Clock & Synchronization Hook
  const {
    isLiveSync,
    timeShiftData,
    getTargetTime,
  } = useTimeShiftClock({
    activeBand,
    isPlaying,
    currentStationId: currentStation.id,
  });

  // Countertop iPad Screen Wake Lock Hook
  useWakeLock(isPlaying);

  // Close Help modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowHelpModal(false);
      }
    };
    if (showHelpModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHelpModal]);

  // Subscribe to real-time audio stream resolver info & playback telemetry
  useEffect(() => {
    const unsubStream = audioEngine.subscribeStreamInfo((info) => {
      setResolvedStream(info);
      if (info?.isPaywalled) {
        setIsPlaying(false);
      }
    });
    const unsubTelemetry = audioEngine.subscribeTelemetry((t) => {
      setTelemetry(t);
    });
    return () => {
      unsubStream();
      unsubTelemetry();
    };
  }, []);

  // Load initial station directory from backend
  useEffect(() => {
    async function loadData() {
      try {
        const loadedStations = await fetchStations(activeBand).catch(() => getStationsForBand(activeBand));

        const currentBandStations = (loadedStations && loadedStations.length > 0)
          ? loadedStations.filter((s) => s.band === activeBand)
          : getStationsForBand(activeBand);
        const sortedBandStations = [...currentBandStations].sort((a, b) => a.mhz - b.mhz);
        setBandStations(sortedBandStations);
        const defaultId = activeBand === 'seoul_in_usa' ? 'mbc-919' : 'kqei-893';
        const initialStation = sortedBandStations.find((s) => s.id === defaultId) || sortedBandStations[0];
        setCurrentStation(initialStation);
        const { hour, minute, second } = getTargetTime();
        audioEngine.prefetchStreamInfo(initialStation.id, hour, minute, second, activeBand);
      } catch (err) {
        console.warn('Fallback to local defaults:', err);
      }
    }
    loadData();
  }, []);

  // Band switching handler (UI language is independent of band selection)
  const handleSelectBand = (newBand: BandMode) => {
    setActiveBand(newBand);
    if (typeof window !== 'undefined') {
      localStorage.setItem('timeshift_band', newBand);
    }

    const newStations = getStationsForBand(newBand);
    setBandStations(newStations);
    const defaultId = newBand === 'seoul_in_usa' ? 'mbc-919' : 'kqei-893';
    const newStation = newStations.find((s) => s.id === defaultId) || newStations[0];
    setCurrentStation(newStation);

    const { hour, minute, second } = getTargetTime();
    audioEngine.tuneTo(newStation.id, hour, minute, second, newBand);
  };

  // MediaSession API two-way synchronization (Lock Screen / Bluetooth controls)
  useEffect(() => {
    audioEngine.setMediaSessionCallbacks({
      onPlay: async () => {
        const { hour, minute, second } = getTargetTime();
        await audioEngine.play(currentStation.id, hour, minute, second, activeBand);
        setIsPlaying(true);
      },
      onPause: () => {
        audioEngine.stop();
        setIsPlaying(false);
      },
      onNextPreset: () => {
        const list = bandStations
          .filter((s) => s.band === activeBand)
          .sort((a, b) => a.mhz - b.mhz);
        if (list.length === 0) return;
        const currentIdx = list.findIndex((s) => s.id === currentStation.id);
        const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % list.length;
        const nextStation = list[nextIdx];
        setCurrentStation(nextStation);
        const { hour, minute, second } = getTargetTime();
        audioEngine.tuneTo(nextStation.id, hour, minute, second, activeBand);
        setIsPlaying(true);
      },
      onPreviousPreset: () => {
        const list = bandStations
          .filter((s) => s.band === activeBand)
          .sort((a, b) => a.mhz - b.mhz);
        if (list.length === 0) return;
        const currentIdx = list.findIndex((s) => s.id === currentStation.id);
        const prevIdx = currentIdx === -1 ? list.length - 1 : (currentIdx - 1 + list.length) % list.length;
        const prevStation = list[prevIdx];
        setCurrentStation(prevStation);
        const { hour, minute, second } = getTargetTime();
        audioEngine.tuneTo(prevStation.id, hour, minute, second, activeBand);
        setIsPlaying(true);
      }
    });
  }, [currentStation.id, activeBand, bandStations, getTargetTime]);

  // Play / Pause toggle
  const handleTogglePlay = async () => {
    if (currentStation.isPaywalled) {
      setIsPlaying(false);
      return;
    }
    if (isPlaying) {
      audioEngine.stop();
      setIsPlaying(false);
    } else {
      const { hour, minute, second } = getTargetTime();
      await audioEngine.play(currentStation.id, hour, minute, second, activeBand);
      setIsPlaying(true);
    }
  };

  // Station preset select handler
  const handleSelectStation = (station: RadioStation) => {
    setCurrentStation(station);
    const { hour, minute, second } = getTargetTime();
    audioEngine.tuneTo(station.id, hour, minute, second, activeBand);
  };

  // Car Stereo Seek: Previous / Next Station in numerical frequency order
  const handleSeekPrev = useCallback(() => {
    const list = bandStations
      .filter((s) => s.band === activeBand)
      .sort((a, b) => a.mhz - b.mhz);
    if (list.length === 0) return;
    const currentIdx = list.findIndex((s) => s.id === currentStation.id);
    const prevIdx = currentIdx === -1 ? list.length - 1 : (currentIdx - 1 + list.length) % list.length;
    const prevStation = list[prevIdx];
    setCurrentStation(prevStation);
    const { hour, minute, second } = getTargetTime();
    audioEngine.tuneTo(prevStation.id, hour, minute, second, activeBand);
  }, [bandStations, currentStation.id, activeBand, getTargetTime]);

  const handleSeekNext = useCallback(() => {
    const list = bandStations
      .filter((s) => s.band === activeBand)
      .sort((a, b) => a.mhz - b.mhz);
    if (list.length === 0) return;
    const currentIdx = list.findIndex((s) => s.id === currentStation.id);
    const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % list.length;
    const nextStation = list[nextIdx];
    setCurrentStation(nextStation);
    const { hour, minute, second } = getTargetTime();
    audioEngine.tuneTo(nextStation.id, hour, minute, second, activeBand);
  }, [bandStations, currentStation.id, activeBand, getTargetTime]);

  // Volume & Mute handlers
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    audioEngine.setVolume(newVol);
    if (typeof window !== 'undefined') {
      localStorage.setItem('timeshift_volume', newVol.toString());
    }
  };

  const handleToggleMute = () => {
    const muted = audioEngine.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col selection:bg-amber-500 selection:text-stone-950 font-sans">
      {/* 1. Top Physical Band Selector Bar */}
      <BandSelector
        activeBand={activeBand}
        onSelectBand={handleSelectBand}
      />

      {/* 2. Main Console Chassis: Costel Under-Cabinet Kitchen System */}
      <main className="flex-1 flex flex-col justify-center items-center py-2 sm:py-4">
        <RadioChassis
          station={currentStation}
          stations={presetStations}
          onSelectStation={handleSelectStation}
          currentSlot={timeShiftData.currentSlot}
          resolvedStream={resolvedStream}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          volume={volume}
          onVolumeChange={handleVolumeChange}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onPlayTimeSignal={() =>
            audioEngine.playTimeSignal(
              parseInt(timeShiftData.broadcastTimeStr?.split(':')[0] || '7', 10),
              currentStation.id
            )
          }
          onPlayJingle={() => audioEngine.playJingle(currentStation.id)}
          isLiveSync={isLiveSync}
          activeBand={activeBand}
          onToggleBand={() =>
            handleSelectBand(activeBand === 'seoul_in_usa' ? 'california_in_seoul' : 'seoul_in_usa')
          }
          userLocalTimeStr={timeShiftData.userLocalTimeStr}
          broadcastTimeStr={timeShiftData.broadcastTimeStr}
          onSeekPrev={handleSeekPrev}
          onSeekNext={handleSeekNext}
          onSavePreset={(idx) => handleUpdatePreset(idx, currentStation.id)}
          audioDisplayMode={audioDisplayMode}
          telemetry={telemetry}
        />
      </main>

      {/* How It Works Help Modal */}
      {showHelpModal && (
        <div
          id="help-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowHelpModal(false);
          }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-stone-900 border border-stone-700 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  {t.helpTitle}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {/* Language Switcher inside Help Modal */}
                <div className="flex items-center bg-stone-950/80 border border-stone-800 p-0.5 rounded-lg text-[11px] font-mono">
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer font-bold ${
                      language === 'en'
                        ? 'bg-amber-400 text-stone-950 shadow-sm'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('ko')}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer font-bold ${
                      language === 'ko'
                        ? 'bg-amber-400 text-stone-950 shadow-sm'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    한국어
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHelpModal(false)}
                  className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="text-xs text-stone-300 space-y-3 leading-relaxed">
              <p>{t.helpP1}</p>
              <p className="font-semibold text-stone-200">{t.helpP2}</p>
              <div className="space-y-2 pt-1">
                {[t.helpBullet1, t.helpBullet2, t.helpBullet3, t.helpBullet4, t.helpBullet5].map((bullet, idx) => {
                  const colonIndex = bullet.indexOf(':');
                  const title = colonIndex !== -1 ? bullet.slice(0, colonIndex).trim() : bullet;
                  const desc = colonIndex !== -1 ? bullet.slice(colonIndex + 1).trim() : '';
                  return (
                    <div key={idx} className="p-2.5 rounded-xl bg-stone-950/70 border border-stone-800/80 text-stone-300">
                      <p className="font-bold text-amber-400 mb-0.5">{title}:</p>
                      {desc && <p className="text-stone-400 leading-normal">{desc}</p>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-stone-950 font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md"
              >
                {t.helpCloseBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appliance Footer with Emulation Lab Dual Switchers */}
      <footer className="border-t border-stone-900 bg-stone-950 py-3 px-3 sm:px-4 text-xs text-stone-500 font-mono">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-3">
          <span className="font-semibold text-stone-400 tracking-wide">{t.footerTitle}</span>

          {/* Emulation Lab: Dual Switchers for Audio Display & CAM Video */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {/* 1. Audio Display Switcher (LCD Matrix vs VFD Tube) */}
            <div className="flex items-center gap-1 bg-stone-900/90 border border-stone-800 p-1 rounded-lg text-[10.5px]">
              <span className="text-emerald-400 font-bold tracking-tight text-[10px] px-1 hidden sm:inline shrink-0">
                {t.audioDisplayTitle}:
              </span>
              {(
                [
                  { id: 'lcd', label: t.displayModeLcd },
                  { id: 'vfd', label: t.displayModeVfd },
                ] as const
              ).map((mode) => {
                const isActive = audioDisplayMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => handleSelectAudioDisplay(mode.id)}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer font-bold text-[10px] select-none ${
                      isActive
                        ? mode.id === 'vfd'
                          ? 'bg-[#2dd4bf] text-stone-950 shadow-[0_0_8px_rgba(45,212,191,0.6)] translate-y-[0.5px]'
                          : 'bg-emerald-400 text-stone-950 shadow-[0_0_8px_rgba(52,211,153,0.6)] translate-y-[0.5px]'
                        : 'bg-stone-800/80 text-stone-400 hover:text-stone-200 hover:bg-stone-700 active:scale-95'
                    }`}
                    title={`Audio Display Engine: ${mode.label}`}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>

            {/* 2. Audio DSP Switcher (Studio Hi-Fi, Warm Tube, Tabletop, Vintage AM) */}
            <div className="flex flex-wrap items-center justify-center gap-1 bg-stone-900/90 border border-stone-800 p-1 rounded-lg text-[10.5px]">
              <span className="text-cyan-400 font-bold tracking-tight text-[10px] px-1 hidden sm:inline shrink-0">
                {t.audioEffectTitle}:
              </span>
              {(
                [
                  { id: 'clean', label: t.audioEffectClean },
                  { id: 'tube', label: t.audioEffectTube },
                  { id: 'tabletop', label: t.audioEffectTabletop },
                  { id: 'vintage_am', label: t.audioEffectVintageAm },
                ] as const
              ).map((mode) => {
                const isActive = audioEffectMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => handleSelectAudioEffect(mode.id)}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer font-bold text-[10px] select-none ${
                      isActive
                        ? 'bg-cyan-400 text-stone-950 shadow-[0_0_6px_rgba(34,211,238,0.5)] translate-y-[0.5px]'
                        : 'bg-stone-800/80 text-stone-400 hover:text-stone-200 hover:bg-stone-700 active:scale-95'
                    }`}
                    title={`Audio DSP Acoustic Profile: ${mode.label}`}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-900 hover:bg-stone-800 active:scale-95 text-stone-300 hover:text-amber-400 border border-stone-800 shadow-sm transition-all cursor-pointer font-sans text-xs"
              title={t.howItWorksBtn}
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-medium">{t.howItWorksBtn}</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
