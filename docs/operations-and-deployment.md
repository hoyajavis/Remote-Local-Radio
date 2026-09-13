# TimeShift Radio: Operations, Deployment & Appliance Guide

> **DOCUMENT PURPOSE & SCOPE**  
> This operational guide covers real-world deployment on cloud providers (Render), solving HTTPS mixed-content and CORS challenges via the streaming reverse proxy, setting up standalone Progressive Web App (PWA) kitchen tablet kiosks, and troubleshooting operational telemetry states.

---

## 1. Production Deployment on Render

TimeShift Radio is architected to deploy as a unified Node.js Web Service on **Render** (or equivalent container platforms such as Google Cloud Run or Fly.io).

### 1.1 Service Configuration
* **Environment:** Node.js
* **Build Command:** `npm install && npm run build`
* **Start Command:** `npm run start` (or `npm run server`)
* **Default Port:** `3005` (dynamically overridden by `process.env.PORT` in production)
* **Health Check Endpoint:** `GET /api/timeshift/status` (returns `200 OK`)

### 1.2 Declarative Infrastructure (`render.yaml`)
```yaml
services:
  - type: web
    name: timeshift-radio
    env: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm run start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3005
```

Because TimeShift Radio uses the **Smart Hybrid Architecture (Model C)**, the server acts strictly as a lightweight metadata resolver and occasional streaming tunnel. It consumes **< 90 MB RAM** and **< 2% CPU**, fitting comfortably within Render's free hosting tier.

---

## 2. Solving Mixed-Content & CORS in Production

### 2.1 The Mixed-Content Security Challenge
Modern web browsers (Safari, Chrome, Firefox) enforce strict **Mixed Content Security**:
* When TimeShift Radio is hosted on a secure HTTPS domain (`https://timeshift-radio.onrender.com`), the browser **blocks unencrypted `http://` media streams**.
* Legacy Korean broadcast archives (such as `http://minicast.imbc.com` or `http://wizard2.sbs.co.kr`) publish MP3 enclosures over plain HTTP. Attempting to play these directly in `<audio src="http://...">` causes browser console errors and silent playback failure.

### 2.2 The Streaming Reverse Proxy Solution
To solve this without incurring disk storage costs, the Express backend provides a streaming proxy endpoint:

`GET /api/proxy/audio?url={encodeURIComponent(streamUrl)}`

```
[ Browser (HTTPS) ]
         │
         │ GET /api/proxy/audio?url=http%3A%2F%2Fminicast.imbc.com%2F...
         ▼
[ TimeShift Express Backend (HTTPS) ]
         │
         │ GET http://minicast.imbc.com/... (Internal server HTTP fetch)
         ▼
[ Broadcaster CDN (HTTP) ]
```

#### Key Operational Attributes of the Proxy:
1. **Zero Disk Caching:** Audio is piped directly from the upstream HTTP response stream to the client response stream in memory using Node.js streams.
2. **HTTP Range Tunneling:** Forwards `Range: bytes=X-Y` headers to upstream CDNs, enabling the client to seek to the exact second and receive `206 Partial Content`.
3. **Automatic Failover:** In `src/hooks/useRadioPresets.ts` and `src/components/RadioChassis.tsx`, if a direct stream fails due to CORS or network errors, the client automatically re-tunes through `/api/proxy/audio`.

---

## 3. PWA & Standalone Kitchen Counter Kiosk Setup

TimeShift Radio is optimized for the **Homesick Homemaker** using an iPad or tablet propped up on a kitchen counter stand while cooking.

### 3.1 Installing as a Standalone Web App
1. Open TimeShift Radio in Safari (iOS/iPadOS) or Chrome (Android).
2. Tap the **Share** button (iOS) or **Menu** (Android).
3. Select **"Add to Home Screen"**.
4. Launch the app from the newly created home screen icon:
   * Opens in **standalone fullscreen mode** without Safari URL bars, tabs, or navigation buttons.
   * Renders the retro Costel kitchen appliance chassis edge-to-edge.

---

### 3.2 Screen Wake Lock API Integration
Cooking involves wet or messy hands, making it frustrating if the screen goes dark every 2 minutes:
* The application automatically requests a system wake lock via `navigator.wakeLock.request('screen')` when the radio is powered on.
* **Visibility Re-acquisition:** If the user switches tabs or minimizes the browser and returns, `useWakeLock` automatically detects `document.visibilitychange` and re-acquires the lock.
* When the user powers off the radio, the wake lock is released immediately to conserve battery.

---

### 3.3 MediaSession API (Lock-Screen & Bluetooth Controls)
When the radio is playing, TimeShift Radio registers metadata with the operating system's `navigator.mediaSession`:
* **Title:** Active show title (e.g. *Good Morning FM Tei* or *KAZU Morning Edition*).
* **Artist:** Radio station name and frequency (e.g. *MBC FM4U 91.9 MHz*).
* **Album:** Current daypart (e.g. *Morning Commute* or *Late Night Groove*).
* **Controls:** Lock-screen and Bluetooth speaker buttons (Play, Pause, Next Preset, Previous Preset) map directly to radio preset navigation.

