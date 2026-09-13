import { useState, useMemo } from 'react';
import { RadioStation, BandMode } from '../types/radio';

export const DEFAULT_SEOUL_PRESETS = ['mbc-919', 'sbs-1077', 'kbs-891', 'kbs-931', 'cbs-939', 'afn-885'];
export const DEFAULT_CA_PRESETS = ['kazu-903', 'kwav-969', 'kdon-1025', 'kqei-893', 'ksqd-907', 'kdfc-899'];

interface UseRadioPresetsOptions {
  activeBand: BandMode;
  bandStations: RadioStation[];
}

export function useRadioPresets({ activeBand, bandStations }: UseRadioPresetsOptions) {
  // Custom Preset Channel Assignments (Presets 1-6)
  const [seoulPresets, setSeoulPresets] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('timeshift_presets_seoul');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === 6) return parsed;
        }
      } catch {}
    }
    return DEFAULT_SEOUL_PRESETS;
  });

  const [californiaPresets, setCaliforniaPresets] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('timeshift_presets_california');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === 6 && !parsed.includes('tbs-1013')) return parsed;
        }
      } catch {}
    }
    return DEFAULT_CA_PRESETS;
  });

  const activePresetIds = activeBand === 'seoul_in_usa' ? seoulPresets : californiaPresets;

  const presetStations = useMemo(() => {
    const list = activePresetIds
      .map((id) => bandStations.find((s) => s.id === id))
      .filter((s): s is RadioStation => s !== undefined);
    return list.length > 0 ? list : bandStations.slice(0, 6);
  }, [activePresetIds, bandStations]);

  const handleUpdatePreset = (index: number, stationId: string) => {
    if (activeBand === 'seoul_in_usa') {
      const updated = [...seoulPresets];
      updated[index] = stationId;
      setSeoulPresets(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('timeshift_presets_seoul', JSON.stringify(updated));
      }
    } else {
      const updated = [...californiaPresets];
      updated[index] = stationId;
      setCaliforniaPresets(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('timeshift_presets_california', JSON.stringify(updated));
      }
    }
  };

  const handleResetPresets = () => {
    if (activeBand === 'seoul_in_usa') {
      setSeoulPresets(DEFAULT_SEOUL_PRESETS);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('timeshift_presets_seoul');
      }
    } else {
      setCaliforniaPresets(DEFAULT_CA_PRESETS);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('timeshift_presets_california');
      }
    }
  };

  return {
    activePresetIds,
    presetStations,
    handleUpdatePreset,
    handleResetPresets,
  };
}
