import React, { useState, useEffect, useCallback } from 'react';
import {
  Radio,
  Clock,
  HardDrive,
  Calendar,
  Settings,
  HelpCircle,
  Volume2,
  ExternalLink,
  ShieldCheck,
  Signal
} from 'lucide-react';
import { RadioStation, ScheduleSlot, TimeShiftInfo } from './types/radio';
import {
  fetchStations,
  fetchSchedule,
  saveSchedule,
  resetSchedule,
  fetchTimeShiftStatus
} from './services/api';
import { audioEngine } from './services/audioEngine';
import { RadioTuner } from './components/RadioTuner';
import { TimeShiftControls } from './components/TimeShiftControls';
import { ProgramGuide } from './components/ProgramGuide';
import { OfflineManager } from './components/OfflineManager';
import { ScheduleAdminModal } from './components/ScheduleAdminModal';
import { LanguageToggle } from './components/LanguageToggle';
import { useLanguage } from './i18n/translations';
import { DEFAULT_STATIONS, DEFAULT_SCHEDULE } from './data/defaultStations';

export default function App() {
  const { language, t } = useLanguage();
  const [stations, setStations] = useState<RadioStation[]>(DEFAULT_STATIONS);
  const [currentStation, setCurrentStation] = useState<RadioStation>(DEFAULT_STATIONS[0]);
  const [schedule, setSchedule] = useState<ScheduleSlot[]>(DEFAULT_SCHEDULE);

  // Time & Time-shift state
  const [userTimezone, setUserTimezone] = useState<string>('America/Los_Angeles');
  const [isLiveSync, setIsLiveSync] = useState<boolean>(true);
  const [scrubbedHour, setScrubbedHour] = useState<number>(7);

  // Live clock readout
  const [timeShiftData, setTimeShiftData] = useState<Partial<TimeShiftInfo>>({
    userLocalTimeStr: '07:00:00',
    seoulLiveTimeStr: '23:00:00',
    broadcastTimeStr: '07:00:00',
    offsetHours: 16,
    currentSlot: DEFAULT_SCHEDULE[2],
  });

  // Audio Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.85);

  // UI Tabs & Modals
  const [activeTab, setActiveTab] = useState<'epg' | 'offline' | 'stations'>('epg');
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [loadedStations, loadedSchedule] = await Promise.all([
          fetchStations().catch(() => DEFAULT_STATIONS),
          fetchSchedule().catch(() => DEFAULT_SCHEDULE)
        ]);
        setStations(loadedStations);
        setSchedule(loadedSchedule);
        if (loadedStations.length > 0) {
          // Default to MBC FM4U 91.9
          const mbc = loadedStations.find((s) => s.mhz === 91.9) || loadedStations[0];
          setCurrentStation(mbc);
        }
      } catch (err) {
        console.warn('Fallback to local defaults:', err);
      }
    }
    loadData();
  }, []);

  // Update time shift status from server
  const refreshTimeShift = useCallback(async () => {
    try {
      const data = await fetchTimeShiftStatus(
        userTimezone,
        isLiveSync,
        isLiveSync ? undefined : scrubbedHour
      );
      setTimeShiftData(data);
    } catch {
      // Offline or local fallback calculation
      const now = new Date();
      const localH = now.getHours();
      const localM = now.getMinutes();
      const localS = now.getSeconds();
      const targetH = isLiveSync ? localH : scrubbedHour;
      setTimeShiftData((prev) => ({
        ...prev,
        userLocalTimeStr: `${String(localH).padStart(2, '0')}:${String(localM).padStart(2, '0')}:${String(localS).padStart(2, '0')}`,
        broadcastTimeStr: `${String(targetH).padStart(2, '0')}:${String(localM).padStart(2, '0')}:${String(localS).padStart(2, '0')}`,
        offsetHours: 16,
      }));
    }
  }, [userTimezone, isLiveSync, scrubbedHour]);

  // Periodic clock update
  useEffect(() => {
    refreshTimeShift();
    const interval = setInterval(refreshTimeShift, 1000);
    return () => clearInterval(interval);
  }, [refreshTimeShift]);

  // Audio Play / Pause handler
  const handleTogglePlay = async () => {
    if (isPlaying) {
      audioEngine.stop();
      setIsPlaying(false);
    } else {
      const targetHour = isLiveSync
        ? parseInt(timeShiftData.broadcastTimeStr?.split(':')[0] || '7', 10)
        : scrubbedHour;
      await audioEngine.play(currentStation.id, targetHour);
      setIsPlaying(true);
    }
  };

  // Station Change handler
  const handleSelectStation = (station: RadioStation) => {
    setCurrentStation(station);
    const targetHour = isLiveSync
      ? parseInt(timeShiftData.broadcastTimeStr?.split(':')[0] || '7', 10)
      : scrubbedHour;
    audioEngine.tuneTo(station.id, targetHour);
  };

  // Time Scrubbing handler
  const handleScrubHour = (hour: number) => {
    setScrubbedHour(hour);
    setIsLiveSync(false);
    if (isPlaying) {
      audioEngine.tuneTo(currentStation.id, hour);
    }
  };

  // Live Sync Toggle handler
  const handleToggleLiveSync = (val: boolean) => {
    setIsLiveSync(val);
    if (val && isPlaying) {
      const currentH = parseInt(timeShiftData.userLocalTimeStr?.split(':')[0] || '7', 10);
      audioEngine.tuneTo(currentStation.id, currentH);
    }
  };

  // Save Schedule Handler (Admin)
  const handleSaveSchedule = async (newSchedule: ScheduleSlot[]) => {
    const updated = await saveSchedule(newSchedule);
    setSchedule(updated);
    refreshTimeShift();
  };

  // Reset Schedule Handler (Admin)
  const handleResetSchedule = async () => {
    const updated = await resetSchedule();
    setSchedule(updated);
    refreshTimeShift();
  };

  // Select slot from EPG
  const handleSelectSlot = (slot: ScheduleSlot) => {
    const matchedStation = stations.find((s) => s.id === slot.stationId);
    if (matchedStation) {
      setCurrentStation(matchedStation);
    }
    handleScrubHour(slot.startHour);
    if (!isPlaying) {
      handleTogglePlay();
    }
  };

  const broadcastHour = parseInt(timeShiftData.broadcastTimeStr?.split(':')[0] || '7', 10);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-amber-500 selection:text-black">
      {/* Top Application Header */}
      <header className="border-b border-neutral-800/80 bg-neutral-900/80 backdrop-blur-md sticky top-0 z-30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Frequency */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-black flex items-center justify-center font-black shadow-lg">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white font-sans">
                  {t.appTitle}
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-neutral-800 text-amber-400 border border-neutral-700">
                  {t.appBadge}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-mono hidden sm:block">
                {t.appSubtitle}
              </p>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher UI Element */}
            <LanguageToggle />

            {/* Quick Status */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-neutral-950 rounded-lg border border-neutral-800 text-xs font-mono text-neutral-300">
              <Signal className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.delayNotice}: -{timeShiftData.offsetHours || 16}h</span>
              <span className="text-neutral-600">|</span>
              <span className="text-amber-400">
                {isLiveSync ? t.liveSyncActive : `${t.shiftedNotice} ${scrubbedHour}:00`}
              </span>
            </div>

            {/* How it works button */}
            <button
              id="header-help-btn"
              onClick={() => setShowHelpModal(true)}
              className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              title={t.howItWorksBtn}
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            {/* Admin Schedule Builder Button */}
            <button
              id="header-admin-schedule-btn"
              onClick={() => setIsAdminModalOpen(true)}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-neutral-700"
            >
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.customScheduleBtn}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 flex flex-col gap-6">
        {/* Top Feature: Radio Tuner Interface */}
        <RadioTuner
          stations={stations}
          currentStation={currentStation}
          onSelectStation={handleSelectStation}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          volume={volume}
          onVolumeChange={(val) => {
            setVolume(val);
            audioEngine.setVolume(val);
          }}
          currentSlot={timeShiftData.currentSlot || null}
          broadcastTimeStr={timeShiftData.broadcastTimeStr || '07:00:00'}
        />

        {/* Core Feature: Time Shift Engine Controls */}
        <TimeShiftControls
          userTimezone={userTimezone}
          onTimezoneChange={(tz) => setUserTimezone(tz)}
          userLocalTimeStr={timeShiftData.userLocalTimeStr || '07:00:00'}
          seoulLiveTimeStr={timeShiftData.seoulLiveTimeStr || '23:00:00'}
          broadcastTimeStr={timeShiftData.broadcastTimeStr || '07:00:00'}
          offsetHours={timeShiftData.offsetHours || 16}
          isLiveSync={isLiveSync}
          onToggleLiveSync={handleToggleLiveSync}
          scrubbedHour={scrubbedHour}
          onScrubHour={handleScrubHour}
        />

        {/* Secondary Views Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-neutral-800 pb-2 overflow-x-auto">
          <button
            id="tab-btn-epg"
            onClick={() => setActiveTab('epg')}
            className={`px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
              activeTab === 'epg'
                ? 'bg-amber-500 text-black font-bold shadow'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>{t.tabEpg}</span>
          </button>

          <button
            id="tab-btn-offline"
            onClick={() => setActiveTab('offline')}
            className={`px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
              activeTab === 'offline'
                ? 'bg-amber-500 text-black font-bold shadow'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>{t.tabOffline}</span>
          </button>

          <button
            id="tab-btn-stations"
            onClick={() => setActiveTab('stations')}
            className={`px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
              activeTab === 'stations'
                ? 'bg-amber-500 text-black font-bold shadow'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>{t.tabStations}</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'epg' && (
          <ProgramGuide
            schedule={schedule}
            stations={stations}
            currentBroadcastHour={broadcastHour}
            userTimezone={userTimezone}
            offsetHours={timeShiftData.offsetHours || 16}
            onSelectSlot={handleSelectSlot}
            currentPlayingSlotId={timeShiftData.currentSlot?.id}
          />
        )}

        {activeTab === 'offline' && (
          <OfflineManager
            currentStationId={currentStation.id}
            broadcastHour={broadcastHour}
          />
        )}

        {activeTab === 'stations' && (
          <div
            id="stations-directory-card"
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h4 className="text-base font-bold text-white tracking-tight">
                  {t.directoryTitle}
                </h4>
                <p className="text-xs text-neutral-400">
                  {t.directoryDesc}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {stations.map((st) => (
                <div
                  key={st.id}
                  id={`station-card-${st.id}`}
                  onClick={() => handleSelectStation(st)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    st.id === currentStation.id
                      ? 'bg-amber-500/10 border-amber-500/50'
                      : 'bg-neutral-950 border-neutral-800 hover:bg-neutral-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: st.color }}
                        />
                        <h5 className="text-sm font-bold text-white">
                          {language === 'ko' ? st.nameKo || st.name : st.name}
                        </h5>
                      </div>
                      <span className="text-xs text-neutral-400">
                        {language === 'ko' ? st.name : st.nameKo}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                      {st.frequency}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-300 line-clamp-2">
                    {language === 'ko' ? st.taglineKo : st.tagline}
                  </p>

                  <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 border-t border-neutral-800/80 pt-2">
                    <span>{st.genre}</span>
                    <button className="text-amber-400 hover:underline flex items-center gap-1">
                      {t.tuneInStation} →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Admin Custom Schedule Modal */}
      <ScheduleAdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        schedule={schedule}
        stations={stations}
        onSaveSchedule={handleSaveSchedule}
        onResetSchedule={handleResetSchedule}
      />

      {/* How It Works Modal */}
      {showHelpModal && (
        <div
          id="help-modal-backdrop"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  {t.helpTitle}
                </h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-neutral-300 space-y-3 leading-relaxed">
              <p>
                {t.helpP1}
              </p>
              <p>
                {t.helpP2}
              </p>
              <ul className="list-disc list-inside space-y-1 text-neutral-400">
                <li><strong className="text-neutral-200">{t.helpBullet1.split(':')[0]}:</strong>{t.helpBullet1.split(':')[1] || ''}</li>
                <li><strong className="text-neutral-200">{t.helpBullet2.split(':')[0]}:</strong>{t.helpBullet2.split(':')[1] || ''}</li>
                <li><strong className="text-neutral-200">{t.helpBullet3.split(':')[0]}:</strong>{t.helpBullet3.split(':')[1] || ''}</li>
                <li><strong className="text-neutral-200">{t.helpBullet4.split(':')[0]}:</strong>{t.helpBullet4.split(':')[1] || ''}</li>
              </ul>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowHelpModal(false)}
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-xs"
              >
                {t.helpCloseBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-neutral-800/80 bg-neutral-950 py-4 px-4 text-center text-xs text-neutral-400 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            {t.footerTitle}
          </span>
          <span className="flex items-center gap-1 text-neutral-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t.footerStatus}</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
