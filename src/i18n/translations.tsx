import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'ko';

export interface Translations {
  // Brand & Header
  appTitle: string;
  appBadge: string;
  appSubtitle: string;
  delayNotice: string;
  liveSyncActive: string;
  shiftedNotice: string;
  howItWorksBtn: string;
  customScheduleBtn: string;

  // Navigation Tabs
  tabEpg: string;
  tabOffline: string;
  tabStations: string;

  // Radio Tuner
  onAir: string;
  standby: string;
  currentBroadcast: string;
  tunerFreq: string;
  stereoFmHighQ: string;
  fmTuningDial: string;
  presets: string;
  spectrumAnalyzer: string;
  jingleBtn: string;
  pipsBtn: string;
  startBroadcast: string;
  pauseBroadcast: string;
  volume: string;
  nowPlayingShow: string;
  liveSeoulSource: string;

  // TimeShift Controls
  timeShiftEngine: string;
  timeShiftDesc: string;
  yourLocalTime: string;
  listenerClock: string;
  seoulBroadcastSlot: string;
  onAirNow: string;
  liveSeoulTime: string;
  bufferDelay: string;
  timezoneLabel: string;
  liveSyncButtonOn: string;
  liveSyncButtonOff: string;
  jumpLocalTime: string;
  timelineHeader: string;
  timelineSub: string;
  morningCommute: string;
  noonLunch: string;
  eveningDrive: string;
  starryNight: string;

  // EPG
  epgTitle: string;
  epgDesc: string;
  localTimeCol: string;
  seoulTimeCol: string;
  stationCol: string;
  programCol: string;
  djCol: string;
  actionCol: string;
  nowAiringBadge: string;
  tuneInBtn: string;
  playingBadge: string;
  filterAll: string;
  filterMorning: string;
  filterAfternoon: string;
  filterEvening: string;
  filterNight: string;

  // Offline Manager
  offlineTitle: string;
  offlineDesc: string;
  cachedTime: string;
  indexedSegments: string;
  bufferHealth: string;
  preBufferBtn: string;
  preBuffering: string;
  clearCacheBtn: string;
  simulateOfflineMode: string;
  offlineActiveNotice: string;
  onlineNotice: string;
  testAudioEngine: string;

  // Station Directory
  directoryTitle: string;
  directoryDesc: string;
  tuneInStation: string;

  // Admin Modal
  adminTitle: string;
  adminSubtitle: string;
  adminSlotsCount: string;
  inspectNotice: string;
  selectedInterval: string;
  previewAudio: string;
  relaySourceStation: string;
  showTitleKo: string;
  showTitleEn: string;
  djName: string;
  genreLabel: string;
  descLabel: string;
  quickRangeTitle: string;
  fromHour: string;
  toHour: string;
  assignStation: string;
  applyRangeBtn: string;
  showingIntervals: string;
  resetDefaultBtn: string;
  cancelBtn: string;
  saveScheduleBtn: string;
  savingBtn: string;
  savedSuccess: string;

  // Help Modal
  helpTitle: string;
  helpP1: string;
  helpP2: string;
  helpBullet1: string;
  helpBullet2: string;
  helpBullet3: string;
  helpBullet4: string;
  helpCloseBtn: string;

  // Footer
  footerTitle: string;
  footerStatus: string;
}

