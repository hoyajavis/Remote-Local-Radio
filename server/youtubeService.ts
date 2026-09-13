/**
 * YouTube Visible Radio Service
 * 
 * Fetches and caches verified full-show broadcast VODs for Korean terrestrial stations
 * (MBC 봉춘라디오, SBS 에라오, KBS CoolFM) using YouTube's public XML feeds (zero API keys or quotas needed).
 */

interface ChannelConfig {
  channelId: string;
  name: string;
  fallbackVideoId: string;
  preferFull?: boolean;
}

const BROADCASTER_CHANNELS: Record<string, ChannelConfig> = {
  'mbc-919': {
    channelId: 'UCKNZsAeQXpvI-Mpoc0ZKhsA',
    name: 'MBC 봉춘라디오',
    fallbackVideoId: 'kj7-HW52euI', // [FULL] 별이 빛나는 밤에
    preferFull: true
  },
  'sbs-1077': {
    channelId: 'UCAmff0euQRf6RwVlbB8PLMw',
    name: 'SBS Radio 에라오',
    fallbackVideoId: 'BB_j70BxfWA', // [FULL] 두시탈출 컬투쇼
    preferFull: true
  },
  'kbs-891': {
    channelId: 'UCbVRtqsTmYh1xhrDSTfSQLg',
    name: 'KBS CoolFM',
    fallbackVideoId: 'oPA3CDfPs3I', // [FULL] 미스터라디오 full ver.
    preferFull: true
  }
};

interface CacheEntry {
  videoId: string;
  isLiveStream: boolean;
  timestamp: number;
}

const LIVE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes for live streams
const VOD_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours for archive VODs
const vodCache = new Map<string, CacheEntry>();

export interface VisibleRadioResult {
  videoId: string;
  isLiveStream: boolean;
}

/**
 * Resolves the freshest verified Visible Radio stream for a given station.
 * Prioritizes active live broadcasts for zero-offset live listeners,
 * and genuine full-length show VODs for time-shifted listeners.
 * Returns undefined for audio-only stations.
 */
export async function getVisibleRadioVOD(
  stationId: string,
  isLiveOnAir: boolean = false
): Promise<VisibleRadioResult | undefined> {
  const config = BROADCASTER_CHANNELS[stationId];
  if (!config) {
    // Audio-only station (TBS, CBS, EBS, KAZU, KSQD, KQEI, KZSC, etc.)
    return undefined;
  }

  const now = Date.now();

  // 1. If currently Live On-Air, query YouTube /live endpoint first!
  if (isLiveOnAir) {
    const liveCacheKey = `${stationId}:live`;
    const cachedLive = vodCache.get(liveCacheKey);
    if (cachedLive && now - cachedLive.timestamp < LIVE_CACHE_TTL_MS) {
      return { videoId: cachedLive.videoId, isLiveStream: true };
    }

    try {
      const liveUrl = `https://www.youtube.com/channel/${config.channelId}/live`;
      const liveRes = await fetch(liveUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
        }
      });

      if (liveRes.ok) {
        const html = await liveRes.text();
        const vidMatch = html.match(/"videoId":"([^"]+)"/);
        const isLive = html.includes('"isLive":true') || html.includes('"status":"LIVE"');

        if (vidMatch && isLive) {
          const liveVideoId = vidMatch[1].trim();
          vodCache.set(liveCacheKey, {
            videoId: liveVideoId,
            isLiveStream: true,
            timestamp: now
          });
          console.log(`[YouTubeService] Detected active LIVE stream for ${config.name}: ${liveVideoId}`);
          return { videoId: liveVideoId, isLiveStream: true };
        }
      }
    } catch (err: any) {
      console.warn(`[YouTubeService] Live check error for ${config.name}: ${err?.message}`);
    }
  }

  // 2. VOD Archive Resolution: find genuine full-show VOD (exclude 60-second shorts and clips)
  const vodCacheKey = `${stationId}:vod`;
  const cachedVod = vodCache.get(vodCacheKey);
  if (cachedVod && now - cachedVod.timestamp < VOD_CACHE_TTL_MS) {
    return { videoId: cachedVod.videoId, isLiveStream: false };
  }

  try {
    const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${config.channelId}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)'
      }
    });

    if (!res.ok) {
      console.warn(`[YouTubeService] Feed fetch error (${res.status}) for ${config.name}, using fallback.`);
      return { videoId: config.fallbackVideoId, isLiveStream: false };
    }

    const xml = await res.text();
    const entries = xml.split('<entry>').slice(1);

    let selectedVideoId = '';

    for (const entry of entries) {
      const vidMatch = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
      const titleMatch = entry.match(/<title>(.*?)<\/title>/);
      if (!vidMatch) continue;

      const vid = vidMatch[1].trim();
      const title = titleMatch ? titleMatch[1].trim() : '';

      // Strictly skip YouTube Shorts and short clips
      if (
        title.includes('#Shorts') ||
        title.includes('#shorts') ||
        title.includes('#Short') ||
        title.startsWith('[쇼츠]') ||
        title.startsWith('[Shorts]') ||
        title.includes('하이라이트')
      ) {
        continue;
      }

      // Match full episode VODs
      const isFull =
        title.toUpperCase().includes('FULL') ||
        title.toLowerCase().includes('full ver') ||
        title.includes('다시보기') ||
        title.includes('풀버전') ||
        title.includes('보이는 라디오') ||
        title.includes('보는 라디오');

      if (isFull) {
        selectedVideoId = vid;
        break;
      }
    }

    // If no full show was in the latest uploads, use verified full-show fallback (never a short clip!)
    const finalVideoId = selectedVideoId || config.fallbackVideoId;
    vodCache.set(vodCacheKey, {
      videoId: finalVideoId,
      isLiveStream: false,
      timestamp: now
    });

    console.log(`[YouTubeService] Resolved VOD for ${config.name}: ${finalVideoId}`);
    return { videoId: finalVideoId, isLiveStream: false };
  } catch (err: any) {
    console.warn(`[YouTubeService] Error resolving ${config.name}: ${err?.message}, using fallback.`);
    return { videoId: config.fallbackVideoId, isLiveStream: false };
  }
}
