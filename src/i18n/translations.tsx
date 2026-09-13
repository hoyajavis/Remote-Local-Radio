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
  audioDisplayTitle: string;
  displayModeLcd: string;
  displayModeVfd: string;
  camEffectTitle: string;
  camEffectClean: string;
  camEffectTft: string;
  camEffectComposite: string;
  camEffectOsd: string;
  camEffectOff: string;
  audioEffectTitle: string;
  audioEffectClean: string;
  audioEffectTube: string;
  audioEffectTabletop: string;
  audioEffectVintageAm: string;

  // Appliance UI & Two Bands
  bandSeoulTitle: string;
  bandSeoulSub: string;
  bandCaTitle: string;
  bandCaSub: string;
  weatherSeoul: string;
  weatherMonterey: string;
  yourLocationLabel: string;
  broadcastLocationLabel: string;
  studioCamOn: string;
  studioCamOff: string;
  studioCamUnavailable: string;
  studioCamOnAir: string;
  drawerSettings: string;
  closeDrawer: string;
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

    // Station Directory
    directoryTitle: 'South Korean Broadcaster Relays & Transmitter Sites',
    directoryDesc: 'Key FM radio channels originating from N Seoul Tower (Namsan) and Mount Gwanak.',
    tuneInStation: 'Tune In →',

    // Admin Modal
    adminTitle: 'Custom 24-Hour Schedule Builder',
    adminSubtitle: 'Configure each 1-hour interval (60 minutes) to mix different Seoul stations or audio relays throughout the day.',
    adminSlotsCount: '24 One-Hour Slots',
    inspectNotice: 'Click any hour button below to inspect and customize that broadcast slot',
    selectedInterval: '1-Hour Interval • 60 Minutes',
    previewAudio: 'Preview Audio Segment',
    relaySourceStation: 'Relay Source Station',
    showTitleKo: 'Show Title (Korean)',
    showTitleEn: 'Show Title (English)',
    djName: 'Host / DJ Name',
    genreLabel: 'Genre / Sound Style',
    descLabel: 'Program Summary / Segment Notes',
    quickRangeTitle: 'Quick Range Batch Fill: Set multiple 1-hour slots at once',
    fromHour: 'Start Hour:',
    toHour: 'End Hour:',
    assignStation: 'Assign Station:',
    applyRangeBtn: 'Apply Batch Range',
    showingIntervals: 'Displaying 1-Hour Intervals',
    resetDefaultBtn: 'Reset to Default 24h Grid',
    cancelBtn: 'Cancel',
    saveScheduleBtn: 'Save 24h Schedule',
    savingBtn: 'Saving...',
    savedSuccess: 'Saved 24-Hour Schedule!',

    // Help Modal
    helpTitle: 'How TimeShift Radio Works',
    helpP1: 'TimeShift Radio aligns international radio broadcasts with your local waking life. Instead of hearing late-night talk during your morning commute, you hear that station\'s actual morning show as if you were living there.',
    helpP2: 'Select between two regional bands using the switch at the top of the chassis:',
    helpBullet1: '🇰🇷 Seoul in USA: South Korean morning & evening FM broadcasts (MBC FM4U, KBS Cool FM, SBS Power FM, TBS) time-shifted across the 16-hour Pacific time gap.',
    helpBullet2: '🇺🇸 CA in Korea: California Central Coast & Monterey Bay radio (KAZU NPR, KQED, KDON Top 40, KOCN Oldies, KDFC Classical) playing live or time-aligned in Seoul.',
    helpBullet3: '📺 Studio Cam (보이는 라디오): Tap CAM to toggle synchronized studio video and VOD with sub-minute precision.',
    helpBullet4: '🎛️ Car Stereo Controls & Presets: Tap ◀ SEEK ▶ to browse stations. Press & hold any button 1–6 to save your current station, just like a car stereo.',
    helpCloseBtn: 'Got it, Back to Radio',

    // Footer
    footerTitle: 'TimeShift Radio Engine',
    footerStatus: 'Time-Shift Sync Active',
    audioDisplayTitle: 'AUDIO DISPLAY',
    displayModeLcd: '▣ Color TFT',
    displayModeVfd: '⚡ VFD Tube',
    camEffectTitle: 'CAM EFFECT LAB',
    camEffectClean: '1. Clean',
    camEffectTft: '2. TFT Matrix',
    camEffectComposite: '3. Composite',
    camEffectOsd: '4. Full OSD',
    camEffectOff: 'Off (Raw)',
    audioEffectTitle: 'AUDIO DSP',
    audioEffectClean: '1. Studio Hi-Fi',
    audioEffectTube: '2. Warm Tube',
    audioEffectTabletop: '3. Tabletop',
    audioEffectVintageAm: '4. Vintage AM',

    // Appliance UI & Two Bands
    bandSeoulTitle: 'Seoul in USA (서울의 소리)',
    bandSeoulSub: 'Korean morning & evening radio playing in your American timezone',
    bandCaTitle: 'California in Korea (캘리포니아 사운드)',
    bandCaSub: 'Monterey Bay & Central Coast local community radio playing in Seoul',
    weatherSeoul: 'Seoul: Clear 19°C (66°F) • Morning commute smooth',
    weatherMonterey: 'Monterey Bay: Foggy 58°F (14°C) • Coastal breeze & surf clear',
    yourLocationLabel: 'YOUR TIME',
    broadcastLocationLabel: 'BROADCAST TIME',
    studioCamOn: 'Studio Cam (보이는 라디오)',
    studioCamOff: 'Audio-Only Mode',
    studioCamUnavailable: 'Visible Radio Unavailable',
    studioCamOnAir: 'LIVE STUDIO VOD',
    drawerSettings: '24-Hour Schedule & Custom Settings',
    closeDrawer: 'Close Drawer'
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
    helpTitle: '타임시프트 라디오 이용 안내',
    helpP1: '타임시프트 라디오는 지구 반대편의 라디오 방송을 청취자의 현지 생활 리듬에 맞춰 시차를 조정해 주는 가상 시간대 라디오입니다. 아침 출근길에 심야 방송 대신, 현지에서 아침에 방송되는 출근길 프로그램을 실시간처럼 들을 수 있습니다.',
    helpP2: '상단 밴드 스위치를 통해 두 지역의 방송을 자유롭게 전환할 수 있습니다:',
    helpBullet1: '🇰🇷 서울의 소리 (Seoul in USA): 16시간 시차가 나는 미국 현지에서 한국의 아침·저녁 FM 생방송(MBC FM4U, KBS Cool FM, SBS Power FM, TBS)을 내 출퇴근 시간에 맞춰 청취합니다.',
    helpBullet2: '🇺🇸 캘리포니아 사운드 (CA in Korea): 캘리포니아 몬터레이 베이 및 센트럴 코스트 현지 방송(KAZU NPR, KQED, KDON Top 40, KOCN 올디스, KDFC 클래식)을 한국에서 청취합니다.',
    helpBullet3: '📺 보이는 라디오 (CAM): 영상 버튼을 눌러 스튜디오 생중계 및 VOD를 초 단위까지 정확하게 동기화하여 시청할 수 있습니다.',
    helpBullet4: '🎛️ 자동차 오디오 방식 조작: ◀ SEEK ▶ 버튼으로 전체 방송을 탐색하고, 마음에 드는 채널을 들으며 1~6번 버튼을 길게 누르면(Hold) 차량 오디오처럼 즉시 저장됩니다.',
    helpCloseBtn: '확인, 라디오로 돌아가기',

    // Footer
    footerTitle: '타임시프트 라디오 엔진',
    footerStatus: '시차 동기화 정상 작동중',
    audioDisplayTitle: '오디오 디스플레이',
    displayModeLcd: '▣ 컬러 TFT',
    displayModeVfd: '⚡ VFD 진공관',
    camEffectTitle: '캠 효과 테스트랩',
    camEffectClean: '1. 클린 아크릴',
    camEffectTft: '2. TFT 매트릭스',
    camEffectComposite: '3. 아날로그 컴포짓',
    camEffectOsd: '4. 풀 OSD',
    camEffectOff: '끄기 (원본)',
    audioEffectTitle: '음향 DSP',
    audioEffectClean: '1. 스튜디오 하이파이',
    audioEffectTube: '2. 진공관 FM',
    audioEffectTabletop: '3. 탁상용 라디오',
    audioEffectVintageAm: '4. 빈티지 AM',

    // Appliance UI & Two Bands
    bandSeoulTitle: '서울의 소리 (Seoul in USA)',
    bandSeoulSub: '미국 시차에 맞춰 서울의 아침·저녁 생방송을 현지 리듬으로 재생',
    bandCaTitle: '캘리포니아 사운드 (CA in Korea)',
    bandCaSub: '한국에서 몬터레이 베이·센트럴 코스트 현지 커뮤니티 라디오 청취',
    weatherSeoul: '서울: 맑음 19°C • 출근길 교통 원활',
    weatherMonterey: '몬터레이 베이: 안개 58°F (14°C) • 해안 바람 & 파도 양호',
    yourLocationLabel: '내 현재 시각',
    broadcastLocationLabel: '방송 현지 시각',
    studioCamOn: '보이는 라디오 (스튜디오 캠)',
    studioCamOff: '오디오 전용 모드',
    studioCamUnavailable: '보이는 라디오 미지원 방송',
    studioCamOnAir: '스튜디오 생중계 VOD',
    drawerSettings: '24시간 편성표 & 상세 설정',
    closeDrawer: '설정 서랍 닫기'
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