export const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    // Brand & Header
    appTitle: 'TimeShift Radio',
    appBadge: 'SEOUL 91.9 FM',
    appSubtitle: 'California ↔ Seoul Virtual Time-Zone Replay System',
    delayNotice: 'Delay',
    liveSyncActive: 'Live Sync Active',
    shiftedNotice: 'Shifted',
    howItWorksBtn: 'How it Works',
    customScheduleBtn: 'Custom Schedule',

    // Navigation Tabs
    tabEpg: '24-Hour Program Guide',
    tabOffline: 'Offline Caching & Network Resilience',
    tabStations: 'Seoul Station Directory & Relays',

    // Radio Tuner
    onAir: 'ON AIR',
    standby: 'STANDBY',
    currentBroadcast: 'CURRENT BROADCAST',
    tunerFreq: 'TUNER FREQ',
    stereoFmHighQ: 'STEREO FM HIGH-Q',
    fmTuningDial: 'FM TUNING DIAL',
    presets: 'PRESETS',
    spectrumAnalyzer: 'SPECTRUM ANALYZER',
    jingleBtn: 'Jingle',
    pipsBtn: '시보 (Pips)',
    startBroadcast: 'Start Radio Playback',
    pauseBroadcast: 'Pause Broadcast',
    volume: 'VOLUME',
    nowPlayingShow: 'NOW AIRING',
    liveSeoulSource: 'Originating from Seoul 91.9 MHz (Namsan Transmitter)',

    // TimeShift Controls
    timeShiftEngine: 'Time Shift & Zone Engine',
    timeShiftDesc: 'Synchronizes South Korean FM broadcasts so morning rush hour in Seoul plays during your local California morning.',
    yourLocalTime: 'YOUR LOCAL TIME',
    listenerClock: 'LISTENER CLOCK',
    seoulBroadcastSlot: 'SEOUL BROADCAST SLOT',
    onAirNow: 'ON AIR IN REPLAY',
    liveSeoulTime: 'LIVE REAL-TIME IN SEOUL',
    bufferDelay: 'BUFFER DELAY',
    timezoneLabel: 'Your Local Timezone:',
    liveSyncButtonOn: 'Live Sync: ON',
    liveSyncButtonOff: 'Manual Scrub Mode',
    jumpLocalTime: 'Jump to Current Local Time',
    timelineHeader: '24-HOUR BROADCAST TIMELINE (SEOUL TIME)',
    timelineSub: 'Click any hour below to jump to that Seoul broadcast slot',
    morningCommute: '07:00 Morning Commute',
    noonLunch: '12:00 Noon Lunch Hits',
    eveningDrive: '18:00 Evening Drive',
    starryNight: '22:00 Starry Night (별밤)',

    // EPG
    epgTitle: '24-Hour Electronic Program Guide (EPG)',
    epgDesc: 'Compare your local listener broadcast schedule with the corresponding Korean Standard Time (KST) airings.',
    localTimeCol: 'Local Listener Time',
    seoulTimeCol: 'Seoul Air Time (KST)',
    stationCol: 'Relay Broadcaster',
    programCol: 'Program Title & Host',
    djCol: 'Host / DJ',
    actionCol: 'Listen',
    nowAiringBadge: 'ON AIR NOW',
    tuneInBtn: 'Tune In',
    playingBadge: 'Playing',
    filterAll: 'All Hours',
    filterMorning: 'Morning (06-12)',
    filterAfternoon: 'Afternoon (12-18)',
    filterEvening: 'Evening (18-22)',
    filterNight: 'Night (22-06)',

    // Offline Manager
    offlineTitle: 'Offline Broadcast Cache & Resilience',
    offlineDesc: 'Pre-buffers audio segments into browser storage (IndexedDB) for uninterrupted listening during network drops.',
    cachedTime: 'CACHED BUFFER TIME',
    indexedSegments: 'INDEXED SEGMENTS',
    bufferHealth: 'BUFFER HEALTH',
    preBufferBtn: 'Pre-buffer Next 30 min',
    preBuffering: 'Caching Segments...',
    clearCacheBtn: 'Clear Storage Cache',
    simulateOfflineMode: 'Simulate Offline Mode (Airplane/Subway)',
    offlineActiveNotice: 'Offline Mode Active: Serving exclusively from IndexedDB local storage.',
    onlineNotice: 'Network Connected: Real-time streaming and synchronization active.',
    testAudioEngine: 'Test Audio Engine Fallback',

    // Station Directory
    directoryTitle: 'South Korean Broadcaster Relays & Transmitter Sites',
    directoryDesc: 'Key FM radio channels originating from N Seoul Tower (Namsan) and Mount Gwanak.',
    tuneInStation: 'Tune In →',

    // Admin Modal
    adminTitle: 'Custom Schedule Builder (1-Hour Intervals)',
    adminSubtitle: 'Each 1-hour block (60 min) can be mapped to different Seoul station relays or custom streams.',
    adminSlotsCount: '24 HOURLY SLOTS',
    inspectNotice: 'Click any hour below to inspect & customize',
    selectedInterval: '1-Hour Interval • 60 Minutes',
    previewAudio: 'Preview Audio',
    relaySourceStation: 'RELAY SOURCE STATION',
    showTitleKo: 'SHOW TITLE (KOREAN)',
    showTitleEn: 'SHOW TITLE (ENGLISH)',
    djName: 'DJ / HOST NAME',
    genreLabel: 'GENRE / SOUND SIGNATURE',
    descLabel: 'DESCRIPTION / SEGMENT NOTES',
    quickRangeTitle: 'QUICK RANGE TOOL: BATCH ASSIGN 1-HOUR INTERVALS',
    fromHour: 'From Hour:',
    toHour: 'to',
    assignStation: 'assign station:',
    applyRangeBtn: 'Apply to Range',
    showingIntervals: 'Showing 1-hour intervals',
    resetDefaultBtn: 'Reset to Standard 24-Hour Lineup',
    cancelBtn: 'Cancel',
    saveScheduleBtn: 'Save 24-Hour Schedule',
    savingBtn: 'Saving...',
    savedSuccess: 'Saved 24-Hour Schedule!',

    // Help Modal
    helpTitle: 'How Time-Shift Radio Works',
    helpP1: 'The Concept: California (PDT) is 16 hours behind South Korea (KST). If you listen to live Seoul radio at 7:00 AM California time, Seoul is already at 11:00 PM late night!',
    helpP2: 'The Time-Shift Solution: Our backend buffers, indexes, and replays South Korean live broadcasts so that at 7:00 AM in California, you hear what aired at 7:00 AM in Seoul on 91.9 MHz (e.g., Good Morning FM Tei with Seoul rush hour commute talk).',
    helpBullet1: 'Live Synchronized: 1:1 match of your local hour to Seoul broadcast hour.',
    helpBullet2: 'Timeline Scrubber: Jump to any hour of the day (lunch, evening commute, late night).',
    helpBullet3: 'Offline Caching: Pre-buffers chunks in browser IndexedDB for subway/offline listening.',
    helpBullet4: 'Custom Schedule Builder: Admin can mix different stations into custom 1-hour time slots.',
    helpCloseBtn: 'Got It, Tune In!',

    // Footer
    footerTitle: 'TimeShift Radio Engine • Seoul 91.9 MHz MBC FM4U / KBS 89.1 / SBS 107.7 Relay',
    footerStatus: 'Buffered Audio Index Active'
  },
  ko: {
    // Brand & Header
    appTitle: '타임시프트 라디오',
    appBadge: '서울 91.9 FM',
    appSubtitle: '캘리포니아 ↔ 서울 가상 시차 방송 재송출 시스템',
    delayNotice: '시차 버퍼',
    liveSyncActive: '실시간 동기화 활성',
    shiftedNotice: '시간 이동',
    howItWorksBtn: '이용 안내',
    customScheduleBtn: '맞춤 편성표 설정',

    // Navigation Tabs
    tabEpg: '24시간 방송 편성표 (EPG)',
    tabOffline: '오프라인 캐싱 & 네트워크 복원력',
    tabStations: '서울 라디오 방송국 목록 & 중계소',

    // Radio Tuner
    onAir: '방송중',
    standby: '대기중',
    currentBroadcast: '현재 송출 프로그램',
    tunerFreq: '주파수',
    stereoFmHighQ: '스테레오 FM 고음질',
    fmTuningDial: 'FM 튜닝 다이얼',
    presets: '프리셋 채널',
    spectrumAnalyzer: '오디오 스펙트럼 분석기',
    jingleBtn: '방송 시그널 (징글)',
    pipsBtn: '정각 시보음',
    startBroadcast: '라디오 재생 시작',
    pauseBroadcast: '방송 일시정지',
    volume: '볼륨',
    nowPlayingShow: '현재 방송 프로그램',
    liveSeoulSource: '서울 91.9 MHz 남산송신소 정규 송출원',

    // TimeShift Controls
    timeShiftEngine: '타임시프트 & 시차 엔진',
    timeShiftDesc: '한국 FM 방송을 버퍼링하여 캘리포니아 아침 7시에 서울의 아침 7시 출근길 방송이 그대로 재생됩니다.',
    yourLocalTime: '청취자 현지 시각',
    listenerClock: '청취자 시계',
    seoulBroadcastSlot: '서울 방송 시간대',
    onAirNow: '재송출 중인 방송',
    liveSeoulTime: '실시간 서울 현지 시각',
    bufferDelay: '버퍼 지연 시차',
    timezoneLabel: '청취자 현지 시간대:',
    liveSyncButtonOn: '실시간 동기화: 켜짐',
    liveSyncButtonOff: '수동 시간 이동 모드',
    jumpLocalTime: '현재 현지 시각으로 복귀',
    timelineHeader: '24시간 방송 타임라인 (서울 기준)',
    timelineSub: '아래 시간을 클릭하면 해당 서울 방송 시간대로 즉시 이동합니다',
    morningCommute: '07:00 아침 출근길',
    noonLunch: '12:00 정오 희망곡',
    eveningDrive: '18:00 저녁 퇴근길 음악캠프',
    starryNight: '22:00 별이 빛나는 밤에',

    // EPG
    epgTitle: '24시간 방송 편성표 (EPG)',
    epgDesc: '청취자의 현지 시각과 서울 한국표준시(KST) 방송 시간대를 비교 확인하세요.',
    localTimeCol: '청취자 현지 시각',
    seoulTimeCol: '서울 본방송 시각 (KST)',
    stationCol: '중계 방송국',
    programCol: '프로그램명 및 진행자',
    djCol: '진행자 (DJ)',
    actionCol: '청취',
    nowAiringBadge: '현재 방송중',
    tuneInBtn: '청취하기',
    playingBadge: '재생중',
    filterAll: '전체 시간',
    filterMorning: '오전 (06-12시)',
    filterAfternoon: '오후 (12-18시)',
    filterEvening: '저녁 (18-22시)',
    filterNight: '심야 (22-06시)',

    // Offline Manager
    offlineTitle: '오프라인 방송 캐시 & 네트워크 복원력',
    offlineDesc: '네트워크가 끊기거나 지하철 구간에서도 끊김 없이 청취할 수 있도록 오디오 세그먼트를 브라우저(IndexedDB)에 미리 저장합니다.',
    cachedTime: '캐시된 버퍼 시간',
    indexedSegments: '저장된 세그먼트',
    bufferHealth: '버퍼 무결성',
    preBufferBtn: '다음 30분 구간 사전 캐시',
    preBuffering: '세그먼트 캐싱 중...',
    clearCacheBtn: '캐시 저장소 비우기',
    simulateOfflineMode: '오프라인 모드 시뮬레이션 (비행기/지하철 모드)',
    offlineActiveNotice: '오프라인 모드 활성: 로컬 IndexedDB 캐시에서만 음원이 재생됩니다.',
    onlineNotice: '네트워크 연결됨: 실시간 스트리밍 및 동기화 작동 중.',
    testAudioEngine: '오디오 엔진 대체 작동 테스트',

    // Station Directory
    directoryTitle: '대한민국 대표 FM 방송국 & 송신소 목록',
    directoryDesc: '남산 서울타워 및 관악산 송신소에서 송출되는 주요 FM 라디오 채널입니다.',
    tuneInStation: '채널 맞추기 →',

    // Admin Modal
    adminTitle: '맞춤 편성표 설정기 (1시간 단위)',
    adminSubtitle: '24시간 각 1시간 블록(60분)을 서로 다른 서울 방송국 릴레이 또는 스트림으로 자유롭게 배치할 수 있습니다.',
    adminSlotsCount: '24개 1시간 슬롯',
    inspectNotice: '아래 시간 버튼을 클릭하여 해당 시간대 편성을 편집하세요',
    selectedInterval: '1시간 단위 • 60분',
    previewAudio: '음원 미리듣기',
    relaySourceStation: '중계 소스 방송국',
    showTitleKo: '프로그램명 (한국어)',
    showTitleEn: '프로그램명 (영어)',
    djName: '진행자 / DJ',
    genreLabel: '장르 / 사운드 특징',
    descLabel: '프로그램 소개 / 세그먼트 메모',
    quickRangeTitle: '구간 일괄 설정 도구: 여러 1시간 슬롯 한 번에 변경',
    fromHour: '시작 시간:',
    toHour: '종료 시간:',
    assignStation: '지정할 방송국:',
    applyRangeBtn: '구간 일괄 적용',
    showingIntervals: '1시간 단위 슬롯 표시 중',
    resetDefaultBtn: '표준 24시간 편성표로 초기화',
    cancelBtn: '취소',
    saveScheduleBtn: '24시간 편성표 저장',
    savingBtn: '저장 중...',
    savedSuccess: '24시간 편성표가 저장되었습니다!',

    // Help Modal
    helpTitle: '타임시프트 라디오 작동 원리',
    helpP1: '개념: 캘리포니아(PDT)는 한국(KST)보다 16시간 느립니다. 캘리포니아 오전 7시에 실시간 서울 라디오를 들으면 서울은 이미 밤 11시 심야 방송이 나옵니다.',
    helpP2: '타임시프트 해결책: 서울의 실시간 방송 스트림을 백엔드에서 캡처·버퍼링하여 캘리포니아 오전 7시에 서울의 아침 7시 출근길 방송(MBC 91.9MHz 굿모닝FM 테이 등)을 현지 시간에 맞춰 그대로 들려줍니다.',
    helpBullet1: '실시간 동기화: 현지 시각과 서울 방송 시각을 1:1로 정확하게 일치시킵니다.',
    helpBullet2: '타임라인 스크러버: 점심시간, 퇴근길, 심야 별밤 등 원하는 시간대를 자유롭게 탐색할 수 있습니다.',
    helpBullet3: '오프라인 캐싱: 지하철이나 통신 불안정 구간을 위해 IndexedDB에 음원을 미리 버퍼링합니다.',
    helpBullet4: '맞춤 편성표: 관리자가 1시간 단위로 다양한 방송국을 믹스하여 맞춤 채널을 구성할 수 있습니다.',
    helpCloseBtn: '확인, 라디오 듣기',

    // Footer
    footerTitle: '타임시프트 라디오 엔진 • 서울 91.9 MHz MBC FM4U / KBS 89.1 / SBS 107.7 릴레이',
    footerStatus: '오디오 버퍼 인덱스 정상 작동중'
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('timeshift_radio_language');
      if (saved === 'ko' || saved === 'en') return saved;
      // Detect browser language
      if (navigator.language.toLowerCase().startsWith('ko')) return 'ko';
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('timeshift_radio_language', lang);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ko' : 'en');
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t: TRANSLATIONS[language]
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
