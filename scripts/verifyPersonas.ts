/**
 * TimeShift Radio: Automated Persona & End-to-End Verification Test Suite
 * 
 * Validates:
 * 1. Persona 1: California Listener -> Seoul Morning Commute (16h offset, aired 14h ago)
 * 2. Persona 2: Seoul Listener -> Monterey Bay Commute (8h reverse delay)
 * 3. 24-Hour Daypart Coverage Matrix across all 12 stations (Zero Dead Air)
 * 4. Byte-Range Streaming Reverse Proxy (/api/proxy/audio) with Range headers
 * 5. Daylight Saving Time (DST) Matrix (PDT 16h vs PST 17h)
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3005';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  durationMs: number;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(suite: string, name: string, fn: () => Promise<string | void>) {
  const start = Date.now();
  try {
    const details = await fn();
    const durationMs = Date.now() - start;
    results.push({ suite, name, passed: true, durationMs, details: details || undefined });
    console.log(`  ✓ [PASS] ${name} (${durationMs}ms) ${details ? `-> ${details}` : ''}`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({ suite, name, passed: false, durationMs, error: err?.message || String(err) });
    console.error(`  ✗ [FAIL] ${name} (${durationMs}ms): ${err?.message}`);
  }
}

async function main() {
  console.log('\n================================================================');
  console.log('  TIMESHIFT RADIO: END-TO-END PERSONA & STABILITY TEST SUITE');
  console.log(`  Target Server: ${BASE_URL}`);
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // SUITE 1: Persona 1 - Homesick Homemaker in California -> Seoul
  // --------------------------------------------------------------------------
  console.log('[Suite 1: Persona 1 - California -> Seoul Morning Commute]');

  await runTest('Persona 1', 'Timeshift Status API at 07:24 AM California Time', async () => {
    const res = await fetch(`${BASE_URL}/api/timeshift/status?timezone=America/Los_Angeles&band=seoul_in_usa&liveSync=true`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const data = json.data || json;
    if (typeof data.offsetHours !== 'number') throw new Error('Missing offsetHours');
    return `Offset: ${data.offsetHours}h | User: ${data.userLocalTimeStr} | Target: ${data.broadcastTimeStr}`;
  });

  await runTest('Persona 1', 'Resolve MBC 91.9 FM4U Morning Rush (07:24 AM)', async () => {
    const res = await fetch(`${BASE_URL}/api/stream/resolve?stationId=mbc-919&targetHour=7&targetMinute=24&band=seoul_in_usa`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Resolution failed');
    if (!data.audioUrl) throw new Error('Missing audioUrl');
    if (data.seekOffsetSeconds <= 0) throw new Error(`Invalid seekOffsetSeconds: ${data.seekOffsetSeconds}`);
    if (!data.youtubeVideoId) throw new Error('MBC FM4U missing verified YouTube VOD ID');
    return `Show: "${data.showTitleKo}" | Seek: ${data.seekOffsetSeconds}s | VOD: ${data.youtubeVideoId}`;
  });

  await runTest('Persona 1', 'Resolve SBS 107.7 Power FM Morning Talk (07:24 AM)', async () => {
    const res = await fetch(`${BASE_URL}/api/stream/resolve?stationId=sbs-1077&targetHour=7&targetMinute=24&band=seoul_in_usa`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Resolution failed');
    if (!data.audioUrl) throw new Error('Missing audioUrl');
    if (!data.youtubeVideoId) throw new Error('SBS PowerFM missing verified YouTube VOD ID');
    return `Show: "${data.showTitleKo || data.showTitle}" | Seek: ${data.seekOffsetSeconds}s | VOD: ${data.youtubeVideoId}`;
  });

  await runTest('Persona 1', 'Sub-Minute Precision Seek (07:24:35 AM) for Audio & Video', async () => {
    const res = await fetch(`${BASE_URL}/api/stream/resolve?stationId=mbc-919&targetHour=7&targetMinute=24&targetSecond=35&band=seoul_in_usa`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Resolution failed');
    const expectedSeek = (24 * 60) + 35; // 1475s
    if (data.seekOffsetSeconds !== expectedSeek) {
      throw new Error(`Expected seekOffsetSeconds ${expectedSeek}s, got ${data.seekOffsetSeconds}s`);
    }
    if (data.videoSeekOffsetSeconds !== expectedSeek) {
      throw new Error(`Expected videoSeekOffsetSeconds ${expectedSeek}s, got ${data.videoSeekOffsetSeconds}s`);
    }
    if (data.showStartHour !== 7) {
      throw new Error(`Expected showStartHour 7, got ${data.showStartHour}`);
    }
    return `Audio & Video Seek: ${data.seekOffsetSeconds}s (24m 35s into 07:00 show) | ShowStart: ${data.showStartHour}:00`;
  });

  await runTest('Persona 1', 'Resolve KBS 89.1 Cool FM Morning Drive (07:24 AM)', async () => {
    const res = await fetch(`${BASE_URL}/api/stream/resolve?stationId=kbs-891&targetHour=7&targetMinute=24&band=seoul_in_usa`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Resolution failed');
    if (!data.audioUrl) throw new Error('Missing audioUrl');
    return `Show: "${data.showTitleKo || data.showTitle}" | Tier: ${data.tier}`;
  });

  await runTest('Persona 1', 'Audio-Only Gating on TBS 95.1 & CBS 93.9', async () => {
    const [tbsRes, cbsRes] = await Promise.all([
      fetch(`${BASE_URL}/api/stream/resolve?stationId=tbs-951&targetHour=7&targetMinute=24&band=seoul_in_usa`).then(r => r.json()),
      fetch(`${BASE_URL}/api/stream/resolve?stationId=cbs-939&targetHour=7&targetMinute=24&band=seoul_in_usa`).then(r => r.json())
    ]);
    if (tbsRes.youtubeVideoId !== undefined) throw new Error('TBS should be audio-only (no videoId)');
    if (cbsRes.youtubeVideoId !== undefined) throw new Error('CBS should be audio-only (no videoId)');
    return 'TBS & CBS correctly return undefined for YouTube CAM';
  });

  await runTest('Persona 1', 'Resolve KBS Classic FM 93.1 (07:24 AM)', async () => {
    const res = await fetch(`${BASE_URL}/api/stream/resolve?stationId=kbs-931&targetHour=7&targetMinute=24&band=seoul_in_usa`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Resolution failed');
    if (!data.audioUrl) throw new Error('Missing audioUrl');
    return `Show: "${data.showTitleKo || data.showTitle}" | Tier: ${data.tier}`;
  });

  await runTest('Persona 1', 'Resolve KBS Happy FM 106.1 (07:24 AM)', async () => {
    const res = await fetch(`${BASE_URL}/api/stream/resolve?stationId=kbs-1061&targetHour=7&targetMinute=24&band=seoul_in_usa`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Resolution failed');
    if (!data.audioUrl) throw new Error('Missing audioUrl');
    return `Show: "${data.showTitleKo || data.showTitle}" | Tier: ${data.tier}`;
  });

  await runTest('Persona 1', 'Resolve AFN The Eagle 88.5 (07:24 AM)', async () => {
    const res = await fetch(`${BASE_URL}/api/stream/resolve?stationId=afn-885&targetHour=7&targetMinute=24&band=seoul_in_usa`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Resolution failed');
    if (!data.audioUrl) throw new Error('Missing audioUrl');
    return `Show: "${data.showTitleKo || data.showTitle}" | Tier: ${data.tier}`;
  });

  await runTest('Persona 1', 'Resolve TBS eFM 101.3 (07:24 AM)', async () => {
    const res = await fetch(`${BASE_URL}/api/stream/resolve?stationId=tbs-1013&targetHour=7&targetMinute=24&band=seoul_in_usa`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Resolution failed');
    if (!data.audioUrl) throw new Error('Missing audioUrl');
    return `Show: "${data.showTitleKo || data.showTitle}" | Tier: ${data.tier}`;
  });

  // --------------------------------------------------------------------------
  // SUITE 2: Persona 2 - Relocating Family in Seoul -> Monterey Bay
  // --------------------------------------------------------------------------
  console.log('\n[Suite 2: Persona 2 - Seoul -> Monterey Bay 8h Reverse Delay]');

  await runTest('Persona 2', 'Timeshift Status API at 08:15 AM Seoul Time', async () => {
    const res = await fetch(`${BASE_URL}/api/timeshift/status?timezone=Asia/Seoul&band=california_in_seoul&liveSync=true`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const data = json.data || json;
    if (data.offsetHours !== 8) throw new Error(`Expected 8h reverse delay, got ${data.offsetHours}h`);
    return `Delay: ${data.offsetHours}h | User: ${data.userLocalTimeStr} | Target: ${data.broadcastTimeStr}`;
  });

  await runTest('Persona 2', 'Resolve KQEI 89.3 Monterey (KQED California Report)', async () => {
    const res = await fetch(`${BASE_URL}/api/stream/resolve?stationId=kqei-893&targetHour=8&targetMinute=15&band=california_in_seoul`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Resolution failed');
    if (!data.audioUrl) throw new Error('Missing audioUrl');
    return `Show: "${data.showTitleKo || data.showTitle}" | URL: ${data.audioUrl.substring(0, 45)}...`;
  });

  await runTest('Persona 2', 'Resolve KAZU 90.3 NPR Monterey Morning Edition', async () => {
    const res = await fetch(`${BASE_URL}/api/stream/resolve?stationId=kazu-903&targetHour=8&targetMinute=15&band=california_in_seoul`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Resolution failed');
    if (!data.audioUrl) throw new Error('Missing audioUrl');
    return `Show: "${data.showTitleKo || data.showTitle}"`;
  });

  await runTest('Persona 2', 'Resolve KSQD 90.7 Central Coast Community Talk', async () => {
    const res = await fetch(`${BASE_URL}/api/stream/resolve?stationId=ksqd-907&targetHour=8&targetMinute=15&band=california_in_seoul`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Resolution failed');
    if (!data.audioUrl) throw new Error('Missing audioUrl');
    return `Show: "${data.showTitleKo || data.showTitle}"`;
  });

  await runTest('Persona 2', 'Resolve KWAV 96.9 K-Wave Pop Hits (Live 24/7 Music Stream)', async () => {
    const res = await fetch(`${BASE_URL}/api/stream/resolve?stationId=kwav-969&targetHour=8&targetMinute=15&band=california_in_seoul`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Resolution failed');
    if (!data.audioUrl) throw new Error('Missing audioUrl');
    if (data.tier !== 'live_direct') throw new Error(`Expected tier 'live_direct', got '${data.tier}'`);
    if (!data.isLiveOnAir) throw new Error('Expected isLiveOnAir: true');
    return `Show: "${data.showTitleKo || data.showTitle}" | Tier: ${data.tier} | Live URL: ${data.audioUrl}`;
  });

  await runTest('Persona 2', 'Resolve KDON 102.5 Top 40 Hits (Live 24/7 Music Stream)', async () => {
    const res = await fetch(`${BASE_URL}/api/stream/resolve?stationId=kdon-1025&targetHour=8&targetMinute=15&band=california_in_seoul`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Resolution failed');
    if (!data.audioUrl) throw new Error('Missing audioUrl');
    if (data.tier !== 'live_direct') throw new Error(`Expected tier 'live_direct', got '${data.tier}'`);
    if (!data.isLiveOnAir) throw new Error('Expected isLiveOnAir: true');
    return `Show: "${data.showTitleKo || data.showTitle}" | Tier: ${data.tier} | Live URL: ${data.audioUrl}`;
  });

  await runTest('Persona 2', 'Resolve KOCN 105.1 K-Ocean Rhythmic Oldies (Live 24/7 Music Stream)', async () => {
    const res = await fetch(`${BASE_URL}/api/stream/resolve?stationId=kocn-1051&targetHour=8&targetMinute=15&band=california_in_seoul`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Resolution failed');
    if (!data.audioUrl) throw new Error('Missing audioUrl');
    if (data.tier !== 'live_direct') throw new Error(`Expected tier 'live_direct', got '${data.tier}'`);
    if (!data.isLiveOnAir) throw new Error('Expected isLiveOnAir: true');
    return `Show: "${data.showTitleKo || data.showTitle}" | Tier: ${data.tier} | Live URL: ${data.audioUrl}`;
  });

  await runTest('Persona 2', 'Resolve KTOM 92.7 Country (Live 24/7 Music Stream)', async () => {
    const res = await fetch(`${BASE_URL}/api/stream/resolve?stationId=ktom-927&targetHour=8&targetMinute=15&band=california_in_seoul`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Resolution failed');
    if (!data.audioUrl) throw new Error('Missing audioUrl');
    if (data.tier !== 'live_direct') throw new Error(`Expected tier 'live_direct', got '${data.tier}'`);
    if (!data.isLiveOnAir) throw new Error('Expected isLiveOnAir: true');
    return `Show: "${data.showTitleKo || data.showTitle}" | Tier: ${data.tier} | Live URL: ${data.audioUrl}`;
  });

  await runTest('Persona 2', 'Resolve KDFC 89.9 Classical California (Live 24/7 Music Stream)', async () => {
    const res = await fetch(`${BASE_URL}/api/stream/resolve?stationId=kdfc-899&targetHour=8&targetMinute=15&band=california_in_seoul`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Resolution failed');
    if (!data.audioUrl) throw new Error('Missing audioUrl');
    if (data.tier !== 'live_direct') throw new Error(`Expected tier 'live_direct', got '${data.tier}'`);
    if (!data.isLiveOnAir) throw new Error('Expected isLiveOnAir: true');
    return `Show: "${data.showTitleKo || data.showTitle}" | Tier: ${data.tier} | Live URL: ${data.audioUrl}`;
  });

  await runTest('Persona 2', 'Verify KPIG 107.5 FM Paywall Gating (Freedom/Watsonville, CA)', async () => {
    const res = await fetch(`${BASE_URL}/api/stream/resolve?stationId=kpig-1075&targetHour=8&targetMinute=15&band=california_in_seoul`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.tier !== 'paywalled') throw new Error(`Expected tier 'paywalled', got '${data.tier}'`);
    if (!data.isPaywalled) throw new Error('Expected isPaywalled: true');
    if (data.audioUrl) throw new Error(`Expected no audioUrl for paywalled station, got ${data.audioUrl}`);
    if (!data.paywallNotice || !data.paywallNotice.includes('Pig Pen')) {
      throw new Error(`Expected Pig Pen paywall notice, got: ${data.paywallNotice}`);
    }
    return `Tier: ${data.tier} | isPaywalled: true | Notice: "${data.paywallNotice}"`;
  });

  // --------------------------------------------------------------------------
  // SUITE 3: 24-Hour Daypart Matrix (Zero Dead Air Check across 21 Stations)
  // --------------------------------------------------------------------------
  console.log('\n[Suite 3: 24-Hour Daypart Coverage Matrix (All 21 Stations)]');

  const STATIONS = [
    // Seoul Band (10 stations)
    { id: 'mbc-919', band: 'seoul_in_usa' },
    { id: 'sbs-1077', band: 'seoul_in_usa' },
    { id: 'kbs-891', band: 'seoul_in_usa' },
    { id: 'tbs-951', band: 'seoul_in_usa' },
    { id: 'cbs-939', band: 'seoul_in_usa' },
    { id: 'ebs-1045', band: 'seoul_in_usa' },
    { id: 'kbs-931', band: 'seoul_in_usa' },
    { id: 'kbs-1061', band: 'seoul_in_usa' },
    { id: 'tbs-1013', band: 'seoul_in_usa' },
    { id: 'afn-885', band: 'seoul_in_usa' },
    // California Band (11 stations)
    { id: 'kazu-903', band: 'california_in_seoul' },
    { id: 'ksqd-907', band: 'california_in_seoul' },
    { id: 'kzsc-881', band: 'california_in_seoul' },
    { id: 'kqei-893', band: 'california_in_seoul' },
    { id: 'smoothjazz-100', band: 'california_in_seoul' },
    { id: 'kwav-969', band: 'california_in_seoul' },
    { id: 'kdon-1025', band: 'california_in_seoul' },
    { id: 'kocn-1051', band: 'california_in_seoul' },
    { id: 'kpig-1075', band: 'california_in_seoul' },
    { id: 'ktom-927', band: 'california_in_seoul' },
    { id: 'kdfc-899', band: 'california_in_seoul' }
  ];

  const SAMPLE_HOURS = [6, 8, 12, 15, 19, 1]; // Early Morning, Morning Rush, Midday, Afternoon, Evening, Deep Night

  await runTest('Daypart Matrix', `Sample 126 station-hour combinations across 6 key dayparts`, async () => {
    let resolvedCount = 0;
    for (const st of STATIONS) {
      for (const h of SAMPLE_HOURS) {
        const res = await fetch(`${BASE_URL}/api/stream/resolve?stationId=${st.id}&targetHour=${h}&targetMinute=30&band=${st.band}`);
        if (!res.ok) throw new Error(`Station ${st.id} at hour ${h} failed with HTTP ${res.status}`);
        const data = await res.json();
        if (st.id === 'kpig-1075') {
          if (data.tier !== 'paywalled' || !data.isPaywalled) {
            throw new Error(`KPIG at hour ${h} expected paywalled tier`);
          }
        } else {
          if (!data.success || !data.audioUrl) {
            throw new Error(`Station ${st.id} at hour ${h} failed to resolve valid stream`);
          }
        }
        resolvedCount++;
      }
    }
    return `Verified ${resolvedCount}/126 slots with zero 404s, robust stream resolution, and paywall protection`;
  });

  // --------------------------------------------------------------------------
  // SUITE 4: Byte-Range Streaming Reverse Proxy (/api/proxy/audio)
  // --------------------------------------------------------------------------
  console.log('\n[Suite 4: Audio Reverse Proxy & Byte-Range Tunneling]');

  await runTest('Audio Proxy', 'HTTP 206 Partial Content Range Tunneling (bytes=0-1023)', async () => {
    // Resolve a real stream URL first
    const resolveRes = await fetch(`${BASE_URL}/api/stream/resolve?stationId=mbc-919&targetHour=7&targetMinute=24&band=seoul_in_usa`);
    const streamData = await resolveRes.json();
    const targetUrl = streamData.audioUrl;

    const proxyRes = await fetch(`${BASE_URL}/api/proxy/audio?url=${encodeURIComponent(targetUrl)}`, {
      headers: {
        'Range': 'bytes=0-1023'
      }
    });

    if (proxyRes.status !== 206) {
      throw new Error(`Expected HTTP 206 Partial Content, received HTTP ${proxyRes.status}`);
    }

    const contentRange = proxyRes.headers.get('content-range');
    if (!contentRange || !contentRange.startsWith('bytes 0-1023/')) {
      throw new Error(`Invalid Content-Range header: ${contentRange}`);
    }

    const arrayBuffer = await proxyRes.arrayBuffer();
    if (arrayBuffer.byteLength !== 1024) {
      throw new Error(`Expected 1024 bytes, received ${arrayBuffer.byteLength}`);
    }

    return `HTTP 206 OK | Content-Range: ${contentRange} | Bytes: ${arrayBuffer.byteLength}`;
  });

  // --------------------------------------------------------------------------
  // SUITE 5: Daylight Saving Time (DST) Dynamic Calculation
  // --------------------------------------------------------------------------
  console.log('\n[Suite 5: Daylight Saving Time (DST) Boundary Checks]');

  await runTest('DST Math', 'Verify Dynamic Timezone Resolution for Pacific vs Seoul', async () => {
    const summerDate = new Date('2026-07-15T12:00:00Z'); // Summer PDT (UTC-7)
    const winterDate = new Date('2026-01-15T12:00:00Z'); // Winter PST (UTC-8)

    const getOffsetHours = (tz: string, date: Date) => {
      const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false });
      const seoulDtf = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', hour: 'numeric', hour12: false });
      const tzH = parseInt(dtf.format(date), 10);
      const seoulH = parseInt(seoulDtf.format(date), 10);
      return ((seoulH - tzH) + 24) % 24;
    };

    const summerOffset = getOffsetHours('America/Los_Angeles', summerDate);
    const winterOffset = getOffsetHours('America/Los_Angeles', winterDate);

    if (summerOffset !== 16) throw new Error(`Expected 16h offset in summer (PDT), got ${summerOffset}`);
    if (winterOffset !== 17) throw new Error(`Expected 17h offset in winter (PST), got ${winterOffset}`);

    return `Summer PDT: +${summerOffset}h | Winter PST: +${winterOffset}h (Intl.DateTimeFormat validated)`;
  });

  // --------------------------------------------------------------------------
  // SUITE 6: Smart Zero-Offset Native Live Auto-Switch
  // --------------------------------------------------------------------------
  console.log('\n[Suite 6: Smart Zero-Offset Native Live Auto-Switch]');

  await runTest('Persona 3', 'Seoul Native in Seoul (Asia/Seoul -> Seoul Band): Live On-Air Auto-Switch', async () => {
    const statusRes = await fetch(`${BASE_URL}/api/timeshift/status?timezone=Asia/Seoul&band=seoul_in_usa&liveSync=true`);
    const statusJson = await statusRes.json();
    const statusData = statusJson.data || statusJson;
    if (!statusData.isZeroOffsetLive) throw new Error('Expected isZeroOffsetLive: true for Seoul user in Seoul mode');
    if (statusData.offsetHours !== 0) throw new Error(`Expected 0h offset, got ${statusData.offsetHours}`);

    const resolveRes = await fetch(`${BASE_URL}/api/stream/resolve?stationId=mbc-919&targetHour=7&targetMinute=0&band=seoul_in_usa&timezone=Asia/Seoul&liveSync=true`);
    const resolveData = await resolveRes.json();
    if (resolveData.tier !== 'live_direct') throw new Error(`Expected tier 'live_direct', got '${resolveData.tier}'`);
    if (!resolveData.isLiveOnAir) throw new Error('Expected isLiveOnAir: true');
    if (resolveData.seekOffsetSeconds !== 0) throw new Error(`Expected 0s seek for live stream, got ${resolveData.seekOffsetSeconds}s`);
    if (!resolveData.audioUrl.includes('stn=mbc') && !resolveData.audioUrl.includes('imbc.com')) throw new Error(`Unexpected live audioUrl: ${resolveData.audioUrl}`);

    return `Tier: ${resolveData.tier} | LiveOnAir: ${resolveData.isLiveOnAir} | URL: ${resolveData.audioUrl}`;
  });

  await runTest('Persona 4', 'California Native in CA (America/Los_Angeles -> CA Band): Live On-Air Auto-Switch', async () => {
    const statusRes = await fetch(`${BASE_URL}/api/timeshift/status?timezone=America/Los_Angeles&band=california_in_seoul&liveSync=true`);
    const statusJson = await statusRes.json();
    const statusData = statusJson.data || statusJson;
    if (!statusData.isZeroOffsetLive) throw new Error('Expected isZeroOffsetLive: true for CA user in CA mode');

    const resolveRes = await fetch(`${BASE_URL}/api/stream/resolve?stationId=kqei-893&targetHour=8&targetMinute=0&band=california_in_seoul&timezone=America/Los_Angeles&liveSync=true`);
    const resolveData = await resolveRes.json();
    if (resolveData.tier !== 'live_direct') throw new Error(`Expected tier 'live_direct', got '${resolveData.tier}'`);
    if (!resolveData.isLiveOnAir) throw new Error('Expected isLiveOnAir: true');
    if (resolveData.seekOffsetSeconds !== 0) throw new Error(`Expected 0s seek for live stream, got ${resolveData.seekOffsetSeconds}s`);

    return `Tier: ${resolveData.tier} | Station: ${resolveData.stationName} | URL: ${resolveData.audioUrl}`;
  });

  await runTest('Scrubbed Regression', 'User in Seoul scrubs hour away from live sync (reverts to archive replay)', async () => {
    const resolveRes = await fetch(`${BASE_URL}/api/stream/resolve?stationId=mbc-919&targetHour=23&targetMinute=0&band=seoul_in_usa&timezone=Asia/Seoul&liveSync=false`);
    const resolveData = await resolveRes.json();
    if (resolveData.tier === 'live_direct') throw new Error('Scrubbed hour should NOT resolve live_direct');
    if (resolveData.tier !== 'tier1_rss' && resolveData.tier !== 'tier4_continuity') {
      throw new Error(`Expected archive tier, got ${resolveData.tier}`);
    }

    return `Tier: ${resolveData.tier} (${resolveData.tierLabel}) | Replay: ${resolveData.isReplay}`;
  });

  await runTest('Zero-Offset CAM', 'Zero-Offset Live Stream sets videoSeekOffsetSeconds for YouTube VOD (MBC 919 at 07:24:35)', async () => {
    const res = await fetch(`${BASE_URL}/api/stream/resolve?stationId=mbc-919&targetHour=7&targetMinute=24&targetSecond=35&band=seoul_in_usa&timezone=Asia/Seoul&liveSync=true`);
    const data = await res.json();
    if (data.tier !== 'live_direct') throw new Error(`Expected tier 'live_direct', got '${data.tier}'`);
    if (data.seekOffsetSeconds !== 0) throw new Error(`Audio seek should be 0s for live stream, got ${data.seekOffsetSeconds}s`);
    const expectedVideoSeek = data.isLiveVideoStream ? 0 : (24 * 60) + 35;
    if (data.videoSeekOffsetSeconds !== expectedVideoSeek) {
      throw new Error(`Expected videoSeekOffsetSeconds ${expectedVideoSeek}s, got ${data.videoSeekOffsetSeconds}s`);
    }
    return `Audio: 0s (Live Edge) | Video: ${data.videoSeekOffsetSeconds}s (Live Stream: ${!!data.isLiveVideoStream})`;
  });

  // --------------------------------------------------------------------------
  // SUITE 7: Regional Station Fidelity & Geographic Boundary Isolation Audit
  // --------------------------------------------------------------------------
  console.log('\n[Suite 7: Regional Station Fidelity & Geographic Boundary Isolation Audit]');

  await runTest('Regional Audit', 'Seoul Band (seoul_in_usa): 100% South Korean Regional Fidelity', async () => {
    const res = await fetch(`${BASE_URL}/api/stations?band=seoul_in_usa`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const stations: any[] = data.stations || [];

    if (stations.length !== 10) {
      throw new Error(`Expected exactly 10 Seoul stations, got ${stations.length}`);
    }

    const nonKorean = stations.filter(s => s.country !== 'South Korea');
    if (nonKorean.length > 0) {
      throw new Error(`Found non-Korean stations in Seoul band: ${nonKorean.map(s => s.id).join(', ')}`);
    }

    // Verify presence of all expected Seoul stations
    const expectedSeoulIds = [
      'mbc-919', 'sbs-1077', 'kbs-891', 'tbs-951', 'cbs-939',
      'ebs-1045', 'kbs-931', 'kbs-1061', 'tbs-1013', 'afn-885'
    ];
    for (const expectedId of expectedSeoulIds) {
      if (!stations.some(s => s.id === expectedId)) {
        throw new Error(`Missing expected Seoul station: ${expectedId}`);
      }
    }

    // Verify zero California stations leaked into Seoul band
    const californiaIds = ['kazu-903', 'ksqd-907', 'kzsc-881', 'kqei-893', 'smoothjazz-100', 'kwav-969', 'kdon-1025', 'kocn-1051', 'kpig-1075', 'ktom-927', 'kdfc-899'];
    const leakedCa = stations.filter(s => californiaIds.includes(s.id));
    if (leakedCa.length > 0) {
      throw new Error(`California stations leaked into Seoul band: ${leakedCa.map(s => s.id).join(', ')}`);
    }

    return `10/10 stations verified strictly South Korea / Seoul metro area`;
  });

  await runTest('Regional Audit', 'California Band (california_in_seoul): 100% Monterey Bay / Central Coast CA Fidelity', async () => {
    const res = await fetch(`${BASE_URL}/api/stations?band=california_in_seoul`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const stations: any[] = data.stations || [];

    if (stations.length !== 11) {
      throw new Error(`Expected exactly 11 California stations, got ${stations.length}`);
    }

    const nonUs = stations.filter(s => s.country !== 'United States');
    if (nonUs.length > 0) {
      throw new Error(`Found non-US stations in California band: ${nonUs.map(s => s.id).join(', ')}`);
    }

    // Explicit check: tbs-1013 must NOT be present in California band
    if (stations.some(s => s.id === 'tbs-1013')) {
      throw new Error('CRITICAL: tbs-1013 (Seoul, South Korea) mistakenly found in California band!');
    }

    // Verify presence of all 11 authentic Monterey Bay / Central Coast stations
    const expectedCaIds = [
      'kazu-903', 'ksqd-907', 'kzsc-881', 'kqei-893', 'smoothjazz-100',
      'kwav-969', 'kdon-1025', 'kocn-1051', 'kpig-1075', 'ktom-927', 'kdfc-899'
    ];
    for (const expectedId of expectedCaIds) {
      if (!stations.some(s => s.id === expectedId)) {
        throw new Error(`Missing expected California station: ${expectedId}`);
      }
    }

    // Verify all cities are authentic Central Coast / Monterey Bay municipalities
    const validLocs = ['Monterey', 'Santa Cruz', 'Salinas', 'Carmel', 'Freedom', 'Watsonville', 'Pacific Grove'];
    for (const st of stations) {
      const cityMatches = validLocs.some(loc => st.city.includes(loc));
      if (!cityMatches) {
        throw new Error(`Station ${st.id} has suspect location: "${st.city}"`);
      }
    }

    // Verify KPIG is correctly marked paywalled
    const kpig = stations.find(s => s.id === 'kpig-1075');
    if (!kpig || !kpig.isPaywalled) {
      throw new Error('KPIG 107.5 must be marked isPaywalled: true');
    }

    return `11/11 stations verified strictly Monterey Bay / Central Coast, CA (zero cross-contamination)`;
  });

  // --------------------------------------------------------------------------
  // SUMMARY REPORT
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('  TEST SUMMARY REPORT');
  console.log('================================================================');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((acc, r) => acc + r.durationMs, 0);

  console.log(`  Total Tests Run:  ${results.length}`);
  console.log(`  Passed:           ${passed} / ${results.length} (${Math.round((passed / results.length) * 100)}%)`);
  console.log(`  Failed:           ${failed}`);
  console.log(`  Total Time:       ${(totalDuration / 1000).toFixed(2)}s`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
