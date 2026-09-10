import React from 'react';
import { Play, Pause, Volume2, VolumeX, Bell, Music, Radio } from 'lucide-react';
import { RadioStation, ScheduleSlot } from '../types/radio';
import { audioEngine } from '../services/audioEngine';
import { AudioVisualizer } from './AudioVisualizer';
import { useLanguage } from '../i18n/translations';

interface RadioTunerProps {
  stations: RadioStation[];
  currentStation: RadioStation;
  onSelectStation: (station: RadioStation) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  volume: number;
  onVolumeChange: (val: number) => void;
  currentSlot: ScheduleSlot | null;
  broadcastTimeStr: string;
}

export const RadioTuner: React.FC<RadioTunerProps> = ({
  stations,
  currentStation,
  onSelectStation,
  isPlaying,
  onTogglePlay,
  volume,
  onVolumeChange,
  currentSlot,
  broadcastTimeStr,
}) => {
  const { language, t } = useLanguage();
  const [isMuted, setIsMuted] = React.useState(false);

  const handleMuteToggle = () => {
    const muted = audioEngine.toggleMute();
    setIsMuted(muted);
  };

  const handlePlayJingle = () => {
    audioEngine.playJingle(currentStation.id);
  };

  const handlePlayTimeCheck = () => {
    const hour = parseInt(broadcastTimeStr.split(':')[0], 10) || 7;
    audioEngine.playTimeSignal(hour);
  };

  // FM frequency bounds
  const minFreq = 88.0;
  const maxFreq = 108.0;
  const freqPercent = Math.min(100, Math.max(0, ((currentStation.mhz - minFreq) / (maxFreq - minFreq)) * 100));

  return (
    <div
      id="radio-tuner-card"
      className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 md:p-6 shadow-2xl flex flex-col gap-5 relative overflow-hidden"
    >
      {/* Top Station Branding & Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-bold font-mono text-white shadow-inner"
            style={{ backgroundColor: currentStation.color }}
          >
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white font-sans">
                {language === 'ko' ? currentStation.nameKo || currentStation.name : currentStation.name}
              </h2>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-neutral-800 text-amber-400 border border-neutral-700 font-mono">
                {currentStation.frequency}
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-medium">
              {language === 'ko' ? currentStation.taglineKo : currentStation.tagline} • {currentStation.network}
            </p>
          </div>
        </div>

        {/* Live On-Air Badge */}
        <div className="flex items-center gap-2">
          <span
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border ${
              isPlaying
                ? 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse'
                : 'bg-neutral-800 text-neutral-400 border-neutral-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-red-500' : 'bg-neutral-500'}`}
            />
            {isPlaying ? t.onAir : t.standby}
          </span>
          <span className="text-xs font-mono text-neutral-400 bg-neutral-950 px-2 py-1 rounded border border-neutral-800">
            KST {broadcastTimeStr}
          </span>
        </div>
      </div>

      {/* Retro LCD Receiver Display */}
      <div
        id="tuner-lcd-display"
        className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between"
      >
        <div className="flex-1 w-full space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
            <span>{t.currentBroadcast}</span>
            <span className="text-amber-500 font-bold">{currentStation.genre}</span>
          </div>
          <h3 className="text-lg md:text-xl font-semibold text-neutral-100 tracking-tight">
            {currentSlot
              ? language === 'ko'
                ? currentSlot.showTitleKo
                : currentSlot.showTitle
              : language === 'ko'
                ? '대한민국 서울 FM 라디오 릴레이'
                : 'South Korea FM Radio Relay'}
          </h3>
          <p className="text-sm text-neutral-400">
            {currentSlot
              ? language === 'ko'
                ? currentSlot.showTitle
                : currentSlot.showTitleKo
              : language === 'ko'
                ? '버퍼링된 방송 스트림에 연결 중...'
                : 'Connecting to buffered broadcast stream...'}
          </p>
          {currentSlot && (
            <div className="flex items-center gap-2 pt-1 text-xs text-neutral-400">
              <span className="text-neutral-300 font-medium">
                DJ: {language === 'ko' ? currentSlot.djNameKo : currentSlot.djName}
              </span>
              <span>•</span>
              <span className="line-clamp-1">{currentSlot.description}</span>
            </div>
          )}
        </div>

        {/* Big LED Frequency Readout */}
        <div className="flex flex-col items-center md:items-end justify-center px-4 py-2 bg-neutral-900/60 rounded-lg border border-neutral-800 min-w-[140px]">
          <span className="text-[10px] font-mono tracking-widest text-neutral-400">{t.tunerFreq}</span>
          <div className="text-3xl font-black font-mono tracking-tight text-amber-400 flex items-baseline gap-1">
            {currentStation.mhz.toFixed(1)}
            <span className="text-xs font-normal text-neutral-400">MHz</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400">{t.stereoFmHighQ}</span>
        </div>
      </div>

      {/* Analog Frequency Dial Needle */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs font-mono text-neutral-400 px-1">
          <span>88 MHz</span>
          <span className="text-neutral-500 font-semibold tracking-wider">{t.fmTuningDial}</span>
          <span>108 MHz</span>
        </div>

        <div className="relative w-full h-12 bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden flex items-center px-2 shadow-inner">
          {/* Frequency tick marks */}
          <div className="absolute inset-0 flex justify-between px-3 items-center pointer-events-none opacity-40">
            {Array.from({ length: 21 }).map((_, i) => (
              <div
                key={i}
                className={`w-px bg-neutral-400 ${i % 5 === 0 ? 'h-6 bg-amber-400' : 'h-3'}`}
              />
            ))}
          </div>

          {/* Station Markers on Dial */}
          {stations.map((s) => {
            const leftPct = ((s.mhz - minFreq) / (maxFreq - minFreq)) * 100;
            const isSelected = s.id === currentStation.id;
            return (
              <button
                key={s.id}
                id={`station-dial-pin-${s.id}`}
                onClick={() => onSelectStation(s)}
                style={{ left: `${leftPct}%` }}
                className={`absolute -translate-x-1/2 top-1 text-[10px] font-mono px-1 rounded transition-all z-10 ${
                  isSelected
                    ? 'bg-amber-500 text-black font-bold shadow'
                    : 'text-neutral-400 hover:text-white bg-neutral-900/80'
                }`}
                title={`${s.name} (${s.frequency})`}
              >
                {s.mhz}
              </button>
            );
          })}

          {/* Glowing Red Tuning Needle */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-red-500 shadow-[0_0_10px_#ef4444] transition-all duration-300 pointer-events-none z-20"
            style={{ left: `${freqPercent}%` }}
          >
            <div className="w-3 h-2 bg-red-600 rounded-b -translate-x-1 shadow" />
          </div>
        </div>
      </div>

      {/* Station Quick Preset Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <span className="text-xs font-mono text-neutral-400 whitespace-nowrap pl-1">{t.presets}:</span>
        {stations.map((station) => {
          const isCurrent = station.id === currentStation.id;
          return (
            <button
              key={station.id}
              id={`preset-btn-${station.id}`}
              onClick={() => onSelectStation(station)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 border ${
                isCurrent
                  ? 'bg-neutral-800 text-amber-400 border-amber-500/50 shadow-sm'
                  : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:bg-neutral-800/60'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: station.color }}
              />
              {station.frequency} {station.network}
            </button>
          );
        })}
      </div>

      {/* Visualizer & Playback Controls Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center pt-2">
        {/* Visualizer */}
        <div className="md:col-span-5">
          <AudioVisualizer isPlaying={isPlaying} color={currentStation.color} />
        </div>

        {/* Master Play / Pause & Volume Controls */}
        <div className="md:col-span-7 flex flex-wrap items-center justify-between gap-3 bg-neutral-950/70 p-3 rounded-xl border border-neutral-800">
          {/* Big Play/Pause Button */}
          <button
            id="tuner-play-pause-btn"
            onClick={onTogglePlay}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-lg ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-black font-bold'
                : 'bg-white hover:bg-neutral-200 text-neutral-950'
            }`}
            title={isPlaying ? t.pauseBroadcast : t.startBroadcast}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-0.5" />
            )}
          </button>

          {/* Volume Control */}
          <div className="flex items-center gap-2 flex-1 min-w-[120px]">
            <button
              id="tuner-mute-btn"
              onClick={handleMuteToggle}
              className="text-neutral-400 hover:text-white transition-colors p-1"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              id="tuner-volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Sound FX: Jingle & Korean Hourly Time Signal */}
          <div className="flex items-center gap-1.5">
            <button
              id="tuner-jingle-btn"
              onClick={handlePlayJingle}
              className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
              title="Play Station ID Jingle"
            >
              <Music className="w-3.5 h-3.5 text-sky-400" />
              <span>{t.jingleBtn}</span>
            </button>
            <button
              id="tuner-timecheck-btn"
              onClick={handlePlayTimeCheck}
              className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
              title="Play Korean Hourly Time Signal (시보 음)"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.pipsBtn}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
