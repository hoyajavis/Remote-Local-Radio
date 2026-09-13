# TimeShift Radio: Operations, Deployment & Appliance Guide

> **DOCUMENT PURPOSE & SCOPE**  
> This operational guide covers real-world production deployment on Google Cloud Run and Render, solving HTTPS mixed-content and CORS challenges via the streaming reverse proxy, setting up standalone Progressive Web App (PWA) kitchen tablet kiosks, and troubleshooting operational telemetry states.

---

## 1. Production Deployment on Google Cloud Run (Recommended)

Google Cloud Run provides serverless container execution with near-instant cold starts (~1.5 seconds vs. 30–50 seconds on Render free tier), automatic HTTPS, and full coverage under Google Cloud's permanent Free Tier (2 million requests/month and 360,000 vCPU-seconds).

### 1.1 Container Architecture
The repository includes a multi-stage, production-optimized `Dockerfile`:
* **Builder Stage:** Uses `node:20-alpine` to install all dependencies and run `npm run build` (compiling the Vite React SPA and bundling `server.ts` via esbuild into `dist/server.cjs`).
* **Runner Stage:** Minimal Alpine runtime containing only production dependencies (`npm ci --omit=dev`), `dumb-init` for clean PID 1 signal forwarding, and the compiled `dist/` and `data/` directories.
* **Unprivileged User:** Runs under the unprivileged `node` user.
* **Port Configuration:** Binds dynamically to the `PORT` environment variable provided by Cloud Run (default `8080`).

### 1.2 Step-by-Step Continuous Deployment via Google Cloud Console

Because Cloud Run integrates with Google Cloud Build, **no local Docker or gcloud CLI installation is required on your workstation**:

