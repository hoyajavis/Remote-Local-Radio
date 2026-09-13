import React, { ReactElement } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PresetManagerModal } from '@/src/components/PresetManagerModal';
import { LanguageProvider } from '@/src/i18n/translations';
import { RadioStation } from '@/src/types/radio';

const mockStations: RadioStation[] = [
  { id: 'mbc-919', name: 'MBC FM4U', frequency: '91.9 FM', city: 'Seoul', genre: 'K-Pop', tagline: 'Hit Music' },
  { id: 'sbs-1077', name: 'SBS Power FM', frequency: '107.7 FM', city: 'Seoul', genre: 'Variety', tagline: 'Power FM' },
  { id: 'kbs-891', name: 'KBS Cool FM', frequency: '89.1 FM', city: 'Seoul', genre: 'K-Pop', tagline: 'Cool FM' },
  { id: 'ebs-1045', name: 'EBS FM', frequency: '104.5 FM', city: 'Seoul', genre: 'Education', tagline: 'EBS' },
] as any as RadioStation[];

const renderWithProvider = (ui: ReactElement) => {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
};

describe('PresetManagerModal Component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = renderWithProvider(
      <PresetManagerModal
        isOpen={false}
        onClose={vi.fn()}
        activeBand="seoul_in_usa"
        availableStations={mockStations}
        presetStationIds={['mbc-919', 'sbs-1077']}
        onUpdatePreset={vi.fn()}
        onResetPresets={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders preset slots and station options when open', () => {
    renderWithProvider(
      <PresetManagerModal
        isOpen={true}
        onClose={vi.fn()}
        activeBand="seoul_in_usa"
        availableStations={mockStations}
        presetStationIds={['mbc-919', 'sbs-1077']}
        onUpdatePreset={vi.fn()}
        onResetPresets={vi.fn()}
      />
    );

    expect(screen.getByText(/라디오 프리셋 메모리 설정|Radio Preset Channel Memory/i)).toBeInTheDocument();
    expect(screen.getAllByRole('combobox').length).toBe(6);
  });

  it('calls onUpdatePreset when a station dropdown value changes', () => {
    const onUpdatePreset = vi.fn();
    renderWithProvider(
      <PresetManagerModal
        isOpen={true}
        onClose={vi.fn()}
        activeBand="seoul_in_usa"
        availableStations={mockStations}
        presetStationIds={['mbc-919', 'sbs-1077', 'kbs-891', 'kbs-891', 'kbs-891', 'kbs-891']}
        onUpdatePreset={onUpdatePreset}
        onResetPresets={vi.fn()}
      />
    );

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'ebs-1045' } });

    expect(onUpdatePreset).toHaveBeenCalledWith(0, 'ebs-1045');
  });

  it('calls onResetPresets when reset button is clicked', () => {
    const onResetPresets = vi.fn();
    renderWithProvider(
      <PresetManagerModal
        isOpen={true}
        onClose={vi.fn()}
        activeBand="seoul_in_usa"
        availableStations={mockStations}
        presetStationIds={['mbc-919']}
        onUpdatePreset={vi.fn()}
        onResetPresets={onResetPresets}
      />
    );

    const resetBtn = screen.getByText(/기본값으로 초기화|Reset to Defaults/i);
    fireEvent.click(resetBtn);

    expect(onResetPresets).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    renderWithProvider(
      <PresetManagerModal
        isOpen={true}
        onClose={onClose}
        activeBand="seoul_in_usa"
        availableStations={mockStations}
        presetStationIds={['mbc-919']}
        onUpdatePreset={vi.fn()}
        onResetPresets={vi.fn()}
      />
    );

    const closeBtn = screen.getByTitle('Close');
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
