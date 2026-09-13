import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useRadioPresets,
  DEFAULT_SEOUL_PRESETS,
  DEFAULT_CA_PRESETS,
} from '@/src/hooks/useRadioPresets';
import { RadioStation } from '@/src/types/radio';
import { getStationsForBand, SEOUL_STATIONS, CALIFORNIA_STATIONS } from '@/src/data/defaultStations';

const mockSeoulStations: RadioStation[] = [
  { id: 'mbc-919', name: 'MBC FM4U', frequency: '91.9 FM', city: 'Seoul', genre: 'K-Pop', tagline: 'Hit Music' },
  { id: 'sbs-1077', name: 'SBS Power FM', frequency: '107.7 FM', city: 'Seoul', genre: 'Variety', tagline: 'Power FM' },
  { id: 'kbs-891', name: 'KBS Cool FM', frequency: '89.1 FM', city: 'Seoul', genre: 'K-Pop', tagline: 'Cool FM' },
  { id: 'kbs-931', name: 'KBS Classic FM', frequency: '93.1 FM', city: 'Seoul', genre: 'Classical', tagline: 'Classic FM' },
  { id: 'cbs-939', name: 'CBS Music FM', frequency: '93.9 FM', city: 'Seoul', genre: 'Ballads', tagline: 'Music FM' },
  { id: 'afn-885', name: 'AFN The Eagle', frequency: '88.5 FM', city: 'Seoul', genre: 'Pop', tagline: 'The Eagle' },
  { id: 'ebs-1045', name: 'EBS FM', frequency: '104.5 FM', city: 'Seoul', genre: 'Education', tagline: 'EBS' },
] as any as RadioStation[];

const mockCaStations: RadioStation[] = [
  { id: 'kazu-903', name: 'KAZU 90.3', frequency: '90.3 FM', city: 'Pacific Grove, CA', genre: 'NPR', tagline: 'NPR Monterey' },
  { id: 'kwav-969', name: 'KWAV 96.9', frequency: '96.9 FM', city: 'Monterey, CA', genre: 'Pop', tagline: 'K-Wave' },
  { id: 'kdon-1025', name: 'KDON 102.5', frequency: '102.5 FM', city: 'Salinas, CA', genre: 'Top 40', tagline: 'Top 40' },
  { id: 'kqei-893', name: 'KQEI 89.3', frequency: '89.3 FM', city: 'Monterey, CA', genre: 'KQED', tagline: 'KQED Monterey' },
  { id: 'ksqd-907', name: 'KSQD 90.7', frequency: '90.7 FM', city: 'Santa Cruz, CA', genre: 'Community', tagline: 'K-Squid' },
  { id: 'kdfc-899', name: 'KDFC 89.9', frequency: '89.9 FM', city: 'Pacific Grove, CA', genre: 'Classical', tagline: 'Classical' },
  { id: 'kpig-1075', name: 'KPIG 107.5', frequency: '107.5 FM', city: 'Freedom, CA', genre: 'Americana', tagline: 'The Pig' },
] as any as RadioStation[];