1. **Navigate to Cloud Run:**
   * Go to the [Google Cloud Console](https://console.cloud.google.com/).
   * Select your project with billing enabled.
   * Open the **Cloud Run** dashboard.

2. **Create Service:**
   * Click **"Create Service"**.
   * Under *Deployment platform*, select **"Continuously deploy from a repository"**.
   * Click **"SET UP WITH CLOUD BUILD"**.

3. **Connect GitHub:**
   * Choose **GitHub** as the provider.
   * Authorize Google Cloud Build to access your GitHub account.
   * Select repository: **`hoyajavis/Remote-Local-Radio`**.
   * Branch: **`^main$`**.
   * Build Type: Select **`Dockerfile`** (Source location: `/Dockerfile`).
   * Click **Save**.

4. **Configure Service Settings:**
   * **Service Name:** `timeshift-radio`
   * **Region:** Select `us-central1` (Iowa) or your preferred geographic region.
   * **Authentication:** Select **"Allow unauthenticated invocations"** (allows public access from your mobile devices and tablets).
   * Expand **Container, Networking, Security**:
     * **Container Port:** `8080`
     * **Memory:** `512 MiB` (TimeShift Radio uses ~85 MiB)
     * **CPU:** `1 vCPU`
     * **Execution Environment:** Default
     * **Auto-scaling:**
       * Minimum instances: `0` (sleeps when not in use; $0 cost)
       * Maximum instances: `2` (prevents unexpected spikes)
       * Maximum requests per instance (Concurrency): `80`

5. **Deploy:**
   * Click **"Create"**.
   * Cloud Build will automatically clone the repository, build the container, register it in Artifact Registry, and launch your live service.
   * Within 2 minutes, Google Cloud Run will display your permanent public HTTPS URL (e.g. `https://timeshift-radio-xxxxxx-uc.a.run.app`).

6. **Automated Continuous Delivery:**
   * Every future `git push origin main` automatically triggers a new Cloud Build and updates the live service with zero downtime.

---

## 2. Production Deployment on Render (Alternative)

TimeShift Radio also supports direct declarative deployment on **Render**:

### 2.1 Declarative Infrastructure (`render.yaml`)
```yaml
services:
  - type: web
    name: timeshift-radio
    env: node
    plan: free
    region: oregon
    buildCommand: npm install && npm run build
    startCommand: npm run start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3005
```

* **Setup:** Log into [Render.com](https://render.com), click **New Web Service**, connect `Remote-Local-Radio`, and deploy.
* **Note:** Render free instances spin down after 15 minutes of inactivity (~30s wake delay on first daily request).

---

## 3. Solving Mixed-Content & CORS in Production

### 3.1 The Mixed-Content Security Challenge
Modern web browsers (Safari, Chrome, Firefox) enforce strict **Mixed Content Security**:
* When TimeShift Radio is hosted on a secure HTTPS domain (e.g., `https://timeshift-radio-xxxx.a.run.app`), the browser **blocks unencrypted `http://` media streams**.
* Legacy Korean broadcast archives (such as `http://minicast.imbc.com` or `http://wizard2.sbs.co.kr`) publish MP3 enclosures over plain HTTP. Attempting to play these directly in `<audio src="http://...">` causes browser console errors and silent playback failure.

### 3.2 The Streaming Reverse Proxy Solution
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

## 4. PWA & Standalone Kitchen Counter Kiosk Setup

TimeShift Radio is optimized for the **Homesick Homemaker** using an iPad or tablet propped up on a kitchen counter stand while cooking.

### 4.1 Installing as a Standalone Web App
1. Open your Cloud Run HTTPS URL in Safari (iOS/iPadOS) or Chrome (Android).
2. Tap the **Share** button (iOS) or **Menu** (Android).
3. Select **"Add to Home Screen"**.
4. Launch the app from the newly created home screen icon:
   * Opens in **standalone fullscreen mode** without Safari URL bars, tabs, or navigation buttons.
   * Renders the retro Costel kitchen appliance chassis edge-to-edge.

### 4.2 Screen WakeLock API
The appliance integrates the browser `navigator.wakeLock` API (`src/hooks/useWakeLock.ts`). While audio is actively playing, the device screen is prevented from dimming or locking, allowing hands-free viewing of the station name, frequency, and real-time metadata while cooking.

---

## 5. Dedicated Kitchen Radio Appliance Hardware Guide

For building a dedicated, permanent kitchen counter audio appliance using a recycled tablet or low-cost SBC:

### 5.1 Recommended Appliance Hardware
* **Primary Screen:** Refurbished iPad (Air 2 or newer) or 10-inch Android Tablet ($40–$80).
* **Stand / Mount:** Heavy aluminum countertop stand with non-slip silicone feet.
* **Audio Output:** Auxiliary 3.5mm line-out or Bluetooth 5.0 connection to countertop powered stereo speakers (e.g. Edifier, Audioengine, or soundbar).
* **Power:** Continuous USB-C / Lightning cable connected to under-cabinet kitchen outlet.

### 5.2 iOS Guided Access Kiosk Mode
To lock the tablet permanently into TimeShift Radio:
1. Go to **Settings** $ightarrow$ **Accessibility** $ightarrow$ **Guided Access** $ightarrow$ Enable.
2. Open TimeShift Radio from the Home Screen.
3. Triple-click the Top / Home button and tap **Start**.
4. The tablet is now locked into TimeShift Radio with hardware buttons, home gestures, and notifications disabled.

---

## 6. Troubleshooting Operational Telemetry States

The tuner features an 8-state telemetry engine:

```
  [ IDLE ] ──(Power / Preset)──► [ TUNING ] ──(URL Resolved)──► [ BUFFERING ]
                                                                      │
                                                                      ▼
                                                                [ PLAYING ]
                                                                      │
                                                ┌─────────────────────┴─────────────────────┐
                                                │                                           │
                                                ▼                                           ▼
                                          [ STALLED ] ──(Buffer Recovered)────────────► [ PLAYING ]
                                                │
                                                │ (Reconnection backoff)
                                                ▼
                                         [ RECONNECTING ] ──(Stream Re-established)───► [ PLAYING ]
                                                │
                                                │ (Max retries exceeded)
                                                ▼
                                            [ ERROR ] (Proxy Failover)
```

### 6.1 The 8 VFD State Definitions

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

### 6.2 Common Operational Issues & Remediation

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
