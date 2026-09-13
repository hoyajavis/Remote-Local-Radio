import { useEffect, useRef } from 'react';

/**
 * Screen Wake Lock hook to keep appliance / iPad displays illuminated during playback
 */
export function useWakeLock(isActive: boolean) {
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    const manageWakeLock = async () => {
      if (isActive && 'wakeLock' in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          console.warn('Screen WakeLock unavailable:', err);
        }
      } else if (!isActive && wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
        } catch {}
      }
    };

    manageWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, [isActive]);
}
