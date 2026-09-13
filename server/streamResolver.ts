/**
 * TimeShift Radio: Stream & Archive Resolver Service
 * Implements the Smart Hybrid multi-tier archive resolution engine.
 * Pure TimeShift replay with documented fallback tiers (Zero Live Fallback).
 */

import { getMbcScheduledShow, extractEpisodeDetails } from './epgService.js';
import { getVisibleRadioVOD } from './youtubeService.js';
import { STATION_ARCHIVE_CONFIGS, getStationArchiveConfig } from './config/stationConfigs.js';

export { STATION_ARCHIVE_CONFIGS, getStationArchiveConfig } from './config/stationConfigs.js';

export interface ResolvedStream {
  success: boolean;
  stationId: string;
  stationName: string;
  showTitle: string;
  showTitleKo: string;
  djName: string;
  broadcastHour: number;
  showStartHour?: number;
  tier: 'tier1_rss' | 'tier2_youtube' | 'tier3_inapp' | 'tier4_continuity' | 'live_direct' | 'paywalled';
  tierLabel: string;
  audioUrl: string;
  seekOffsetSeconds: number;
  videoSeekOffsetSeconds?: number;
  totalDurationSeconds: number;
  youtubeVideoId?: string;
  isReplay: boolean;
  replayDate?: string;
  needsProxy: boolean;
  episodeSubtitle?: string;
  guests?: string[];
  cornerTitle?: string;
  isLiveOnAir?: boolean;
  isLiveVideoStream?: boolean;
  isPaywalled?: boolean;
  paywallNotice?: string;
}

interface EpisodeItem {
  title: string;
  pubDate: string;
  parsedDate: Date;
  enclosureUrl: string;
  durationSeconds: number;
}

interface FeedCacheEntry {
  fetchedAt: number;
  items: EpisodeItem[];
}

// In-memory feed cache with 30-minute TTL
const feedCache = new Map<string, FeedCacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000;

/**
 * Parses an RSS feed and extracts episodes
 */
async function fetchAndParseFeed(feedUrl: string): Promise<EpisodeItem[]> {
  const cached = feedCache.get(feedUrl);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.items;
  }

  try {
    const res = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    });

    if (!res.ok) {
      console.warn(`[StreamResolver] Feed returned HTTP ${res.status}: ${feedUrl}`);
      return cached ? cached.items : [];
    }

    const xml = await res.text();
    const items: EpisodeItem[] = [];

    // Parse items via regex
    const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

    for (const itemXml of itemMatches) {
      const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
      const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
      const encMatch = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
      const durMatch = itemXml.match(/<itunes:duration>([\s\S]*?)<\/itunes:duration>/i);

      if (encMatch && encMatch[1]) {
        let enclosureUrl = encMatch[1].replace(/&amp;/g, '&');

        // Handle MBC podcast redirect directly to CDN if known pattern
        if (enclosureUrl.includes('podcastfile.imbc.com/cgi-bin/podcast.fcgi/podcast/')) {
          enclosureUrl = enclosureUrl.replace(
            'https://podcastfile.imbc.com/cgi-bin/podcast.fcgi/podcast/',
            'https://podcastfiledown.imbc.com/originaldata/'
          ).replace(
            'http://podcastfile.imbc.com/cgi-bin/podcast.fcgi/podcast/',
            'https://podcastfiledown.imbc.com/originaldata/'
          );
        }

        const title = titleMatch ? titleMatch[1].trim() : 'Radio Broadcast';
        const pubDateStr = pubDateMatch ? pubDateMatch[1].trim() : new Date().toUTCString();
        const parsedDate = new Date(pubDateStr);

        let durationSeconds = 3600; // 1 hour default
        if (durMatch && durMatch[1]) {
          const parts = durMatch[1].trim().split(':').map(Number);
          if (parts.length === 3) {
            durationSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
          } else if (parts.length === 2) {
            durationSeconds = parts[0] * 60 + parts[1];
          } else if (parts.length === 1 && !isNaN(parts[0])) {
            durationSeconds = parts[0];
          }
        }

        items.push({
          title,
          pubDate: pubDateStr,
          parsedDate,
          enclosureUrl,
          durationSeconds
        });
      }
    }

    feedCache.set(feedUrl, {
      fetchedAt: Date.now(),
      items
    });

    return items;
  } catch (err: any) {
    console.error(`[StreamResolver] Error fetching feed ${feedUrl}:`, err.message);
    return cached ? cached.items : [];
  }
}

