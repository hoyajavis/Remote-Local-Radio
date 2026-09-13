import React, { ReactElement } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BandSelector } from '@/src/components/BandSelector';
import { LanguageProvider } from '@/src/i18n/translations';

const renderWithProvider = (ui: ReactElement) => {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
};

describe('BandSelector Component', () => {
  it('renders both regional band options', () => {
    renderWithProvider(
      <BandSelector
        activeBand="seoul_in_usa"
        onSelectBand={vi.fn()}
        isLiveSync={true}
        onToggleLiveSync={vi.fn()}
      />
    );

    expect(screen.getByText(/Seoul in USA|서울의 소리/i)).toBeInTheDocument();
    expect(screen.getByText(/CA in Korea|캘리포니아 사운드/i)).toBeInTheDocument();
  });

  it('calls onSelectBand when California band button is clicked', () => {
    const onSelectBand = vi.fn();
    renderWithProvider(
      <BandSelector
        activeBand="seoul_in_usa"
        onSelectBand={onSelectBand}
        isLiveSync={true}
        onToggleLiveSync={vi.fn()}
      />
    );

    const caBtn = screen.getByText(/CA in Korea|캘리포니아 사운드/i).closest('button');
    expect(caBtn).toBeTruthy();
    fireEvent.click(caBtn!);

    expect(onSelectBand).toHaveBeenCalledWith('california_in_seoul');
  });

  it('calls onSelectBand when Seoul band button is clicked', () => {
    const onSelectBand = vi.fn();
    renderWithProvider(
      <BandSelector
        activeBand="california_in_seoul"
        onSelectBand={onSelectBand}
        isLiveSync={true}
        onToggleLiveSync={vi.fn()}
      />
    );

    const seoulBtn = screen.getByText(/Seoul in USA|서울의 소리/i).closest('button');
    expect(seoulBtn).toBeTruthy();
    fireEvent.click(seoulBtn!);

    expect(onSelectBand).toHaveBeenCalledWith('seoul_in_usa');
  });

  it('does not render redundant live sync button in the band selector header', () => {
    renderWithProvider(
      <BandSelector
        activeBand="seoul_in_usa"
        onSelectBand={vi.fn()}
      />
    );

    expect(screen.queryByTitle(/실시간 동기화|Live Sync/i)).toBeNull();
    expect(screen.queryByText(/동기화 ON/i)).toBeNull();
  });
});
