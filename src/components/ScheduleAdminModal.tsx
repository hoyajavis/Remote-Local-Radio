import React, { useState, useEffect } from 'react';
import {
  X,
  RotateCcw,
  Save,
  Radio,
  Volume2,
  Check,
  Clock,
  Wand2,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { ScheduleSlot, RadioStation } from '../types/radio';
import { audioEngine } from '../services/audioEngine';
import { useLanguage } from '../i18n/translations';

interface ScheduleAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: ScheduleSlot[];
  stations: RadioStation[];
  onSaveSchedule: (newSchedule: ScheduleSlot[]) => Promise<void>;
  onResetSchedule: () => Promise<void>;
}

export const ScheduleAdminModal: React.FC<ScheduleAdminModalProps> = ({
  isOpen,
  onClose,
  schedule,
  stations,
  onSaveSchedule,
  onResetSchedule,
}) => {
  const { language, t } = useLanguage();

  // Ensure we have a complete 24-hour array of 1-hour intervals (0 to 23)
  const buildFull24HourSchedule = (inputSchedule: ScheduleSlot[]): ScheduleSlot[] => {
    const hoursMap = new Map<number, ScheduleSlot>();
    for (const slot of inputSchedule) {
      hoursMap.set(slot.startHour, slot);
    }

    const full24: ScheduleSlot[] = [];
    for (let h = 0; h < 24; h++) {
      if (hoursMap.has(h)) {
        const existing = hoursMap.get(h)!;
        full24.push({
          ...existing,
          startHour: h,
          startMinute: 0,
          durationMinutes: 60, // Enforce 1-hour interval
        });
      } else {
        // Fallback 1-hour slot
        full24.push({
          id: `slot-${String(h).padStart(2, '0')}-${String((h + 1) % 24).padStart(2, '0')}`,
          startHour: h,
          startMinute: 0,
          durationMinutes: 60,
          stationId: 'mbc-919',
          showTitle: `Seoul Broadcast Hour ${h}:00`,
          showTitleKo: `서울 FM 정규 방송 (${String(h).padStart(2, '0')}:00)`,
          djName: 'Seoul Radio Host',
          djNameKo: '진행자',
          genre: 'Music & Talk',
          description: `1-Hour broadcast segment from ${String(h).padStart(2, '0')}:00 to ${String((h + 1) % 24).padStart(2, '0')}:00 KST`,
          isLiveBuffered: true,
        });
      }
    }
    return full24.sort((a, b) => a.startHour - b.startHour);
  };

  const [localSchedule, setLocalSchedule] = useState<ScheduleSlot[]>(() =>
    buildFull24HourSchedule(schedule)
  );
  const [selectedHour, setSelectedHour] = useState<number>(7);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'all' | 'morning' | 'afternoon' | 'evening' | 'night'>('all');

  // Batch Range Tool State
  const [batchStartHour, setBatchStartHour] = useState<number>(7);
  const [batchEndHour, setBatchEndHour] = useState<number>(9);
  const [batchStationId, setBatchStationId] = useState<string>('mbc-919');
  const [batchAppliedMsg, setBatchAppliedMsg] = useState<string | null>(null);

  // Sync state when schedule prop changes
  useEffect(() => {
    setLocalSchedule(buildFull24HourSchedule(schedule));
  }, [schedule]);

  if (!isOpen) return null;

  const handleFieldChange = (hour: number, field: keyof ScheduleSlot, val: any) => {
    setLocalSchedule((prev) =>
      prev.map((s) => (s.startHour === hour ? { ...s, [field]: val } : s))
    );
  };

  const handleStationChange = (hour: number, newStationId: string) => {
    const station = stations.find((s) => s.id === newStationId);
    setLocalSchedule((prev) =>
      prev.map((s) => {
        if (s.startHour === hour) {
          return {
            ...s,
            stationId: newStationId,
            genre: station?.genre || s.genre,
          };
        }
        return s;
      })
    );
  };

  // Batch apply station to range of 1-hour slots
  const handleApplyBatchRange = () => {
    const start = Math.min(batchStartHour, batchEndHour);
    const end = Math.max(batchStartHour, batchEndHour);
    const targetStation = stations.find((s) => s.id === batchStationId);

    setLocalSchedule((prev) =>
      prev.map((s) => {
        if (s.startHour >= start && s.startHour <= end) {
          return {
            ...s,
            stationId: batchStationId,
            genre: targetStation?.genre || s.genre,
          };
        }
        return s;
      })
    );

    const msg =
      language === 'ko'
        ? `${end - start + 1}개 1시간 슬롯(${String(start).padStart(2, '0')}:00 - ${String(end + 1).padStart(2, '0')}:00)을 ${targetStation?.frequency} (${targetStation?.nameKo || targetStation?.name}) 채널로 일괄 변경했습니다.`
        : `Updated ${end - start + 1} one-hour slots (${String(start).padStart(2, '0')}:00 - ${String(end + 1).padStart(2, '0')}:00) to ${targetStation?.frequency} ${targetStation?.name}`;
    setBatchAppliedMsg(msg);
    setTimeout(() => setBatchAppliedMsg(null), 3500);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveSchedule(localSchedule);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      console.error('Failed to save schedule:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    const confirmMsg =
      language === 'ko'
        ? '모든 24개 1시간 슬롯을 대한민국 표준 방송 편성표로 복원하시겠습니까?'
        : 'Reset all 24 one-hour intervals to South Korean default broadcaster lineup?';
    if (window.confirm(confirmMsg)) {
      await onResetSchedule();
    }
  };

  const handlePreviewSlotAudio = (stationId: string, hour: number) => {
    audioEngine.tuneTo(stationId, hour);
  };

  // Filter slots
  const filteredSlots = localSchedule.filter((s) => {
    if (timeFilter === 'morning') return s.startHour >= 6 && s.startHour < 12;
    if (timeFilter === 'afternoon') return s.startHour >= 12 && s.startHour < 18;
    if (timeFilter === 'evening') return s.startHour >= 18 && s.startHour < 22;
    if (timeFilter === 'night') return s.startHour >= 22 || s.startHour < 6;
    return true;
  });

  const selectedSlot = localSchedule.find((s) => s.startHour === selectedHour) || localSchedule[0];

  return (
    <div
      id="schedule-admin-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5 overflow-y-auto"
    >
      <div
        id="schedule-admin-modal-content"
        className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {t.adminTitle}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-800 text-amber-400 border border-neutral-700">
                  {t.adminSlotsCount}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                {t.adminSubtitle}
              </p>
            </div>
          </div>

          <button
            id="admin-modal-close-btn"
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 24-Hour Visual Interval Grid */}
        <div className="bg-neutral-950/90 border-b border-neutral-800 p-3 sm:p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
            <span className="flex items-center gap-1.5 text-neutral-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'ko' ? '24시간 방송 그리드 (1시간 단위)' : '24-HOUR BROADCAST GRID (1-HR SLOTS)'}</span>
            </span>
            <span className="text-neutral-400 text-[11px]">
              {t.inspectNotice}
            </span>
          </div>

          {/* 24 Hourly Buttons Grid */}
          <div className="grid grid-cols-6 sm:grid-cols-12 md:grid-cols-24 gap-1">
            {localSchedule.map((slot) => {
              const station = stations.find((s) => s.id === slot.stationId);
              const isSelected = slot.startHour === selectedHour;
              const hourFormatted = `${String(slot.startHour).padStart(2, '0')}:00`;

              return (
                <button
                  key={slot.startHour}
                  id={`grid-hour-btn-${slot.startHour}`}
                  onClick={() => setSelectedHour(slot.startHour)}
                  className={`flex flex-col items-center justify-center p-1.5 rounded-lg border transition-all text-center ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/20 shadow-md ring-1 ring-amber-400'
                      : 'border-neutral-800/80 bg-neutral-900/60 hover:bg-neutral-800 hover:border-neutral-700'
                  }`}
                  title={`${hourFormatted} - ${String((slot.startHour + 1) % 24).padStart(2, '0')}:00 KST: ${slot.showTitleKo} (${station?.frequency || ''})`}
                >
                  <span className="text-[10px] font-mono font-bold text-neutral-200">
                    {String(slot.startHour).padStart(2, '0')}h
                  </span>
                  <span
                    className="w-2.5 h-2.5 rounded-full my-0.5"
                    style={{ backgroundColor: station?.color || '#0284c7' }}
                  />
                  <span className="text-[8px] font-mono text-neutral-400 truncate w-full">
                    {station?.mhz ? `${station.mhz}` : 'FM'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Body with 2 Columns: Selected Hour Quick Editor + 24-Hour Table */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-5">
          {/* Quick Inspector & Editor for the Selected 1-Hour Slot */}
          <div
            id="selected-slot-inspector"
            className="bg-neutral-950 border border-amber-500/30 rounded-xl p-4 shadow-md space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-amber-500 text-black font-mono font-bold text-xs">
                  {String(selectedSlot.startHour).padStart(2, '0')}:00 - {String((selectedSlot.startHour + 1) % 24).padStart(2, '0')}:00 KST
                </span>
                <span className="text-xs text-neutral-400 font-mono">
                  ({t.selectedInterval})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePreviewSlotAudio(selectedSlot.stationId, selectedSlot.startHour)}
                  className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-sky-400 rounded text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{t.previewAudio}</span>
                </button>
              </div>
            </div>

            {/* Editable Fields for this 1-hour interval */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1 font-mono">
                  {t.relaySourceStation}
                </label>
                <select
                  value={selectedSlot.stationId}
                  onChange={(e) => handleStationChange(selectedSlot.startHour, e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-white font-medium focus:border-amber-500"
                >
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.frequency} - {language === 'ko' ? s.nameKo || s.name : s.name} ({s.network})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-mono">
                  {t.showTitleKo}
                </label>
                <input
                  type="text"
                  value={selectedSlot.showTitleKo}
                  onChange={(e) => handleFieldChange(selectedSlot.startHour, 'showTitleKo', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-white focus:border-amber-500"
                  placeholder="예: 굿모닝FM 테이입니다"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-mono">
                  {t.showTitleEn}
                </label>
                <input
                  type="text"
                  value={selectedSlot.showTitle}
                  onChange={(e) => handleFieldChange(selectedSlot.startHour, 'showTitle', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-white focus:border-amber-500"
                  placeholder="e.g. Good Morning FM Tei"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-mono">
                  {t.djName}
                </label>
                <input
                  type="text"
                  value={selectedSlot.djNameKo}
                  onChange={(e) => handleFieldChange(selectedSlot.startHour, 'djNameKo', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-white focus:border-amber-500"
                  placeholder="DJ 이름"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1 font-mono">
                  {t.genreLabel}
                </label>
                <input
                  type="text"
                  value={selectedSlot.genre}
                  onChange={(e) => handleFieldChange(selectedSlot.startHour, 'genre', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-neutral-300 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-neutral-400 mb-1 font-mono">
                  {t.descLabel}
                </label>
                <input
                  type="text"
                  value={selectedSlot.description}
                  onChange={(e) => handleFieldChange(selectedSlot.startHour, 'description', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-neutral-300 focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Batch Range Tool: Fill Multiple 1-Hour Intervals at Once */}
          <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
              <Wand2 className="w-4 h-4" />
              <span className="font-bold">{t.quickRangeTitle}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-neutral-400">{t.fromHour}</span>
              <select
                value={batchStartHour}
                onChange={(e) => setBatchStartHour(parseInt(e.target.value, 10))}
                className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white font-mono"
              >
                {Array.from({ length: 24 }).map((_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}:00
                  </option>
                ))}
              </select>

              <span className="text-neutral-400">{t.toHour}</span>
              <select
                value={batchEndHour}
                onChange={(e) => setBatchEndHour(parseInt(e.target.value, 10))}
                className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white font-mono"
              >
                {Array.from({ length: 24 }).map((_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}:00
                  </option>
                ))}
              </select>

              <span className="text-neutral-400">{t.assignStation}</span>
              <select
                value={batchStationId}
                onChange={(e) => setBatchStationId(e.target.value)}
                className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-white font-mono"
              >
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.frequency} - {language === 'ko' ? s.nameKo || s.name : s.name}
                  </option>
                ))}
              </select>

              <button
                id="batch-apply-btn"
                onClick={handleApplyBatchRange}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded text-xs transition-colors"
              >
                {t.applyRangeBtn}
              </button>
            </div>

            {batchAppliedMsg && (
              <div className="text-xs text-emerald-400 font-mono flex items-center gap-1.5 pt-1">
                <Check className="w-3.5 h-3.5" />
                <span>{batchAppliedMsg}</span>
              </div>
            )}
          </div>

          {/* Time Filter Tabs & Table Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1 text-xs">
              <span className="text-neutral-400 font-mono mr-1">
                {language === 'ko' ? '필터:' : 'FILTER:'}
              </span>
              {(['all', 'morning', 'afternoon', 'evening', 'night'] as const).map((filter) => {
                const labelMap: Record<string, string> = {
                  all: t.filterAll,
                  morning: t.filterMorning,
                  afternoon: t.filterAfternoon,
                  evening: t.filterEvening,
                  night: t.filterNight,
                };
                return (
                  <button
                    key={filter}
                    onClick={() => setTimeFilter(filter)}
                    className={`px-2.5 py-1 rounded-lg font-mono text-xs transition-colors ${
                      timeFilter === filter
                        ? 'bg-neutral-800 text-amber-400 font-bold border border-neutral-700'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {labelMap[filter]}
                  </button>
                );
              })}
            </div>

            <div className="text-xs font-mono text-neutral-400">
              {language === 'ko'
                ? `24개 1시간 슬롯 중 ${filteredSlots.length}개 표시`
                : `Showing ${filteredSlots.length} of 24 one-hour intervals`}
            </div>
          </div>

          {/* All 24 1-Hour Intervals Table */}
          <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-neutral-950 text-neutral-400 font-mono border-b border-neutral-800">
                <tr>
                  <th className="p-3 w-36">{language === 'ko' ? '1시간 슬롯' : '1-Hour Slot'}</th>
                  <th className="p-3 w-48">{language === 'ko' ? '중계 소스' : 'Relay Source'}</th>
                  <th className="p-3">{language === 'ko' ? '프로그램명' : 'Program Title'}</th>
                  <th className="p-3 w-32">{language === 'ko' ? '진행자 (DJ)' : 'DJ / Host'}</th>
                  <th className="p-3 text-right w-24">{language === 'ko' ? '동작' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 font-sans">
                {filteredSlots.map((slot) => {
                  const station = stations.find((s) => s.id === slot.stationId);
                  const isSelected = slot.startHour === selectedHour;
                  const timeLabel = `${String(slot.startHour).padStart(2, '0')}:00 - ${String((slot.startHour + 1) % 24).padStart(2, '0')}:00`;

                  return (
                    <tr
                      key={slot.startHour}
                      onClick={() => setSelectedHour(slot.startHour)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-amber-500/10'
                          : 'hover:bg-neutral-900/60'
                      }`}
                    >
                      {/* 1-Hour Interval Label */}
                      <td className="p-3 font-mono font-bold text-neutral-200">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${isSelected ? 'bg-amber-400' : 'bg-neutral-600'}`}
                          />
                          <span>{timeLabel}</span>
                        </div>
                        <span className="text-[10px] text-neutral-400 font-normal pl-3.5">
                          {language === 'ko' ? '1시간 (60분)' : '1 hr (60 min)'}
                        </span>
                      </td>

                      {/* Station Selector per 1-Hour Slot */}
                      <td className="p-3">
                        <select
                          value={slot.stationId}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleStationChange(slot.startHour, e.target.value)}
                          className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white font-medium focus:border-amber-500"
                        >
                          {stations.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.frequency} {s.network}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Show Titles */}
                      <td className="p-3">
                        <div className="font-semibold text-neutral-100">
                          {slot.showTitleKo}
                        </div>
                        <div className="text-[11px] text-neutral-400 line-clamp-1">
                          {slot.showTitle}
                        </div>
                      </td>

                      {/* DJ */}
                      <td className="p-3 text-neutral-300 font-medium">
                        {slot.djNameKo}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviewSlotAudio(slot.stationId, slot.startHour);
                            }}
                            className="p-1.5 text-neutral-400 hover:text-sky-400 rounded hover:bg-neutral-800 transition-colors"
                            title={t.previewAudio}
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-neutral-600" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex flex-wrap justify-between items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              id="admin-reset-default-btn"
              onClick={handleReset}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs flex items-center gap-1.5 transition-colors border border-neutral-700"
            >
              <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
              <span>{t.resetDefaultBtn}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="admin-modal-done-btn"
              onClick={onClose}
              className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-medium"
            >
              {t.cancelBtn}
            </button>

            <button
              id="admin-save-schedule-btn"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>{t.savedSuccess}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? t.savingBtn : t.saveScheduleBtn}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

