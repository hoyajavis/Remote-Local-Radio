/**
 * Broadcaster EPG & Dynamic Metadata Service
 * Fetches, caches, and parses live broadcaster schedules and episode metadata.
 */

export interface EpgProgramItem {
  startTime: string; // "0700"
  startHour: number;
  startMinute: number;
  runningTimeMinutes: number;
  title: string;
  subTitle: string;
  players: string; // DJ / Host
  broadcastId: string;
}

interface EpgCache {
  fetchedAt: number;
  programs: EpgProgramItem[];
}

const epgCache = new Map<string, EpgCache>();
const EPG_TTL_MS = 4 * 60 * 60 * 1000; // 4 Hours TTL

/**
 * Fetch and parse official MBC Radio EPG schedule
 * Endpoint: https://control.imbc.com/Schedule/Radio?channel=sfm
 */
export async function fetchMbcEpg(channel: 'sfm' | 'mfm' = 'sfm'): Promise<EpgProgramItem[]> {
  const cached = epgCache.get(channel);
  if (cached && Date.now() - cached.fetchedAt < EPG_TTL_MS) {
    return cached.programs;
  }

  try {
    const res = await fetch(`https://control.imbc.com/Schedule/Radio?channel=${channel}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    if (!res.ok) {
      console.warn(`[EpgService] MBC EPG HTTP ${res.status}`);
      return cached ? cached.programs : [];
    }

    const rawList = await res.json();
    if (!Array.isArray(rawList)) {
      return cached ? cached.programs : [];
    }

    const programs: EpgProgramItem[] = rawList.map((item: any) => {
      const timeStr = String(item.StartTime || '0000').padStart(4, '0');
      const startHour = parseInt(timeStr.slice(0, 2), 10);
      const startMinute = parseInt(timeStr.slice(2, 4), 10);
      const runningTimeMinutes = parseInt(item.RunningTime || '60', 10);

      return {
        startTime: timeStr,
        startHour,
        startMinute,
        runningTimeMinutes,
        title: item.Title?.trim() || '',
        subTitle: item.SubTitle?.trim() || '',
        players: item.Players?.trim() || '',
        broadcastId: item.BroadcastID || ''
      };
    });

    epgCache.set(channel, {
      fetchedAt: Date.now(),
      programs
    });

    return programs;
  } catch (err: any) {
    console.error('[EpgService] Error fetching MBC EPG:', err.message);
    return cached ? cached.programs : [];
  }
}

/**
 * Lookup show from MBC EPG for a target hour and minute
 */
export async function getMbcScheduledShow(hour: number, minute: number = 0): Promise<{
  title: string;
  dj: string;
  subTitle: string;
} | null> {
  try {
    const programs = await fetchMbcEpg('sfm');
    if (programs.length === 0) return null;

    const targetTotalMins = hour * 60 + minute;

    for (const prog of programs) {
      const progStartMins = prog.startHour * 60 + prog.startMinute;
      const progEndMins = progStartMins + prog.runningTimeMinutes;

      if (targetTotalMins >= progStartMins && targetTotalMins < progEndMins) {
        return {
          title: prog.title,
          dj: prog.players || 'MBC 라디오',
          subTitle: prog.subTitle
        };
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

/**
 * Intelligent regex metadata extractor for episode titles across Korean & US feeds:
 * Extracts special guests, corner titles, and clean subtitles.
 */
export function extractEpisodeDetails(rawTitle: string, rawDescription?: string): {
  cleanSubtitle: string;
  cornerTitle?: string;
  guests: string[];
} {
  let cleanSubtitle = rawTitle.trim();
  const guests: string[] = [];
  let cornerTitle: string | undefined = undefined;

  // 1. Clean common date prefixes like "9/10(목)", "2026-09-10", "(목)"
  cleanSubtitle = cleanSubtitle
    .replace(/^[0-9]{1,2}\/[0-9]{1,2}\([가-힣a-zA-Z]\)\s*/, '')
    .replace(/^\([가-힣a-zA-Z]\)\s*/, '')
    .replace(/^[0-9]{4}[.-][0-9]{2}[.-][0-9]{2}\s*/, '')
    .trim();

  // 2. Extract guests patterns:
  // e.g. "w. 원위", "with 해바라기", "게스트: 오마이걸 미미", "(손준호, 서은광)"
  const withMatch = rawTitle.match(/(?:w\.|with|\bw\/)\s*([^,;()\-\"]+)/i);
  if (withMatch && withMatch[1]) {
    guests.push(withMatch[1].trim());
  }

  const guestColonMatch = rawTitle.match(/(?:게스트|초대석|출연)\s*[:：]\s*([^,;()\-\"]+)/i);
  if (guestColonMatch && guestColonMatch[1]) {
    guests.push(guestColonMatch[1].trim());
  }

  const parenGuestMatch = rawTitle.match(/\(([가-힣a-zA-Z0-9\s,·]+)\)\s*-\s*[0-9]{4}/);
  if (parenGuestMatch && parenGuestMatch[1]) {
    const list = parenGuestMatch[1].split(/[,·]/).map(s => s.trim()).filter(Boolean);
    guests.push(...list);
  }

  // 3. Extract corner / special topic patterns:
  // e.g. "철파엠 스페셜", "오키뉴스 양소연", "1, 2부 [코너명]"
  const cornerMatch = rawTitle.match(/(?:철파엠\s*스페셜|오키뉴스\s*[^"-]+|스페셜\s*초대석)/i);
  if (cornerMatch) {
    cornerTitle = cornerMatch[0].trim();
  }

  // Deduplicate guests
  const uniqueGuests = [...new Set(guests)];

  return {
    cleanSubtitle,
    cornerTitle,
    guests: uniqueGuests
  };
}
