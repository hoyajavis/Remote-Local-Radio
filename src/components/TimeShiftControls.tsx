import React from 'react';
import { Clock, Globe, Rewind, Sparkles, SlidersHorizontal, Sun, Moon, Coffee } from 'lucide-react';
import { POPULAR_TIMEZONES } from '../data/defaultStations';
import { useLanguage } from '../i18n/translations';

interface TimeShiftControlsProps {
  userTimezone: string;
  onTimezoneChange: (tz: string) => void;
  userLocalTimeStr: string;
  seoulLiveTimeStr: string;
  broadcastTimeStr: string;
  offsetHours: number;
  isLiveSync: boolean;
  onToggleLiveSync: (val: boolean) => void;
  scrubbedHour: number;
  onScrubHour: (hour: number) => void;
}

export const TimeShiftControls: React.FC<TimeShiftControlsProps> = ({
  userTimezone,
  onTimezoneChange,
  userLocalTimeStr,
  seoulLiveTimeStr,
  broadcastTimeStr,
  offsetHours,
  isLiveSync,
  onToggleLiveSync,
  scrubbedHour,
  onScrubHour,
}) => {
  const { language, t } = useLanguage();
  const currentHour = parseInt(broadcastTimeStr.split(':')[0], 10) || 0;

  const quickPresets = [
    { hour: 7, label: '07:00', tag: t.morningCommute, icon: Coffee },
    { hour: 12, label: '12:00', tag: t.noonLunch, icon: Sun },
    { hour: 18, label: '18:00', tag: t.eveningDrive, icon: SlidersHorizontal },
    { hour: 22, label: '22:00', tag: t.starryNight, icon: Moon },
  ];

  return (
    <div
      id="timeshift-controls-card"
      className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 md:p-6 shadow-xl flex flex-col gap-5"
    >
      {/* Header & Timezone Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-white tracking-tight font-sans">
              {t.timeShiftEngine}
            </h3>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            {t.timeShiftDesc}
          </p>
        </div>

        {/* Timezone Select */}
        <div className="flex items-center gap-2">
          <label htmlFor="timezone-select" className="text-xs font-mono text-neutral-400 whitespace-nowrap">
            {t.timezoneLabel}
          </label>
          <select
            id="timezone-select"
            value={userTimezone}
            onChange={(e) => onTimezoneChange(e.target.value)}
            className="bg-neutral-950 text-neutral-100 text-xs font-mono border border-neutral-700 rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            {POPULAR_TIMEZONES.map((tz) => (
              <option key={tz.id} value={tz.id}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Triple Synchronized Clocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Clock 1: User's Local Time */}
        <div
          id="user-local-clock"
          className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-3.5 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
            <span>{t.yourLocalTime}</span>
            <span className="text-sky-400 font-semibold">{t.listenerClock}</span>
          </div>
          <div className="text-2xl md:text-3xl font-mono font-black text-sky-400 py-1 tracking-tight">
            {userLocalTimeStr || '--:--:--'}
          </div>
          <span className="text-[11px] text-neutral-400 truncate">
            {userTimezone.replace('_', ' ')}
          </span>
        </div>

        {/* Clock 2: Shifted Broadcast Source */}
        <div
          id="broadcast-source-clock"
          className="bg-neutral-950/80 border border-amber-500/40 rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 bg-amber-500 text-black font-bold text-[10px] font-mono px-2 py-0.5 rounded-bl">
            {t.onAirNow}
          </div>
          <div className="flex items-center justify-between text-xs text-amber-300 font-mono">
            <span>{t.seoulBroadcastSlot}</span>
          </div>
          <div className="text-2xl md:text-3xl font-mono font-black text-amber-400 py-1 tracking-tight">
            {broadcastTimeStr || '--:--:--'}
            <span className="text-xs text-amber-400/70 font-normal ml-1.5">KST</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>
              {isLiveSync
                ? language === 'ko'
                  ? '청취자 현지 시각과 1:1 동기화됨'
                  : 'Matched 1:1 to Your Local Hour'
                : language === 'ko'
                  ? `수동 선택 시간대 (${scrubbedHour}:00)`
                  : `Custom Scrubbed Hour (${scrubbedHour}:00)`}
            </span>
          </div>
        </div>

        {/* Clock 3: Live Seoul Real-Time */}
        <div
          id="seoul-live-clock"
          className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-3.5 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
            <span>{t.liveSeoulTime}</span>
            <span className="text-neutral-400">REAL-TIME</span>
          </div>
          <div className="text-2xl md:text-3xl font-mono font-black text-neutral-300 py-1 tracking-tight">
            {seoulLiveTimeStr || '--:--:--'}
            <span className="text-xs text-neutral-400 font-normal ml-1.5">KST</span>
          </div>
          <div className="text-[11px] text-neutral-400 font-mono flex items-center justify-between">
            <span>{t.bufferDelay}:</span>
            <span className="text-amber-400 font-bold">-{offsetHours}h 00m</span>
          </div>
        </div>
      </div>

      {/* Mode Toggle: Live Synchronized vs Time Travel Scrubbing */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800">
        <div className="flex items-center gap-3">
          <button
            id="toggle-live-sync-btn"
            onClick={() => onToggleLiveSync(!isLiveSync)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isLiveSync
                ? 'bg-emerald-500 text-neutral-950 shadow-md'
                : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isLiveSync ? t.liveSyncButtonOn : t.liveSyncButtonOff}</span>
          </button>
          <span className="text-xs text-neutral-400 hidden sm:inline">
            {isLiveSync
              ? language === 'ko'
                ? '서울의 아침/점심/저녁 프로그램을 청취자의 현지 시계에 맞춰 자동으로 연결합니다.'
                : 'Automatically matches Seoul morning/lunch/evening shows to your local clock.'
              : language === 'ko'
                ? '수동 시간 이동 모드: 아래 타임라인에서 원하는 방송 시간대를 선택하세요.'
                : 'Manual timeline mode active: pick any broadcast time slot below.'}
          </span>
        </div>

        {/* Reset to Local Time button if scrubbed */}
        {!isLiveSync && (
          <button
            id="reset-to-live-btn"
            onClick={() => onToggleLiveSync(true)}
            className="text-xs font-mono text-amber-400 hover:underline flex items-center gap-1"
          >
            <Rewind className="w-3.5 h-3.5" />
            <span>{t.jumpLocalTime}</span>
          </button>
        )}
      </div>

      {/* 24-Hour Broadcast Timeline Scrubber */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
          <span className="flex items-center gap-1 text-neutral-300">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>{t.timelineHeader}</span>
          </span>
          <span>Target: <strong className="text-amber-400">{currentHour}:00 KST</strong></span>
        </div>

        {/* Timeline Slider */}
        <div className="relative py-2">
          <input
            id="broadcast-timeline-slider"
            type="range"
            min="0"
            max="23"
            step="1"
            value={currentHour}
            onChange={(e) => {
              onScrubHour(parseInt(e.target.value, 10));
              if (isLiveSync) onToggleLiveSync(false);
            }}
            className="w-full h-2.5 bg-neutral-950 rounded-lg appearance-none cursor-pointer accent-amber-500 border border-neutral-800"
          />

          {/* Time markers along the track */}
          <div className="flex justify-between text-[10px] font-mono text-neutral-400 pt-1 px-1">
            <span>00:00 ({language === 'ko' ? '자정' : 'Midnight'})</span>
            <span>06:00 ({language === 'ko' ? '새벽' : 'Dawn'})</span>
            <span>12:00 ({language === 'ko' ? '정오' : 'Noon'})</span>
            <span>18:00 ({language === 'ko' ? '일몰' : 'Sunset'})</span>
            <span>23:00 ({language === 'ko' ? '심야' : 'Late Night'})</span>
          </div>
        </div>

        {/* Quick Hour Presets */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {quickPresets.map((preset) => {
            const isSelected = currentHour === preset.hour;
            const Icon = preset.icon;
            return (
              <button
                key={preset.hour}
                id={`preset-hour-${preset.hour}`}
                onClick={() => {
                  onScrubHour(preset.hour);
                  if (isLiveSync) onToggleLiveSync(false);
                }}
                className={`p-2.5 rounded-lg border text-left flex items-start gap-2 transition-colors ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/60 text-white'
                    : 'bg-neutral-950/60 border-neutral-800/80 text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
                }`}
              >
                <Icon className={`w-4 h-4 mt-0.5 ${isSelected ? 'text-amber-400' : 'text-neutral-400'}`} />
                <div>
                  <div className="text-xs font-mono font-bold text-neutral-200">
                    {preset.label}
                  </div>
                  <div className="text-[11px] text-neutral-400 line-clamp-1">
                    {preset.tag}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