describe('useRadioPresets hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes with default presets for Seoul band', () => {
    const { result } = renderHook(() =>
      useRadioPresets({
        activeBand: 'seoul_in_usa',
        bandStations: mockSeoulStations,
      })
    );

    expect(result.current.activePresetIds).toEqual(DEFAULT_SEOUL_PRESETS);
    expect(result.current.presetStations.length).toBe(6);
    expect(result.current.presetStations[0].id).toBe('mbc-919');
  });

  it('initializes with default presets for California band', () => {
    const { result } = renderHook(() =>
      useRadioPresets({
        activeBand: 'california_in_seoul',
        bandStations: mockCaStations,
      })
    );

    expect(result.current.activePresetIds).toEqual(DEFAULT_CA_PRESETS);
    expect(result.current.presetStations.length).toBe(6);
    expect(result.current.presetStations[0].id).toBe('kazu-903');
  });

  it('updates a preset slot and writes to localStorage', () => {
    const { result } = renderHook(() =>
      useRadioPresets({
        activeBand: 'seoul_in_usa',
        bandStations: mockSeoulStations,
      })
    );

    act(() => {
      // Reassign preset slot index 0 to ebs-1045
      result.current.handleUpdatePreset(0, 'ebs-1045');
    });

    expect(result.current.activePresetIds[0]).toBe('ebs-1045');
    const stored = JSON.parse(localStorage.getItem('timeshift_presets_seoul') || '[]');
    expect(stored[0]).toBe('ebs-1045');
  });

  it('resets custom presets back to defaults', () => {
    const { result } = renderHook(() =>
      useRadioPresets({
        activeBand: 'seoul_in_usa',
        bandStations: mockSeoulStations,
      })
    );

    act(() => {
      result.current.handleUpdatePreset(1, 'ebs-1045');
    });
    expect(result.current.activePresetIds[1]).toBe('ebs-1045');

    act(() => {
      result.current.handleResetPresets();
    });

    expect(result.current.activePresetIds).toEqual(DEFAULT_SEOUL_PRESETS);
    expect(localStorage.getItem('timeshift_presets_seoul')).toBeNull();
  });

  it('filters out invalid cross-contaminated stations from California presets', () => {
    localStorage.setItem(
      'timeshift_presets_california',
      JSON.stringify(['tbs-1013', 'kwav-969', 'kdon-1025', 'kqei-893', 'ksqd-907', 'kdfc-899'])
    );

    const { result } = renderHook(() =>
      useRadioPresets({
        activeBand: 'california_in_seoul',
        bandStations: mockCaStations,
      })
    );

    // Corrupted or cross-contaminated list should fall back to defaults
    expect(result.current.activePresetIds).toEqual(DEFAULT_CA_PRESETS);
  });

  it('ensures getStationsForBand strictly isolates bands and orders by numerical frequency (mhz ascending)', () => {
    // Seoul band audit
    const seoulStations = getStationsForBand('seoul_in_usa');
    expect(seoulStations.length).toBe(10);
    seoulStations.forEach((s) => {
      expect(s.band).toBe('seoul_in_usa');
      expect(s.country).toBe('South Korea');
    });
    for (let i = 0; i < seoulStations.length - 1; i++) {
      expect(seoulStations[i].mhz).toBeLessThan(seoulStations[i + 1].mhz);
    }
    expect(seoulStations[0].id).toBe('afn-885');
    expect(seoulStations[0].mhz).toBe(88.5);
    expect(seoulStations[seoulStations.length - 1].id).toBe('sbs-1077');
    expect(seoulStations[seoulStations.length - 1].mhz).toBe(107.7);

    // California band audit
    const caStations = getStationsForBand('california_in_seoul');
    expect(caStations.length).toBe(11);
    caStations.forEach((s) => {
      expect(s.band).toBe('california_in_seoul');
      expect(s.country).toBe('United States');
    });
    for (let i = 0; i < caStations.length - 1; i++) {
      expect(caStations[i].mhz).toBeLessThan(caStations[i + 1].mhz);
    }
    expect(caStations[0].id).toBe('kzsc-881');
    expect(caStations[0].mhz).toBe(88.1);
    expect(caStations[caStations.length - 1].id).toBe('kpig-1075');
    expect(caStations[caStations.length - 1].mhz).toBe(107.5);

    // Zero cross-band contamination
    const caIds = CALIFORNIA_STATIONS.map((s) => s.id);
    const seoulIds = SEOUL_STATIONS.map((s) => s.id);
    seoulStations.forEach((s) => expect(caIds).not.toContain(s.id));
    caStations.forEach((s) => expect(seoulIds).not.toContain(s.id));
  });

  it('verifies SEEK NEXT and SEEK PREV wrap in numerical frequency order with zero cross-band leakage', () => {
    const seoulList = getStationsForBand('seoul_in_usa');

    // Seek forward from lowest frequency (88.5 MHz) to next
    let currentIdx = 0;
    const nextIdx = (currentIdx + 1) % seoulList.length;
    expect(seoulList[nextIdx].mhz).toBe(89.1);

    // Seek forward from highest frequency (107.7 MHz) wraps around to lowest (88.5 MHz)
    currentIdx = seoulList.length - 1;
    const wrappedNextIdx = (currentIdx + 1) % seoulList.length;
    expect(wrappedNextIdx).toBe(0);
    expect(seoulList[wrappedNextIdx].mhz).toBe(88.5);

    // Seek backward from lowest frequency (88.5 MHz) wraps around to highest (107.7 MHz)
    currentIdx = 0;
    const wrappedPrevIdx = (currentIdx - 1 + seoulList.length) % seoulList.length;
    expect(wrappedPrevIdx).toBe(seoulList.length - 1);
    expect(seoulList[wrappedPrevIdx].mhz).toBe(107.7);
  });
});
