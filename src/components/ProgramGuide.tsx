import React from 'react';
import { Calendar, Play, Radio, Volume2 } from 'lucide-react';
import { ScheduleSlot, RadioStation } from '../types/radio';
import { useLanguage } from '../i18n/translations';

interface ProgramGuideProps {
  schedule: ScheduleSlot[];
  stations: RadioStation[];
  currentBroadcastHour: number;
  userTimezone: string;
  offsetHours: number;
  onSelectSlot: (slot: ScheduleSlot) => void;
  currentPlayingSlotId?: string;
}

export const ProgramGuide: React.FC<ProgramGuideProps> = ({
  schedule,
  stations,
  currentBroadcastHour,
  userTimezone,
  offsetHours,
  onSelectSlot,
  currentPlayingSlotId,
}) => {
  const { language, t } = useLanguage();
  const getStation = (id: string) => stations.find((s) => s.id === id);

  return (
    <div
      id="program-guide-card"
      className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 md:p-6 shadow-xl flex flex-col gap-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-amber-400" />
          <div>
            <h4 className="text-base font-bold text-white tracking-tight">
              {t.epgTitle}
            </h4>
            <p className="text-xs text-neutral-400">
              {t.epgDesc}
            </p>
          </div>
        </div>
        <div className="text-xs font-mono text-neutral-400 bg-neutral-950 px-2.5 py-1 rounded-md border border-neutral-800">
          {language === 'ko' ? `총 ${schedule.length}개 편성 슬롯` : `Showing ${schedule.length} scheduled blocks`}
        </div>
      </div>

      {/* Guide List */}
      <div className="flex flex-col gap-2 max-h-[440px] overflow-y-auto pr-1">
        {schedule.map((slot) => {
          const station = getStation(slot.stationId);
          const isCurrentTime =
            currentBroadcastHour >= slot.startHour &&
            currentBroadcastHour < slot.startHour + Math.ceil(slot.durationMinutes / 60);
          const isPlaying = currentPlayingSlotId === slot.id;

          // Compute user local time for this 1-hour slot
          const localHour = ((slot.startHour - offsetHours) % 24 + 24) % 24;
          const nextLocalHour = (localHour + 1) % 24;
          const nextKstHour = (slot.startHour + 1) % 24;
          const localTimeFormatted = `${String(localHour).padStart(2, '0')}:00 - ${String(nextLocalHour).padStart(2, '0')}:00`;
          const kstTimeFormatted = `${String(slot.startHour).padStart(2, '0')}:00 - ${String(nextKstHour).padStart(2, '0')}:00`;

          return (
            <div
              key={slot.id}
              id={`epg-slot-${slot.id}`}
              onClick={() => onSelectSlot(slot)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                isPlaying || isCurrentTime
                  ? 'bg-amber-500/10 border-amber-500/50 shadow-md'
                  : 'bg-neutral-950/60 border-neutral-800/80 hover:bg-neutral-800/40'
              }`}
            >
              {/* Left: Time and Station Badges */}
              <div className="flex items-center gap-3 min-w-[200px]">
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-1 font-mono">
                    <span className="text-sm font-bold text-sky-400">
                      {localTimeFormatted}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {language === 'ko' ? '현지시각' : 'LOCAL'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 font-mono text-[11px] text-neutral-400">
                    <span>{kstTimeFormatted}</span>
                    <span className="text-amber-500/80">KST</span>
                  </div>
                </div>

                {station && (
                  <span
                    className="px-2 py-1 rounded text-[11px] font-mono font-medium text-white shadow-sm flex items-center gap-1"
                    style={{ backgroundColor: station.color }}
                  >
                    <Radio className="w-3 h-3" />
                    {station.frequency}
                  </span>
                )}
              </div>

              {/* Middle: Show & Host Info */}
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center gap-2">
                  <h5 className="text-sm font-semibold text-neutral-100">
                    {language === 'ko' ? slot.showTitleKo : slot.showTitle}
                  </h5>
                  {isCurrentTime && (
                    <span className="px-1.5 py-0.2 bg-red-500/20 text-red-400 border border-red-500/40 rounded text-[10px] font-mono font-bold animate-pulse">
                      {t.nowAiringBadge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-400">
                  {language === 'ko' ? slot.showTitle : slot.showTitleKo} • DJ: {language === 'ko' ? slot.djNameKo : slot.djName}
                </p>
                <div className="text-[11px] text-neutral-400 line-clamp-1">
                  {slot.description}
                </div>
              </div>

              {/* Right: Genre & Action */}
              <div className="flex items-center gap-2 self-end md:self-center">
                <span className="text-[11px] font-mono text-neutral-400 hidden lg:inline">
                  {slot.genre}
                </span>
                <button
                  id={`tune-slot-btn-${slot.id}`}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                    isPlaying
                      ? 'bg-amber-500 text-black font-bold'
                      : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                  }`}
                >
                  {isPlaying ? <Volume2 className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlaying ? t.playingBadge : t.tuneInBtn}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
