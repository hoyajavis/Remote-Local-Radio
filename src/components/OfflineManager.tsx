import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Download, Trash2, CheckCircle2, HardDrive, AlertTriangle } from 'lucide-react';
import { offlineStorage } from '../services/offlineCache';
import { audioEngine } from '../services/audioEngine';
import { useLanguage } from '../i18n/translations';

interface OfflineManagerProps {
  currentStationId: string;
  broadcastHour: number;
}

export const OfflineManager: React.FC<OfflineManagerProps> = ({
  currentStationId,
  broadcastHour,
}) => {
  const { language, t } = useLanguage();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [cacheMetrics, setCacheMetrics] = useState({ count: 0, estimatedMb: 0, estimatedMinutes: 0 });
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ loaded: 0, total: 0 });

  // Refresh cache metrics
  const refreshMetrics = async () => {
    const metrics = await offlineStorage.getCacheMetrics();
    setCacheMetrics(metrics);
  };

  useEffect(() => {
    refreshMetrics();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleToggleSimulatedOffline = () => {
    const nextVal = !isSimulatedOffline;
    setIsSimulatedOffline(nextVal);
    audioEngine.setSimulatedOffline(nextVal);
  };

  const handlePrebuffer = async () => {
    setIsDownloading(true);
    setDownloadProgress({ loaded: 0, total: 30 });

    try {
      await offlineStorage.prebufferUpcoming(
        currentStationId,
        broadcastHour,
        30, // ~3 minutes of continuous broadcast segments
        (loaded, total) => {
          setDownloadProgress({ loaded, total });
        }
      );
      await refreshMetrics();
    } catch (err) {
      console.warn('Prebuffering error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClearCache = async () => {
    await offlineStorage.clearCache();
    await refreshMetrics();
  };

  const effectiveOffline = !isOnline || isSimulatedOffline;

  return (
    <div
      id="offline-manager-card"
      className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 md:p-6 shadow-xl flex flex-col gap-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2.5">
          <HardDrive className="w-5 h-5 text-emerald-400" />
          <div>
            <h4 className="text-base font-bold text-white tracking-tight">
              {t.offlineTitle}
            </h4>
            <p className="text-xs text-neutral-400">
              {t.offlineDesc}
            </p>
          </div>
        </div>

        {/* Network Status Badge */}
        <div className="flex items-center gap-2">
          {effectiveOffline ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <WifiOff className="w-3.5 h-3.5" />
              {isSimulatedOffline
                ? language === 'ko'
                  ? '가상 오프라인 테스트 모드'
                  : 'SIMULATED OFFLINE'
                : language === 'ko'
                  ? '오프라인 (로컬 캐시 재생중)'
                  : 'OFFLINE (CACHE PLAYING)'}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Wifi className="w-3.5 h-3.5" />
              {language === 'ko' ? '정상 네트워크 연결됨' : 'LIVE NETWORK CONNECTED'}
            </span>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-3">
          <span className="text-[11px] font-mono text-neutral-400">{t.cachedTime}</span>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
            {cacheMetrics.estimatedMinutes} {language === 'ko' ? '분' : 'min'}
          </div>
          <span className="text-[10px] text-neutral-400">
            {language === 'ko' ? '지하철 무단절 청취 보장 시간' : 'Guaranteed uninterrupted audio'}
          </span>
        </div>

        <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-3">
          <span className="text-[11px] font-mono text-neutral-400">{t.indexedSegments}</span>
          <div className="text-xl font-bold font-mono text-neutral-200 mt-0.5">
            {cacheMetrics.count} {language === 'ko' ? '개 조각' : 'chunks'}
          </div>
          <span className="text-[10px] text-neutral-400">
            {cacheMetrics.estimatedMb} MB ({language === 'ko' ? '로컬 저장소' : 'in local storage'})
          </span>
        </div>

        <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-3">
          <span className="text-[11px] font-mono text-neutral-400">{t.bufferHealth}</span>
          <div className="text-xl font-bold font-mono text-sky-400 mt-0.5 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{language === 'ko' ? '안정적' : 'Optimal'}</span>
          </div>
          <span className="text-[10px] text-neutral-400">
            {language === 'ko' ? '롤링 백그라운드 사전 패치 활성' : 'Automatic rolling background prefetch'}
          </span>
        </div>
      </div>

      {/* Download Progress Bar if active */}
      {isDownloading && (
        <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-neutral-300">
            <span>{t.preBuffering}</span>
            <span className="text-amber-400">{downloadProgress.loaded} / {downloadProgress.total}</span>
          </div>
          <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full transition-all duration-200"
              style={{
                width: `${(downloadProgress.loaded / (downloadProgress.total || 1)) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          {/* Pre-buffer button */}
          <button
            id="prebuffer-next-btn"
            onClick={handlePrebuffer}
            disabled={isDownloading}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-100 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-neutral-700"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>{isDownloading ? t.preBuffering : t.preBufferBtn}</span>
          </button>

          {/* Clear Cache */}
          {cacheMetrics.count > 0 && (
            <button
              id="clear-cache-btn"
              onClick={handleClearCache}
              className="px-2.5 py-1.5 text-neutral-400 hover:text-red-400 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
              title="Clear cached audio chunks"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.clearCacheBtn}</span>
            </button>
          )}
        </div>

        {/* Simulate Network Drop Toggle */}
        <div className="flex items-center gap-2">
          <button
            id="simulate-offline-toggle-btn"
            onClick={handleToggleSimulatedOffline}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-colors border ${
              isSimulatedOffline
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
            }`}
            title="Toggle simulated network disconnection to verify offline cache playback"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>
              {isSimulatedOffline
                ? language === 'ko'
                  ? '오프라인 시뮬레이션 종료'
                  : 'Stop Simulating Offline'
                : language === 'ko'
                  ? '오프라인 모드 테스트'
                  : 'Test Offline Mode'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