---

## 4. Dedicated Kitchen Radio Appliance Hardware Guide

For users wanting a permanent physical kitchen radio appliance (recreating under-cabinet consoles made by Korean brands like **Costel**):

```
┌─────────────────────────────────────────────────────────────┐
│             UNDER-CABINET MOUNT / COUNTER STAND             │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  7" or 10" Tablet / Touchscreen Display             │   │
│   │                                                     │   │
│   │   [ VFD FREQUENCY ]  [ TACTILE PRESETS 1 - 6 ]      │   │
│   │   [ STUDIO CAM    ]  [ AMBER 7-SEGMENT CLOCK ]      │   │
│   └─────────────────────────────────────────────────────┘   │
│                              │                              │
│               3.5mm AUX Out / Bluetooth 5.0                 │
│                              ▼                              │
│         [ Under-Cabinet Stereo Kitchen Speakers ]           │
└─────────────────────────────────────────────────────────────┘
```

### Hardware Deployment Options:

#### Option A: Dedicated Tablet Stand (Recommended)
* **Hardware:** Any 8"–10" iPad or budget Android tablet (e.g., Galaxy Tab A9, Amazon Fire HD with Google Play).
* **Mounting:** Magnetic under-cabinet bracket or heavy weighted counter stand.
* **Audio:** Connected to Bluetooth 5.0 kitchen speakers or 3.5mm AUX input.
* **Software:** Add to Home Screen in fullscreen PWA mode with Screen Wake Lock enabled.

#### Option B: Raspberry Pi Kitchen Radio
* **Hardware:** Raspberry Pi 4 Model B (2 GB) + Official Raspberry Pi 7" Touchscreen Display.
* **OS:** Raspberry Pi OS Lite + Chromium browser.
* **Kiosk Command:**
  ```bash
  chromium-browser \
    --noerrdialogs \
    --disable-infobars \
    --kiosk \
    --app=http://localhost:3005
  ```

---

## 5. Operational Telemetry & Troubleshooting

The retro Vacuum Fluorescent Display (VFD) on the radio chassis acts as a real-time telemetry monitor:

```
[ IDLE ] ──(Select Preset)──► [ TUNING ] ──► [ BUFFERING ] ──► [ PLAYING ]
                                                   │                 │
                                                   │ (Network lag)   │ (Stream stall)
                                                   ▼                 ▼
                                             [ RECONNECTING ] ◄─ [ STALLED ]
                                                   │
                                                   │ (3 retries failed)
                                                   ▼
                                               [ ERROR ]
```

### 5.1 The 8 VFD State Definitions

| VFD Telemetry State | Display Appearance | Description & Operational Behavior |
| :--- | :--- | :--- |
| `IDLE` | Dim amber standby clock | Chassis is powered off. Audio element is unloaded. |
| `TUNING` | Blinking cyan frequency | Client is querying `/api/stream/resolve/:stationId` for active URLs and seek offset. |
| `BUFFERING` | Pulsing phosphor bar | Stream URL resolved; HTML5 `<audio>` is pre-buffering initial byte chunks. |
| `PLAYING` | Bright cyan active frequency | Audio is actively rendering through speakers. Intra-hour seek locked. |
| `STALLED` | Amber `STALLED` indicator | Broadcaster CDN buffer under-run or transient network drop detected. |
| `RECONNECTING` | Flashing cyan `RECONNECT` | Exponential backoff reconnect in progress (Retry 1: 1s, Retry 2: 2s, Retry 3: 4s). |
| `ERROR` | Red/Amber `ERR-STREAM` | Stream unreachable after 3 retries; switches automatically to proxy failover. |
| `PAYWALLED` | Steady amber `PAYWALLED` | Station requires paid subscription (e.g. KPIG 107.5). Playback safely suspended. |

---

### 5.2 Common Operational Issues & Remediation

#### 1. Audio Fails to Play on Initial Tap (iOS Safari / Chrome)
* **Symptom:** VFD stays on `TUNING` or `BUFFERING` and no sound plays.
* **Cause:** Browser **Autoplay Policy** requires explicit user interaction before playing audio.
* **Remediation:** Ensure playback is triggered by pressing a physical power or preset button on the chassis. Do not trigger audio playback purely on initial page load.

#### 2. Sound Stutters or Cuts Out on Legacy Stations
* **Symptom:** Frequent `STALLED` and `RECONNECTING` states on MBC or SBS.
* **Cause:** Direct CDN connection was blocked by mixed-content or rate-limited.
* **Remediation:** The client automatically fails over to the `/api/proxy/audio` reverse proxy tunnel, which normalizes chunk delivery and bypasses client-side CORS checks.

#### 3. YouTube Studio CAM Shows "Video Unavailable"
* **Symptom:** Video frame displays YouTube error message.
* **Cause:** Broadcaster made the live studio stream private or changed playlist IDs.
* **Remediation:** The appliance audio-video handshake handles this gracefully: close the Studio CAM modal and background broadcast MP3 audio continues playing without interruption.
