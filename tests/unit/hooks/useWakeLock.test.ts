import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWakeLock } from '@/src/hooks/useWakeLock';

describe('useWakeLock hook', () => {
  let mockSentinel: { release: ReturnType<typeof vi.fn> };
  let mockRequest: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSentinel = { release: vi.fn().mockResolvedValue(undefined) };
    mockRequest = vi.fn().mockResolvedValue(mockSentinel);

    (navigator as any).wakeLock = {
      request: mockRequest,
    };
  });

  it('requests screen wake lock when isActive is true', async () => {
    renderHook(() => useWakeLock(true));

    expect(mockRequest).toHaveBeenCalledWith('screen');
  });

  it('does not request wake lock when isActive is false', () => {
    renderHook(() => useWakeLock(false));

    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('releases wake lock when isActive transitions from true to false', async () => {
    const { rerender } = renderHook(({ active }) => useWakeLock(active), {
      initialProps: { active: true },
    });

    await vi.waitFor(() => {
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    rerender({ active: false });

    await vi.waitFor(() => {
      expect(mockSentinel.release).toHaveBeenCalled();
    });
  });

  it('releases wake lock on unmount', async () => {
    const { unmount } = renderHook(() => useWakeLock(true));

    await vi.waitFor(() => {
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    unmount();

    await vi.waitFor(() => {
      expect(mockSentinel.release).toHaveBeenCalled();
    });
  });

  it('handles environment without wakeLock gracefully', () => {
    delete (navigator as any).wakeLock;

    expect(() => {
      renderHook(() => useWakeLock(true));
    }).not.toThrow();
  });
});
