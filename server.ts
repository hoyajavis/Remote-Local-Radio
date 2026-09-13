import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { radioDb } from './server/database.js';
import { generateTimeCheckSignal, generateStationJingle } from './server/audioGenerator.js';
import { resolveStream } from './server/streamResolver.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3005;

app.use(express.json());

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'TimeShift Radio Broadcast Engine',
    version: '1.0.0',
    timestamp: Date.now()
  });
});

// API: Get radio stations directory
app.get('/api/stations', (req, res) => {
  const band = req.query.band as string | undefined;
  res.json({
    success: true,
    stations: radioDb.getStations(band)
  });
});

// API: Get 24-hour custom schedule
app.get('/api/schedule', (req, res) => {
  res.json({
    success: true,
    schedule: radioDb.getSchedule()
  });
});

// API: Save entire schedule
app.post('/api/schedule', async (req, res) => {
  try {
    const { schedule } = req.body;
    if (!Array.isArray(schedule)) {
      return res.status(400).json({ error: 'Invalid schedule array' });
    }
    const updated = await radioDb.saveSchedule(schedule);
    res.json({ success: true, schedule: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save schedule' });
  }
});

// API: Add or update single slot
app.post('/api/schedule/slot', async (req, res) => {
  try {
    const slot = req.body;
    if (!slot || !slot.id || slot.startHour === undefined) {
      return res.status(400).json({ error: 'Missing required slot fields' });
    }
    const updated = await radioDb.addOrUpdateSlot(slot);
    res.json({ success: true, schedule: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Delete slot
app.delete('/api/schedule/:id', async (req, res) => {
  try {
    const updated = await radioDb.deleteSlot(req.params.id);
    res.json({ success: true, schedule: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Reset schedule to default Korean broadcaster schedule
app.post('/api/schedule/reset', async (req, res) => {
  try {
    const updated = await radioDb.resetSchedule();
    res.json({ success: true, schedule: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Time-Shift Calculation & Status
// Returns the synchronized state between User Local Time and Seoul Broadcast Time
app.get('/api/timeshift/status', (req, res) => {
  try {
    const timezone = (req.query.timezone as string) || 'America/Los_Angeles';
    const isLiveSync = req.query.liveSync !== 'false';
    const band = ((req.query.band as string) || 'seoul_in_usa') as 'seoul_in_usa' | 'california_in_seoul';
    const scrubbedHour = req.query.scrubbedHour !== undefined ? parseInt(req.query.scrubbedHour as string, 10) : undefined;
    const scrubbedMinute = req.query.scrubbedMinute !== undefined ? parseInt(req.query.scrubbedMinute as string, 10) : 0;

    const now = new Date();

    // User's current local clock
    let userLocalHour = 0;
    let userLocalMinute = 0;
    let userLocalSec = 0;
    let userLocalTimeStr = '';

    try {
      const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
      });
      const parts = dtf.formatToParts(now);
      userLocalHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
      userLocalMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
      userLocalSec = parseInt(parts.find(p => p.type === 'second')?.value || '0', 10);
      userLocalTimeStr = `${String(userLocalHour).padStart(2, '0')}:${String(userLocalMinute).padStart(2, '0')}:${String(userLocalSec).padStart(2, '0')}`;
    } catch {
      // Fallback
      userLocalHour = now.getHours();
      userLocalMinute = now.getMinutes();
      userLocalSec = now.getSeconds();
      userLocalTimeStr = `${String(userLocalHour).padStart(2, '0')}:${String(userLocalMinute).padStart(2, '0')}`;
    }

    // Live Seoul clock (Asia/Seoul)
    const seoulDtf = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });
    const seoulParts = seoulDtf.formatToParts(now);
    const seoulLiveHour = parseInt(seoulParts.find(p => p.type === 'hour')?.value || '0', 10);
    const seoulLiveMinute = parseInt(seoulParts.find(p => p.type === 'minute')?.value || '0', 10);
    const seoulLiveSec = parseInt(seoulParts.find(p => p.type === 'second')?.value || '0', 10);
    const seoulLiveTimeStr = `${String(seoulLiveHour).padStart(2, '0')}:${String(seoulLiveMinute).padStart(2, '0')}:${String(seoulLiveSec).padStart(2, '0')}`;

    // Live California clock (America/Los_Angeles)
    const caDtf = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });
    const caParts = caDtf.formatToParts(now);
    const caLiveHour = parseInt(caParts.find(p => p.type === 'hour')?.value || '0', 10);

    // Target broadcast time:
    // If LiveSync: The target broadcast daypart matches the listener's local routine hour!
    // e.g. 7:00 AM California breakfast -> 7:00 AM Seoul morning rush hour show!
    // e.g. 8:00 AM Seoul breakfast -> 8:00 AM California morning broadcast!
    let broadcastHour = isLiveSync ? userLocalHour : (scrubbedHour ?? userLocalHour);
    let broadcastMinute = isLiveSync ? userLocalMinute : (scrubbedMinute ?? userLocalMinute);
    broadcastHour = ((broadcastHour % 24) + 24) % 24;
    broadcastMinute = ((broadcastMinute % 60) + 60) % 60;

    const broadcastTimeStr = `${String(broadcastHour).padStart(2, '0')}:${String(broadcastMinute).padStart(2, '0')}:${String(userLocalSec).padStart(2, '0')}`;

    // Calculate time offset in hours between live source clock and target broadcast time
    let offsetHours = 16;
    if (band === 'seoul_in_usa') {
      offsetHours = (seoulLiveHour - broadcastHour + 24) % 24;
    } else {
      // California in Seoul: 8-hour reverse delay
      offsetHours = (caLiveHour - broadcastHour + 24) % 24;
    }

    // Calculate if user is in zero-offset native live mode
    const isSeoulInKorea = band === 'seoul_in_usa' && (timezone.includes('Seoul') || timezone.includes('Tokyo') || timezone.includes('Asia/Seoul'));
    const isCaInCalifornia = band === 'california_in_seoul' && (timezone.includes('America/Los_Angeles') || timezone.includes('Pacific') || timezone.includes('PST') || timezone.includes('PDT') || timezone.includes('America/Tijuana') || timezone.includes('America/Vancouver'));
    const isZeroOffsetLive = isLiveSync && (offsetHours === 0 || isSeoulInKorea || isCaInCalifornia);

    // Get show currently in this KST broadcast slot
    const { currentSlot, nextSlot, elapsedMinutes } = radioDb.getShowAtKstTime(broadcastHour, broadcastMinute);
    const bufferStats = radioDb.getBufferStatus();

    res.json({
      success: true,
      data: {
        userTimezone: timezone,
        userLocalTimeStr,
        userLocalHour,
        userLocalMinute,
        userLocalSec,
        seoulLiveTimeStr,
        seoulLiveHour,
        seoulLiveMinute,
        broadcastTimeStr,
        broadcastHour,
        broadcastMinute,
        offsetHours,
        isLiveSync,
        isZeroOffsetLive,
        currentSlot,
        nextSlot,
        elapsedInSlotMinutes: elapsedMinutes,
        totalSlotMinutes: currentSlot.durationMinutes,
        bufferStats
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Time Check Signal Tone ("시보 음")
app.get('/api/audio/timecheck/:hour', (req, res) => {
  try {
    const hour = parseInt(req.params.hour, 10) || 7;
    const wavBuffer = generateTimeCheckSignal(hour);

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', wavBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(wavBuffer);
  } catch (err: any) {
    res.status(500).json({ error: 'Time check audio generation failed' });
  }
});

// API: Station Jingle Tone
app.get('/api/audio/jingle/:stationId', (req, res) => {
  try {
    const stationId = req.params.stationId || 'mbc-919';
    const wavBuffer = generateStationJingle(stationId);

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', wavBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(wavBuffer);
  } catch (err: any) {
    res.status(500).json({ error: 'Jingle audio generation failed' });
  }
});

// API: Pure TimeShift Stream & Archive Resolver
// Resolves the authentic archived broadcast using the documented 4-tier archive hierarchy,
// or seamless direct live stream when in zero-offset native live mode.
app.get('/api/stream/resolve', async (req, res) => {
  try {
    const stationId = (req.query.stationId as string) || 'mbc-919';
    const targetHour = parseInt((req.query.targetHour as string) ?? '7', 10);
    const targetMinute = parseInt((req.query.targetMinute as string) ?? '0', 10);
    const targetSecond = parseInt((req.query.targetSecond as string) ?? '0', 10);
    const band = ((req.query.band as string) || 'seoul_in_usa') as 'seoul_in_usa' | 'california_in_seoul';
    const isCamRequested = req.query.isCamRequested === 'true';
    const timezone = (req.query.timezone as string) || '';
    const isLiveSync = req.query.liveSync !== 'false';

    const isSeoulInKorea = band === 'seoul_in_usa' && (timezone.includes('Seoul') || timezone.includes('Tokyo') || timezone.includes('Asia/Seoul'));
    const isCaInCalifornia = band === 'california_in_seoul' && (timezone.includes('America/Los_Angeles') || timezone.includes('Pacific') || timezone.includes('PST') || timezone.includes('PDT') || timezone.includes('America/Tijuana') || timezone.includes('America/Vancouver'));
    const isZeroOffsetLive = isLiveSync && (isSeoulInKorea || isCaInCalifornia);

    const resolved = await resolveStream({
      stationId,
      targetHour,
      targetMinute,
      targetSecond,
      band,
      isCamRequested,
      isZeroOffsetLive
    });

    res.json(resolved);
  } catch (err: any) {
    console.error('[StreamResolve] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Audio Range Proxy
// Enables byte-range seeking for external archives that require CORS or HTTPS tunneling
app.get('/api/proxy/audio', async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).send('Missing url parameter');
  }

  try {
    const rangeHeader = req.headers.range;
    const fetchHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': '*/*'
    };
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    const upstreamRes = await fetch(targetUrl, {
      headers: fetchHeaders,
      redirect: 'follow'
    });

    res.status(upstreamRes.status);

    const headersToForward = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'cache-control'
    ];
    for (const h of headersToForward) {
      const val = upstreamRes.headers.get(h);
      if (val) res.setHeader(h, val);
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (!upstreamRes.body) {
      return res.end();
    }

    const reader = upstreamRes.body.getReader();
    req.on('close', () => {
      reader.cancel().catch(() => {});
    });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (err: any) {
    console.error('[AudioProxy] Error:', err.message);
    if (!res.headersSent) {
      res.status(500).send('Audio proxy streaming failed');
    } else {
      res.end();
    }
  }
});

// Mount Vite middleware / static files
async function initServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { port: 24680 } },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TimeShift Radio Server] Running on http://0.0.0.0:${PORT}`);
  });
}

initServer().catch((err) => {
  console.error('Failed to start server:', err);
});