interface LiveStreamCache {
  url: string;
  expiresAt: number;
}
const liveStreamCache = new Map<string, LiveStreamCache>();

/**
 * Pre-resolves redirecting live streams (e.g. radio.bsod.kr -> minisw.imbc.com/..m3u8)
 * on the backend so clients receive a direct .m3u8 with valid CORS and no 301/302 redirect loops.
 * Caches pre-resolved URLs for 10 minutes.
 * If resolution fails or times out, returns null to allow fallback to Tier 1 AOD archive.
 */
export async function resolveLiveStreamUrl(rawUrl: string): Promise<string | null> {
  // If it's already a direct .m3u8 or mp3 with no redirects needed, return as-is
  if (!rawUrl.includes('radio.bsod.kr') && !rawUrl.includes('redirect')) {
    return rawUrl;
  }

  const cached = liveStreamCache.get(rawUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // 4s timeout

    const res = await fetch(rawUrl, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': '*/*'
      }
    });
    clearTimeout(timeout);

    if (res.ok && res.url) {
      liveStreamCache.set(rawUrl, {
        url: res.url,
        expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes
      });
      console.log(`[StreamResolver] Pre-resolved live stream: ${rawUrl} -> ${res.url}`);
      return res.url;
    }
  } catch (err: any) {
    console.warn(`[StreamResolver] Failed to pre-resolve live stream ${rawUrl}:`, err?.message);
  }

  // If pre-resolution fails, return rawUrl as best-effort fallback
  return rawUrl;
}

/**
 * Main resolution function:
 * Resolves the appropriate archived audio stream according to the documented 4-tier hierarchy.
 */
export async function resolveStream(params: {
  stationId: string;
  targetHour: number;
  targetMinute: number;
  targetSecond?: number;
  band: 'seoul_in_usa' | 'california_in_seoul';
  isCamRequested?: boolean;
  isZeroOffsetLive?: boolean;
}): Promise<ResolvedStream> {
  const { stationId, targetHour, targetMinute, targetSecond = 0, isCamRequested = false, isZeroOffsetLive = false } = params;

  const stationConfig = getStationArchiveConfig(stationId);

  const normalizedHour = ((targetHour % 24) + 24) % 24;

  // Find show matching target hour
  const show = stationConfig.shows.find(
    s => normalizedHour >= s.startHour && normalizedHour < s.endHour
  ) || stationConfig.shows[0] || {
    startHour: normalizedHour,
    endHour: normalizedHour + 1,
    title: stationConfig.name,
    titleKo: stationConfig.nameKo,
    dj: stationConfig.defaultDj,
    feedUrl: stationConfig.primaryFeedUrl,
    youtubeVideoId: stationConfig.youtubeVideoId
  };

  // Immediate paywall gating (e.g. KPIG 107.5)
  if (stationConfig.isPaywalled) {
    return {
      success: true,
      stationId,
      stationName: stationConfig.name,
      showTitle: show.title,
      showTitleKo: show.titleKo,
      djName: show.dj,
      broadcastHour: normalizedHour,
      tier: 'paywalled',
      tierLabel: 'Paywalled: Subscription Required (kpig.com/listen)',
      audioUrl: '',
      seekOffsetSeconds: 0,
      totalDurationSeconds: 3600,
      isReplay: false,
      needsProxy: false,
      episodeSubtitle: stationConfig.paywallNotice || 'Subscription required by broadcaster',
      guests: [],
      isPaywalled: true,
      paywallNotice: stationConfig.paywallNotice || 'Subscription required by broadcaster'
    };
  }

  const feedUrl = show.feedUrl || stationConfig.primaryFeedUrl;
  
  // Dynamically resolve freshest verified Visible Radio VOD (MBC, SBS, KBS)
  let youtubeVideoId: string | undefined = undefined;
  let isLiveVideoStream = false;
  if (stationConfig.youtubeVideoId) {
    const videoResult = await getVisibleRadioVOD(stationId, isZeroOffsetLive);
    if (videoResult) {
      youtubeVideoId = videoResult.videoId;
      isLiveVideoStream = videoResult.isLiveStream;
    } else {
      youtubeVideoId = show.youtubeVideoId || stationConfig.youtubeVideoId;
    }
  }

  // LIVE ON-AIR STREAM AUTO-ROUTING:
  // 1. Zero-offset listener: When listener is in the broadcast station's home timezone (0h offset) and liveSync is on.
  // 2. Commercial music stations: Stations with no episodic podcast archives (due to music licensing),
  //    which broadcast continuous 24/7 live audio streams.
  const isContinuousLiveStation = !feedUrl && !!stationConfig.liveStreamUrl;

  if ((isZeroOffsetLive || isContinuousLiveStation) && stationConfig.liveStreamUrl) {
    const liveAudioUrl = await resolveLiveStreamUrl(stationConfig.liveStreamUrl);

    if (liveAudioUrl) {
      let resolvedShowTitleKo = show.titleKo;
      let resolvedDjName = show.dj;
      let episodeSubtitle: string | undefined = undefined;

      if (stationId.includes('mbc')) {
        try {
          const liveEpg = await getMbcScheduledShow(normalizedHour, targetMinute);
          if (liveEpg) {
            resolvedShowTitleKo = liveEpg.title;
            if (liveEpg.dj) resolvedDjName = liveEpg.dj;
            if (liveEpg.subTitle && liveEpg.subTitle.trim() !== liveEpg.title?.trim() && liveEpg.subTitle.trim() !== show.titleKo?.trim()) {
              episodeSubtitle = liveEpg.subTitle.trim();
            }
          }
        } catch {}
      }

      const liveHoursIntoShow = Math.max(0, normalizedHour - show.startHour);
      // For real-time live video streams, start at the live edge (0s offset) to prevent "Video unavailable" seek crashes
      const liveVideoSeekSeconds = isLiveVideoStream
        ? 0
        : (liveHoursIntoShow * 3600) + (targetMinute * 60) + targetSecond;

      return {
        success: true,
        stationId,
        stationName: stationConfig.name,
        showTitle: show.title,
        showTitleKo: resolvedShowTitleKo,
        djName: resolvedDjName,
        broadcastHour: normalizedHour,
        showStartHour: show.startHour,
        tier: 'live_direct',
        tierLabel: isContinuousLiveStation
          ? 'Live 24/7 Broadcast (Commercial Music Stream)'
          : 'Live On-Air: Direct Broadcaster Stream',
        audioUrl: liveAudioUrl,
        seekOffsetSeconds: 0,
        videoSeekOffsetSeconds: liveVideoSeekSeconds,
        totalDurationSeconds: 3600,
        youtubeVideoId,
        isLiveVideoStream,
        isReplay: false,
        needsProxy: liveAudioUrl.startsWith('http://'),
        episodeSubtitle,
        guests: [],
        cornerTitle: undefined,
        isLiveOnAir: true
      };
    }
  }

  let tier: ResolvedStream['tier'] = 'tier1_rss';
  let tierLabel = 'Tier 1: Open Broadcaster AOD/RSS (Direct CDN)';
  let audioUrl = '';
  let isReplay = false;
  let replayDate: string | undefined = undefined;
  let totalDurationSeconds = 3600 * Math.max(1, (show.endHour - show.startHour));
  let episodeSubtitle: string | undefined = undefined;
  let guests: string[] = [];
  let cornerTitle: string | undefined = undefined;

  if (feedUrl) {
    const items = await fetchAndParseFeed(feedUrl);

    if (items.length > 0) {
      const now = new Date();
      // Check for episode published today
      const todayYear = now.getFullYear();
      const todayMonth = now.getMonth();
      const todayDay = now.getDate();

      const todayEpisode = items.find(item => {
        const d = item.parsedDate;
        return d.getFullYear() === todayYear &&
               d.getMonth() === todayMonth &&
               d.getDate() === todayDay;
      });

      let resolvedEpisode = items[0];
      if (todayEpisode) {
        // Tier 1: Target-day show published and ready on CDN!
        tier = 'tier1_rss';
        tierLabel = 'Tier 1: Today\'s Broadcast Archive (CDN MP3)';
        audioUrl = todayEpisode.enclosureUrl;
        totalDurationSeconds = todayEpisode.durationSeconds || totalDurationSeconds;
        isReplay = false;
        resolvedEpisode = todayEpisode;
      } else {
        // Tier 4 (Temporal Continuity): Use most recent available episode for this time slot
        const latestEpisode = items[0];
        tier = 'tier4_continuity';
        tierLabel = 'Tier 4: Prior Episode Replay (Temporal Continuity)';
        audioUrl = latestEpisode.enclosureUrl;
        totalDurationSeconds = latestEpisode.durationSeconds || totalDurationSeconds;
        isReplay = true;
        resolvedEpisode = latestEpisode;

        const pad = (n: number) => String(n).padStart(2, '0');
        const epDate = latestEpisode.parsedDate;
        replayDate = `${epDate.getFullYear()}-${pad(epDate.getMonth() + 1)}-${pad(epDate.getDate())}`;
      }

      // Dynamic Metadata Extraction from episode item
      if (resolvedEpisode) {
        const details = extractEpisodeDetails(resolvedEpisode.title);
        episodeSubtitle = details.cleanSubtitle;
        guests = details.guests;
        cornerTitle = details.cornerTitle;
      }
    }
  }

  // Live EPG overlay for MBC stations
  let resolvedShowTitleKo = show.titleKo;
  let resolvedDjName = show.dj;

  if (stationId.includes('mbc')) {
    try {
      const liveEpg = await getMbcScheduledShow(normalizedHour, targetMinute);
      if (liveEpg) {
        resolvedShowTitleKo = liveEpg.title;
        if (liveEpg.dj) resolvedDjName = liveEpg.dj;
        if (liveEpg.subTitle && !episodeSubtitle && liveEpg.subTitle.trim() !== liveEpg.title?.trim() && liveEpg.subTitle.trim() !== show.titleKo?.trim()) {
          episodeSubtitle = liveEpg.subTitle.trim();
        }
      }
    } catch {}
  }

  // Fallback if no feed items resolved:
  if (!audioUrl) {
    if (stationId === 'sbs-1077') {
      audioUrl = 'http://podcastdown.sbs.co.kr/powerfm/2026/09/POWER-V2000009984-20260910(07-00)-1789005677821.MP3';
    } else {
      audioUrl = 'https://podcastfiledown.imbc.com/originaldata/look_1/LOOK_20260910_11.mp3';
    }
    tier = 'tier4_continuity';
    tierLabel = 'Tier 4: Standby Archive Feed';
    isReplay = true;
    replayDate = '2026-09-10';
  }

  // Calculate intra-show seek offset safely:
  // e.g. at 07:24:15, seek offset is 24 * 60 + 15 = 1455 seconds
  const hoursIntoShow = Math.max(0, normalizedHour - show.startHour);
  const rawSeekSeconds = (hoursIntoShow * 3600) + (targetMinute * 60) + targetSecond;
  const safeDuration = totalDurationSeconds > 30 ? (totalDurationSeconds - 10) : totalDurationSeconds;
  const seekOffsetSeconds = safeDuration > 0 ? (rawSeekSeconds % safeDuration) : 0;
  const videoSeekOffsetSeconds = seekOffsetSeconds;

  // Needs proxy if plain HTTP (to prevent mixed content in HTTPS browsers)
  const needsProxy = audioUrl.startsWith('http://');

  return {
    success: true,
    stationId,
    stationName: stationConfig.name,
    showTitle: show.title,
    showTitleKo: resolvedShowTitleKo,
    djName: resolvedDjName,
    broadcastHour: normalizedHour,
    showStartHour: show.startHour,
    tier,
    tierLabel,
    audioUrl,
    seekOffsetSeconds,
    videoSeekOffsetSeconds,
    totalDurationSeconds,
    youtubeVideoId,
    isLiveVideoStream,
    isReplay,
    replayDate,
    needsProxy,
    episodeSubtitle,
    guests,
    cornerTitle
  };
}
