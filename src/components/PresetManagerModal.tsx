import React from 'react';
import { Radio, RotateCcw, Check, X, SlidersHorizontal, Music } from 'lucide-react';
import { RadioStation, BandMode } from '../types/radio';
import { useLanguage } from '../i18n/translations';

interface PresetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeBand: BandMode;
  availableStations: RadioStation[];
  presetStationIds: string[];
  onUpdatePreset: (presetIndex: number, stationId: string) => void;
  onResetPresets: () => void;
}

export const PresetManagerModal: React.FC<PresetManagerModalProps> = ({
  isOpen,
  onClose,
  activeBand,
  availableStations,
  presetStationIds,
  onUpdatePreset,
  onResetPresets
}) => {
  const { language } = useLanguage();

  if (!isOpen) return null;

  const isSeoul = activeBand === 'seoul_in_usa';

  return (
    <div
      id="preset-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if ((e.target as HTMLElement).id === 'preset-modal-backdrop') {
          onClose();
        }
      }}
    >
      <div className="bg-stone-900 border border-stone-700 rounded-3xl w-full max-w-2xl p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <Radio className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{language === 'ko' ? '라디오 프리셋 메모리 설정' : 'Radio Preset Channel Memory'}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-400 border border-stone-700">
                  {isSeoul ? '🇰🇷 서울 FM' : '🇺🇸 CALIFORNIA'}
                </span>
              </h3>
              <p className="text-[11px] text-stone-400 mt-0.5">
                {language === 'ko'
                  ? '코스텔 본체 1~6번 버튼 및 블루투스 다이얼에 할당할 방송국을 선택하세요.'
                  : 'Assign your favorite stations to hardware buttons 1-6 and Bluetooth dials.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className="w-7 h-7 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset Slots (1 to 6) */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 py-1">
          {Array.from({ length: 6 }).map((_, index) => {
            const presetNumber = index + 1;
            const currentStationId = presetStationIds[index];
            const currentStation = availableStations.find(s => s.id === currentStationId) || availableStations[0];

            return (
              <div
                key={presetNumber}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl bg-stone-950/80 border border-stone-800 hover:border-stone-700 transition-all gap-2 sm:gap-3"
              >
                {/* Left: Button Number & Current Selection */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex flex-col items-center justify-center w-8 h-10 rounded-lg bg-gradient-to-b from-stone-800 to-stone-900 border border-stone-700 shadow-inner flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mb-0.5 shadow-[0_0_4px_rgba(245,158,11,0.8)]" />
                    <span className="font-mono text-xs font-black text-amber-400">{presetNumber}</span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-bold text-white tracking-wider flex-shrink-0"
                        style={{ backgroundColor: currentStation?.color || '#0284c7' }}
                      >
                        {currentStation?.frequency}
                      </span>
                      <span className="font-bold text-sm text-stone-100 truncate">
                        {isSeoul ? (currentStation?.nameKo || currentStation?.name) : currentStation?.name}
                      </span>
                      {currentStation?.isPaywalled && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-700/60 flex items-center gap-0.5 flex-shrink-0">
                          🔒 Paywalled
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-400 truncate mt-0.5">
                      {isSeoul ? (currentStation?.taglineKo || currentStation?.tagline) : currentStation?.tagline}
                    </p>
                  </div>
                </div>

                {/* Right: Station Selector Dropdown */}
                <div className="sm:w-60 flex-shrink-0">
                  <select
                    value={currentStationId || ''}
                    onChange={(e) => onUpdatePreset(index, e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs font-semibold text-stone-200 focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
                  >
                    {availableStations.map(station => (
                      <option key={station.id} value={station.id}>
                        {station.frequency} - {isSeoul ? (station.nameKo || station.name) : station.name} {station.isPaywalled ? '🔒 [Paywalled]' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer: Reset & Done */}
        <div className="flex items-center justify-between border-t border-stone-800 pt-3 flex-shrink-0">
          <button
            onClick={onResetPresets}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-stone-400 hover:text-amber-400 hover:bg-stone-800/60 transition-colors font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{language === 'ko' ? '기본 프리셋으로 초기화' : 'Reset to Defaults'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors shadow-sm"
          >
            {language === 'ko' ? '설정 완료' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
