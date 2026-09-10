import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { radioDb } from './server/database.js';
import { generateBroadcastSegment, generateTimeCheckSignal, generateStationJingle } from './server/audioGenerator.js';

const app = express();
const PORT = 3000;

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
  res.json({
    success: true,
    stations: radioDb.getStations()
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
app.post('/api/schedule', (req, res) => {
  try {
    const { schedule } = req.body;
    if (!Array.isArray(schedule)) {
      return res.status(400).json({ error: 'Invalid schedule array' });
    }
    const updated = radioDb.saveSchedule(schedule);
    res.json({ success: true, schedule: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save schedule' });
  }
});

// API: Add or update single slot
app.post('/api/schedule/slot', (req, res) => {
  try {
    const slot = req.body;
    if (!slot || !slot.id || slot.startHour === undefined) {
      return res.status(400).json({ error: 'Missing required slot fields' });
    }
    const updated = radioDb.addOrUpdateSlot(slot);
    res.json({ success: true, schedule: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Delete slot
app.delete('/api/schedule/:id', (req, res) => {
  try {
    const updated = radioDb.deleteSlot(req.params.id);
    res.json({ success: true, schedule: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Reset schedule to default Korean broadcaster schedule
app.post('/api/schedule/reset', (req, res) => {
  try {
    const updated = radioDb.resetSchedule();
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

    // Target broadcast time:
    // If LiveSync: The target broadcast is the Seoul time that equals userLocalHour:userLocalMinute!
    // For example: 7:00 AM California -> 7:00 AM Seoul broadcast!
    let broadcastHour = isLiveSync ? userLocalHour : (scrubbedHour ?? userLocalHour);
    let broadcastMinute = isLiveSync ? userLocalMinute : (scrubbedMinute ?? userLocalMinute);
    broadcastHour = ((broadcastHour % 24) + 24) % 24;
    broadcastMinute = ((broadcastMinute % 60) + 60) % 60;

    const broadcastTimeStr = `${String(broadcastHour).padStart(2, '0')}:${String(broadcastMinute).padStart(2, '0')}:${String(userLocalSec).padStart(2, '0')}`;

    // Calculate time offset in hours between live Seoul time and broadcast time
    let offsetHours = seoulLiveHour - broadcastHour;
    if (offsetHours < 0) offsetHours += 24;

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

// API: Audio Segment Stream
// Returns a 6-second synthesized or buffered audio segment for the given station, hour, and index
app.get('/api/audio/segment/:stationId/:kstHour/:segmentId', (req, res) => {
  try {
    const stationId = req.params.stationId || 'mbc-919';
    const kstHour = parseInt(req.params.kstHour, 10) || 7;
    const segmentId = parseInt(req.params.segmentId, 10) || 0;

    const wavBuffer = generateBroadcastSegment(stationId, kstHour, segmentId, 6);

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', wavBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Accept-Ranges', 'bytes');
    res.send(wavBuffer);
  } catch (err: any) {
    console.error('Audio segment error:', err);
    res.status(500).json({ error: 'Audio segment generation failed' });
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

// Mount Vite middleware / static files
async function initServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
