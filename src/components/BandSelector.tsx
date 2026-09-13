import React from 'react';
import { BandMode } from '../types/radio';

interface BandSelectorProps {
  activeBand: BandMode;
  onSelectBand: (band: BandMode) => void;
}

export const BandSelector: React.FC<BandSelectorProps> = ({
  activeBand,
  onSelectBand,
}) => {

  return (
    <div className="w-full bg-gradient-to-b from-[#181411] via-[#221c17] to-[#120f0d] border-b-2 border-stone-800 text-stone-200 px-2 sm:px-4 py-2 sm:py-2.5 select-none">
      <div className="max-w-4xl mx-auto flex flex-row items-center justify-center sm:justify-start gap-2 sm:gap-3">
        {/* Hardware Band Selector Mechanical Well */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-[#090807] p-1 rounded-xl border border-stone-800 shadow-[inset_0_2px_6px_rgba(0,0,0,0.9),0_1px_0_rgba(255,255,255,0.06)] relative">
          {/* Band 1: Seoul in USA */}
          <button
            type="button"
            onClick={() => onSelectBand('seoul_in_usa')}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all duration-150 cursor-pointer touch-manipulation ${
              activeBand === 'seoul_in_usa'
                ? 'translate-y-[0.5px] bg-gradient-to-b from-[#1d4ed8] via-[#1e40af] to-[#172554] text-white border-t border-sky-300/40 border-b border-blue-950 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6),0_0_12px_rgba(37,99,235,0.3)] font-bold'
                : 'translate-y-0 bg-gradient-to-b from-stone-900 via-[#181513] to-stone-950 text-stone-400 hover:text-stone-200 border-t border-stone-700/40 border-b border-stone-950 shadow-[0_2px_4px_rgba(0,0,0,0.4)] hover:bg-stone-800/80 active:translate-y-[0.5px]'
            }`}
          >
            <span className="text-xs sm:text-sm">🇰🇷</span>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="tracking-wide drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                  Seoul in USA
                </span>
                {activeBand === 'seoul_in_usa' ? (
                  <span className="w-2 h-2 rounded-full p-[1px] bg-stone-950 border border-blue-400/60 flex items-center justify-center shadow-inner">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-300 shadow-[0_0_6px_rgba(125,211,252,1)] animate-pulse" />
                  </span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-stone-950 border border-stone-800 shadow-inner" />
                )}
              </div>
              <span className="text-[9px] text-blue-200/80 hidden sm:inline-block leading-tight font-mono">
                Korean Radio in America
              </span>
            </div>
          </button>

          {/* Central Mechanical Ridge / Pivot Line */}
          <div className="w-[1.5px] h-6 sm:h-7 bg-stone-800/90 shadow-[1px_0_0_rgba(255,255,255,0.08),inset_1px_0_0_rgba(0,0,0,0.5)] rounded-full shrink-0" />

          {/* Band 2: California in Korea */}
          <button
            type="button"
            onClick={() => onSelectBand('california_in_seoul')}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all duration-150 cursor-pointer touch-manipulation ${
              activeBand === 'california_in_seoul'
                ? 'translate-y-[0.5px] bg-gradient-to-b from-[#d97706] via-[#b45309] to-[#78350f] text-white border-t border-amber-300/40 border-b border-amber-950 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6),0_0_12px_rgba(217,119,6,0.3)] font-bold'
                : 'translate-y-0 bg-gradient-to-b from-stone-900 via-[#181513] to-stone-950 text-stone-400 hover:text-stone-200 border-t border-stone-700/40 border-b border-stone-950 shadow-[0_2px_4px_rgba(0,0,0,0.4)] hover:bg-stone-800/80 active:translate-y-[0.5px]'
            }`}
          >
            <span className="text-xs sm:text-sm">🇺🇸</span>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="tracking-wide drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                  CA in Korea
                </span>
                {activeBand === 'california_in_seoul' ? (
                  <span className="w-2 h-2 rounded-full p-[1px] bg-stone-950 border border-amber-400/60 flex items-center justify-center shadow-inner">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,1)] animate-pulse" />
                  </span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-stone-950 border border-stone-800 shadow-inner" />
                )}
              </div>
              <span className="text-[9px] text-amber-200/80 hidden sm:inline-block leading-tight font-mono">
                Monterey Radio in Seoul
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
