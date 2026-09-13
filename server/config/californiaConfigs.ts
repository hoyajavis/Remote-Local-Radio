import { StationArchiveConfig } from './types.js';

export const CALIFORNIA_ARCHIVE_CONFIGS: Record<string, StationArchiveConfig> = {
  "kqei-893": {
    "name": "KQEI 89.3 FM (KQED Monterey Bay)",
    "nameKo": "KQEI 89.3 (KQED 몬터레이)",
    "defaultDj": "KQED Newsroom",
    "liveStreamUrl": "https://streams.kqed.org/kqedradio",
    "primaryFeedUrl": "https://feeds.megaphone.fm/KQINC5002818583",
    "shows": [
      {
        "startHour": 0,
        "endHour": 6,
        "title": "KQED Late Night Public Radio",
        "titleKo": "KQED 심야 공영 라디오 (00:00)",
        "dj": "KQED Host",
        "feedUrl": "https://feeds.npr.org/500005/podcast.xml"
      },
      {
        "startHour": 6,
        "endHour": 10,
        "title": "The California Report & Morning Drive",
        "titleKo": "캘리포니아 리포트 & 모닝 드라이브 (06:00)",
        "dj": "Saul Gonzalez",
        "feedUrl": "https://feeds.megaphone.fm/KQINC5002818583"
      },
      {
        "startHour": 10,
        "endHour": 14,
        "title": "KQED Forum with Alexis Madrigal",
        "titleKo": "포럼 알렉시스 마드리갈 (10:00)",
        "dj": "Alexis Madrigal",
        "feedUrl": "https://feeds.megaphone.fm/KQINC9557381633"
      },
      {
        "startHour": 14,
        "endHour": 18,
        "title": "NPR Planet Money on KQED",
        "titleKo": "플래닛 머니 & 캘리포니아 리포트 (14:00)",
        "dj": "NPR Hosts",
        "feedUrl": "https://feeds.npr.org/510289/podcast.xml"
      },
      {
        "startHour": 18,
        "endHour": 24,
        "title": "Wait Wait... Don-t Tell Me! & Evening Edition",
        "titleKo": "웨이트 웨이트 돈텔미 & 저녁 라디오 (18:00)",
        "dj": "Peter Sagal",
        "feedUrl": "https://feeds.npr.org/344098539/podcast.xml"
      }
    ]
  },
  "kazu-903": {
    "name": "KAZU 90.3 FM (Monterey Bay NPR)",
    "nameKo": "KAZU 90.3 (NPR 몬터레이)",
    "defaultDj": "NPR Host",
    "liveStreamUrl": "https://kazu.streamguys1.com/kazu.mp3",
    "primaryFeedUrl": "https://feeds.npr.org/510318/podcast.xml",
    "shows": [
      {
        "startHour": 0,
        "endHour": 6,
        "title": "NPR Overnight BBC World Service",
        "titleKo": "NPR 심야 BBC 월드 서비스 (00:00)",
        "dj": "BBC News",
        "feedUrl": "https://feeds.npr.org/500005/podcast.xml"
      },
      {
        "startHour": 6,
        "endHour": 12,
        "title": "NPR Morning Edition & Up First",
        "titleKo": "모닝 에디션 & 몬터레이 로컬 리포트 (06:00)",
        "dj": "Michel Martin & Steve Inskeep",
        "feedUrl": "https://feeds.npr.org/510318/podcast.xml"
      },
      {
        "startHour": 12,
        "endHour": 16,
        "title": "KQED Forum with Alexis Madrigal",
        "titleKo": "포럼 알렉시스 마드리갈 (12:00)",
        "dj": "Alexis Madrigal",
        "feedUrl": "https://feeds.megaphone.fm/KQINC9557381633"
      },
      {
        "startHour": 16,
        "endHour": 20,
        "title": "All Things Considered & The Indicator",
        "titleKo": "올 띵스 컨시더드 & 디 인디케이터 (16:00)",
        "dj": "Ailsa Chang & Mary Louise Kelly",
        "feedUrl": "https://feeds.npr.org/510325/podcast.xml"
      },
      {
        "startHour": 20,
        "endHour": 24,
        "title": "NPR News Now & Evening Jazz on KAZU",
        "titleKo": "마켓플레이스 & 저녁 재즈 (20:00)",
        "dj": "Kai Ryssdal",
        "feedUrl": "https://feeds.npr.org/500005/podcast.xml"
      }
    ]
  },
  "ksqd-907": {
    "name": "KSQD 90.7 FM (Central Coast)",
    "nameKo": "KSQD 90.7 (\"K-Squid\")",
    "defaultDj": "KSQD Host",
    "liveStreamUrl": "https://ksqd.info:8100/stream",
    "primaryFeedUrl": "https://ksqd.org/feed/podcast/talk-of-the-bay/",
    "shows": [
      {
        "startHour": 0,
        "endHour": 6,
        "title": "Pacific Coast Overnight Soundscapes",
        "titleKo": "태평양 심야 인디 & 앰비언트 (00:00)",
        "dj": "KSQD Volunteer DJs",
        "feedUrl": "https://ksqd.org/feed/podcast/talk-of-the-bay/"
      },
      {
        "startHour": 6,
        "endHour": 10,
        "title": "Talk of the Bay: Morning Edition",
        "titleKo": "토크 오브 더 베이 (몬터레이 베이 아침 07:00)",
        "dj": "Rachel Anne Goodman",
        "feedUrl": "https://ksqd.org/feed/podcast/talk-of-the-bay/"
      },
      {
        "startHour": 10,
        "endHour": 14,
        "title": "Exploring Monterey Bay & Local Ecology",
        "titleKo": "익스플로링 몬터레이 베이 (12:00)",
        "dj": "Mathias Bjoern",
        "feedUrl": "https://ksqd.org/feed/podcast/exploring-monterey-bay/"
      },
      {
        "startHour": 14,
        "endHour": 18,
        "title": "Central Coast Afternoon Grooves",
        "titleKo": "센트럴 코스트 오후 블루스 & 포크 (14:00)",
        "dj": "KSQD Music Curators",
        "feedUrl": "https://ksqd.org/feed/podcast/ksqd-talks-music/"
      },
      {
        "startHour": 18,
        "endHour": 24,
        "title": "What a Week on the Central Coast",
        "titleKo": "왓 어 위크 (센트럴 코스트 저녁 18:00)",
        "dj": "KSQD News Team",
        "feedUrl": "https://ksqd.org/feed/podcast/what-a-week/"
      }
    ]
  },
  "kwav-969": {
    "name": "KWAV 96.9 FM (\"K-Wave\")",
    "nameKo": "KWAV 96.9 (\"K-Wave\")",
    "defaultDj": "Jeff & Amanda",
    "liveStreamUrl": "https://ice9.securenetsystems.net/KWAV",
    "shows": [
      {
        "startHour": 0,
        "endHour": 6,
        "title": "KWAV Overnight Pop & Soft Hits",
        "titleKo": "심야 팝 & 소프트 히트 (00:00)",
        "dj": "KWAV Music Staff"
      },
      {
        "startHour": 6,
        "endHour": 10,
        "title": "The Morning Wave with Jeff & Amanda",
        "titleKo": "더 모닝 웨이브 (06:00)",
        "dj": "Jeff & Amanda"
      },
      {
        "startHour": 10,
        "endHour": 15,
        "title": "Monterey Midday Workday Mix",
        "titleKo": "몬터레이 미드데이 워크데이 믹스 (10:00)",
        "dj": "Danielle"
      },
      {
        "startHour": 15,
        "endHour": 19,
        "title": "The Afternoon Drive Home",
        "titleKo": "애프터눈 드라이브 홈 (15:00)",
        "dj": "Mark Roberts"
      },
      {
        "startHour": 19,
        "endHour": 24,
        "title": "80s, 90s & Today Monterey Evening Hits",
        "titleKo": "몬터레이 이브닝 팝 (19:00)",
        "dj": "KWAV On-Air"
      }
    ]
  },
  "kdon-1025": {
    "name": "KDON 102.5 FM",
    "nameKo": "KDON 102.5 (Top 40 히트)",
    "defaultDj": "Showbiz & The Crew",
    "liveStreamUrl": "https://stream.revma.ihrhls.com/zc2930",
    "shows": [
      {
        "startHour": 0,
        "endHour": 6,
        "title": "Club 102.5 Overnight Dance & Pop",
        "titleKo": "클럽 102.5 심야 댄스 & 팝 (00:00)",
        "dj": "DJ E-Rock"
      },
      {
        "startHour": 6,
        "endHour": 10,
        "title": "KDON Morning Madness",
        "titleKo": "KDON 모닝 매드니스 (06:00)",
        "dj": "Showbiz & The Crew"
      },
      {
        "startHour": 10,
        "endHour": 15,
        "title": "Central Coast Non-Stop Hits",
        "titleKo": "센트럴 코스트 논스톱 히트 (10:00)",
        "dj": "KDON On-Air"
      },
      {
        "startHour": 15,
        "endHour": 19,
        "title": "The 5 O Clock Traffic Jam on KDON",
        "titleKo": "5시 트래픽 잼 (15:00)",
        "dj": "DJ Jammer"
      },
      {
        "startHour": 19,
        "endHour": 24,
        "title": "Top 40 Hot Hits & Chart Countdown",
        "titleKo": "빌보드 Top 40 카운트다운 (19:00)",
        "dj": "Ryan Seacrest"
      }
    ]
  },
  "kocn-1051": {
    "name": "KOCN 105.1 FM (\"K-Ocean\")",
    "nameKo": "KOCN 105.1 (\"K-Ocean\")",
    "defaultDj": "Tony B",
    "liveStreamUrl": "https://stream.revma.ihrhls.com/zc3639",
    "shows": [
      {
        "startHour": 0,
        "endHour": 6,
        "title": "Midnight Slow Jams & Quiet Storm",
        "titleKo": "심야 슬로우 잼 & 소울 (00:00)",
        "dj": "R-Dub"
      },
      {
        "startHour": 6,
        "endHour": 10,
        "title": "The Morning Oldies Drive",
        "titleKo": "모닝 올디스 드라이브 (06:00)",
        "dj": "K-Ocean Morning Crew"
      },
      {
        "startHour": 10,
        "endHour": 15,
        "title": "Throwback 90s & 2000s R&B Classics",
        "titleKo": "90년대 & 2000년대 R&B 클래식 (10:00)",
        "dj": "K-Ocean Host"
      },
      {
        "startHour": 15,
        "endHour": 19,
        "title": "Pacific Grove Funk & Old School Jam",
        "titleKo": "퍼시픽 그로브 훵크 & 올드스쿨 (15:00)",
        "dj": "Tony B"
      },
      {
        "startHour": 19,
        "endHour": 24,
        "title": "Monterey Coastal R&B Evenings",
        "titleKo": "몬터레이 코스탈 R&B 이브닝 (19:00)",
        "dj": "K-Ocean Host"
      }
    ]
  },
  "ktom-927": {
    "name": "KTOM 92.7 FM",
    "nameKo": "KTOM 92.7 (컨트리)",
    "defaultDj": "Bobby Bones",
    "liveStreamUrl": "https://stream.revma.ihrhls.com/zc2934",
    "shows": [
      {
        "startHour": 0,
        "endHour": 6,
        "title": "Overnight Country Roads & Modern Hits",
        "titleKo": "심야 컨트리 로드 & 최신 히트 (00:00)",
        "dj": "After MidNite"
      },
      {
        "startHour": 6,
        "endHour": 10,
        "title": "The Bobby Bones Morning Show",
        "titleKo": "바비 본즈 모닝 쇼 (06:00)",
        "dj": "Bobby Bones"
      },
      {
        "startHour": 10,
        "endHour": 15,
        "title": "Salinas Valley Country Workday",
        "titleKo": "살리나스 밸리 컨트리 워크데이 (10:00)",
        "dj": "Cody Alan"
      },
      {
        "startHour": 15,
        "endHour": 19,
        "title": "The Country Drive Home with West",
        "titleKo": "애프터눈 컨트리 드라이브 (15:00)",
        "dj": "Justin West"
      },
      {
        "startHour": 19,
        "endHour": 24,
        "title": "Nights with Sam Alex & Modern Country",
        "titleKo": "나이츠 위드 샘 알렉스 (19:00)",
        "dj": "Sam Alex"
      }
    ]
  },
  "kdfc-899": {
    "name": "KDFC 89.9 / 90.9 FM (Classical)",
    "nameKo": "KDFC 89.9 (북캘리포니아 클래식)",
    "defaultDj": "Ray White",
    "liveStreamUrl": "http://14923.live.streamtheworld.com/KDFCFM5_SC",
    "shows": [
      {
        "startHour": 0,
        "endHour": 6,
        "title": "Nocturne Classical & Pacific Starlight",
        "titleKo": "심야 녹턴 클래식 & 별빛 음악 (00:00)",
        "dj": "Hoyt Smith"
      },
      {
        "startHour": 6,
        "endHour": 10,
        "title": "Classical California Morning Drive",
        "titleKo": "클래식 캘리포니아 모닝 드라이브 (06:00)",
        "dj": "Ray White"
      },
      {
        "startHour": 10,
        "endHour": 15,
        "title": "Midday Masterpieces & Symphonies",
        "titleKo": "미드데이 마스터피스 & 교향곡 (10:00)",
        "dj": "Dianne Nicolini"
      },
      {
        "startHour": 15,
        "endHour": 19,
        "title": "Highway 1 Afternoon Classical Serenade",
        "titleKo": "1번 국도 오후 클래식 세레나데 (15:00)",
        "dj": "Rik Malone"
      },
      {
        "startHour": 19,
        "endHour": 24,
        "title": "San Francisco Symphony Broadcast & Evening Concert",
        "titleKo": "샌프란시스코 심포니 콘서트 (19:00)",
        "dj": "KDFC Hosts"
      }
    ]
  },
  "kpig-1075": {
    "name": "KPIG 107.5 FM (\"K-PIG\")",
    "nameKo": "KPIG 107.5 (\"K-PIG\")",
    "defaultDj": "Uncle Sherman",
    "isPaywalled": true,
    "paywallNotice": "KPIG 107.5 Freedom, CA requires an official Pig Pen subscription at kpig.com/listen",
    "shows": [
      {
        "startHour": 0,
        "endHour": 6,
        "title": "Overnight Sty Sounds & Classic Blues",
        "titleKo": "심야 블루스 & 포크 (00:00)",
        "dj": "The Pig Crew"
      },
      {
        "startHour": 6,
        "endHour": 10,
        "title": "Waking Up with the Hog Call",
        "titleKo": "웨이킹 업 위드 호그 콜 (06:00)",
        "dj": "Uncle Sherman & Charly"
      },
      {
        "startHour": 10,
        "endHour": 15,
        "title": "Live Studio In-House Americana",
        "titleKo": "라이브 스튜디오 아메리카나 (10:00)",
        "dj": "Laura Ellen"
      },
      {
        "startHour": 15,
        "endHour": 19,
        "title": "Freedom Coast Country Blues",
        "titleKo": "프리덤 코스트 컨트리 블루스 (15:00)",
        "dj": "Dallas"
      },
      {
        "startHour": 19,
        "endHour": 24,
        "title": "Sleepy John Folk & Roots Revival",
        "titleKo": "슬리피 존의 포크 & 루츠 (19:00)",
        "dj": "Sleepy John"
      }
    ]
  },
  "kzsc-881": {
    "name": "KZSC 88.1 FM (UC Santa Cruz)",
    "nameKo": "KZSC 88.1 (UC 산타크루즈)",
    "defaultDj": "KZSC Student DJs",
    "liveStreamUrl": "https://kzscfms1-geckohost.radioca.st/kzschigh",
    "shows": [
      {
        "startHour": 0,
        "endHour": 6,
        "title": "Overnight Slug Soundscapes",
        "titleKo": "UC 산타크루즈 심야 인디 (00:00)",
        "dj": "KZSC Slugs"
      },
      {
        "startHour": 6,
        "endHour": 12,
        "title": "The Morning Wake Up & Indie Currents",
        "titleKo": "모닝 웨이크업 & 산타크루즈 인디 (07:00)",
        "dj": "KZSC Crew"
      },
      {
        "startHour": 12,
        "endHour": 18,
        "title": "Redwood Forest Jazz & Global Grooves",
        "titleKo": "레드우드 숲 재즈 & 글로벌 그루브 (12:00)",
        "dj": "KZSC Curators"
      },
      {
        "startHour": 18,
        "endHour": 24,
        "title": "Pacific Waves College Underground",
        "titleKo": "퍼시픽 웨이브 언더그라운드 록 (18:00)",
        "dj": "KZSC Student DJs"
      }
    ]
  },
  "smoothjazz-100": {
    "name": "SmoothJazz.com (Carmel-by-the-Sea)",
    "nameKo": "스무스재즈 닷컴 (카멜)",
    "defaultDj": "Sandy Shore",
    "liveStreamUrl": "https://smoothjazz.cdnstream1.com/2585_128.mp3",
    "shows": [
      {
        "startHour": 0,
        "endHour": 6,
        "title": "Late Night Carmel Chill & Lounge",
        "titleKo": "카멜 베이 심야 라운지 재즈 (00:00)",
        "dj": "Sandy Shore"
      },
      {
        "startHour": 6,
        "endHour": 12,
        "title": "Morning Coastal Breeze & Smooth Jazz",
        "titleKo": "모닝 코스탈 브리즈 & 스무스 재즈 (07:00)",
        "dj": "Sandy Shore"
      },
      {
        "startHour": 12,
        "endHour": 18,
        "title": "Highway 1 Afternoon Acoustic Drive",
        "titleKo": "1번 국도 오후 어쿠스틱 드라이브 (12:00)",
        "dj": "Sandy Shore"
      },
      {
        "startHour": 18,
        "endHour": 24,
        "title": "Monterey Peninsula Sunset Sessions",
        "titleKo": "몬터레이 선셋 세션 (18:00)",
        "dj": "Sandy Shore"
      }
    ]
  }
};
