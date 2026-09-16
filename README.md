# 📻 TimeShift Radio (Remote Local Radio)

> **Authentic, time-synchronized local radio broadcast across timezones.**  
> Listen to Seoul in California, or California in Seoul, synchronized to the listener's local daily routine.

---

## 🌟 Overview & Mission

**TimeShift Radio** recreates the authentic acoustic experience of living in another city by time-shifting real radio broadcasts. Rather than playing static podcasts from the beginning or tuning in to foreign radio in the middle of the night, TimeShift Radio aligns programming to your actual local routine.

### Primary User Personas

1. **The Homesick Homemaker (California, USA $\rightarrow$ Seoul, South Korea)**  
   A Korean homemaker in California who prepares breakfast at 7:30 AM PDT and wants the warm, familiar soundscape of Seoul morning commuter radio (*Good Morning FM*, lively DJ banter, morning traffic/weather, and top-of-the-hour *시보* chimes) playing from a kitchen counter tablet.
2. **The Relocating Family (Seoul, South Korea $\rightarrow$ California, USA)**  
   A family in Seoul preparing to move to California who wants to immerse themselves in authentic Central Coast English conversational cadence, local news (KAZU 90.3 NPR, KQED 89.3), community talk (KSQD 90.7, KZSC 88.1), and regional music culture.

---

## 🏗️ Architecture: The Smart Hybrid Engine

TimeShift Radio operates on a **Smart Hybrid Architecture (Model C + Live Direct + YouTube Studio CAM)** that delivers authentic broadcast radio with **$0.00/month infrastructure cost**:

```
                               ┌──────────────────────────────────────────────┐
                               │           TIMESHIFT RADIO CLIENT             │
                               │  (Costel Appliance Chassis / Dual TFT-VFD)   │
                               └───────┬───────────────────────────────┬──────┘
                                       │                               │
            1. Metadata & Seek Offset  │                               │ 2. Direct HTTP 206 Audio Stream
                        GET /resolve   │                               │    Range: bytes=...
                                       ▼                               ▼
                      ┌─────────────────────────────────┐   ┌────────────────────────────────┐
                      │    TIMESHIFT NODE.JS BACKEND    │   │    OFFICIAL BROADCASTER CDNs   │
                      │    (Port 3005 / Render Tier)    │   │  (MBC, SBS, KBS, NPR, KSQD)    │
                      │ • Sub-minute Intra-Hour Math    │   │ • 0 GB Server Audio Storage    │
                      │ • 4-Tier Stream Resolver        │   │ • 0 GB Server Egress Bandwidth │
                      │ • Reverse Proxy (CORS Tunnel)   │   │ • Byte-Range Seekable MP3/AAC  │
                      └─────────────────────────────────┘   └────────────────────────────────┘
                                       │
                                       ▼
                      ┌─────────────────────────────────┐
                      │   YOUTUBE VISIBLE RADIO VODS    │
                      │ • Studio CAM Video Overlay      │
                      │ • Audio-Video Mute Handshake    │
                      └─────────────────────────────────┘
```

### The 4-Tier Stream Resolution Engine

When a station is selected at time $T$, `/api/stream/resolve/:stationId` resolves audio via four resilient tiers:
1. **Tier 1 (AOD / Podcast RSS):** Official broadcaster on-demand daypart feeds (MBC minicast, SBS Wizard, KBS MediaFactory, NPR One). Client seeks to the exact minute and second using HTTP Range 206 byte requests.
2. **Tier 3 (YouTube Visible Radio VOD):** Flagship morning shows recorded with in-studio cameras (*봉춘라디오*, *에라오*, *CoolFM*). Synchronized to the intra-hour second inside a kitchen studio monitor overlay.
3. **Tier 4 (Station Continuity Loop):** Verified, high-bitrate station archive loop providing authentic local continuity if a specific daypart episode is delayed.
4. **Live Direct (Native HLS / Icecast):** Official, open CDN edge streams (`.m3u8`, MP3, AAC) for public stations, news broadcasts, and community radio.
* **Streaming Reverse Proxy (`/api/proxy/audio`):** Lightweight streaming tunnel forwarding `Range: bytes=X-Y` headers to resolve HTTPS mixed-content blocks and CORS restrictions for legacy broadcaster feeds without disk caching.

---

## 🎛️ Hardware Aesthetic & Dual-Engine Display Architecture

TimeShift Radio emulates a high-end vintage audio receiver inspired by Korean under-cabinet kitchen consoles (**Costel**) and classic Japanese hi-fi separates:

* **Dual-Band Rocker**: Instantly flips tuner circuitry between **Seoul (Korea)** and **California (USA)** bands.
* **Bi-directional Tactile SEEK Rocker**: Stepped frequency search across channel rasters with auto-wrap.
* **Mechanical Presets 1–6**: Tactile pushbuttons with illuminated LED rings and long-press custom channel programming.
* **Amber STN LCD Auxiliary Clock**: Dedicated 24-hour clock displaying market time (`HH:MM:SS`), active timezone label (`KST` / `PST`), and simulated passive liquid crystal ghost segments.
* **Color TFT vs. Vacuum VFD Modes**: Toggle between modern high-contrast color studio TFT and retro Vacuum Fluorescent Display (VFD) with Gaussian phosphor bloom.
* **Main Display Typography Refactor**:
  * **Top Annunciators**: Clean carrier lock (`TUNED` + 4-bar dynamic signal meter) and standardized source tally badges (`LIVE ON-AIR`, `TIMESHIFT [Replay]`, `TIMESHIFT [AOD]`, `🔒 PAYWALLED`). Redundant `STEREO`, `CH [01-06]`, and `FM/AM` removed.
  * **DSEG7 Frequency Display**: Active digits right-aligned with mathematical precision over ghost `888.8` background cells.
  * **Metadata Lines 2 & 3**: Unified left/right bounds (`flex-1 min-w-0`), dynamic metadata prioritization (Presenter $\rightarrow$ Corner $\rightarrow$ Guests $\rightarrow$ Subtitle $\rightarrow$ Telemetry), smooth marquee autoscrolling, and zero cumulative layout shift (0 CLS).
* **Option 1 Localization Architecture**:
  * **Universal Hardware English**: All physical buttons, knobs, annunciators, and OSD alerts follow international audio manufacturing standards (Costel, Sony, Marantz) in clean industrial English.
  * **Authentic Native Station Identity**: Seoul stations are identified in Korean; California stations in American English—eliminating synthetic translation distortions.
  * **Decoupled User Guide Switcher**: Dedicated `[ English | 한국어 ]` toggle embedded directly in the "How It Works" help modal.
* **Top-of-the-Hour *시보* Chimes**: Client-side Web Audio synthesis of national standard HLA 440/880Hz triple time pips and MBC electric piano chimes at `:59:57` preceding track transition.
* **Visible Radio Studio CAM**: Toggling the studio camera overlays the live in-studio video feed with an automated audio-video mute handshake.

---

## 🔊 Audio DSP Emulation Lab

Integrated Web Audio DSP signal processing chain shaping acoustic playback in real time:

1. **Studio Hi-Fi**: Full-range 20Hz – 20kHz linear reproduction with subtle broadcast leveling.
2. **Warm Tube**: +2.5dB low-shelf warmth at 120Hz, gentle HF roll-off above 12kHz, and polynomial saturation for even-order harmonic distortion.
3. **Tabletop**: Mid-range vocal presence (+3dB at 1.2kHz) with low-end rumble cut below 100Hz for countertop acoustics.
4. **Vintage AM**: Steep bandpass filter (350Hz – 3.8kHz), high-ratio dynamic compression, and subtle asymmetric non-linear clipping recreating superheterodyne AM radio character.

---

## 📻 The 26-Station Directory

### Seoul Stations (15 Stations)
| Station Name | Frequency / ID | Network | Format | Primary Tier | Visible CAM |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **MBC FM4U** | 91.9 MHz (`mbc-919`) | Munhwa Broadcasting Corp | K-Pop, Music & Morning Shows | `tier1_rss` | Yes |
| **SBS Power** | 107.7 MHz (`sbs-1077`) | Seoul Broadcasting System | Music, Comedy & Prime Morning Talk | `tier1_rss` | Yes |
| **KBS Cool** | 89.1 MHz (`kbs-891`) | Korean Broadcasting System | Popular Hits & Youth Culture | `tier1_rss` | Yes |
| **TBS FM** | 95.1 MHz (`tbs-951`) | Seoul Traffic Broadcasting | Seoul News, Traffic & Public Talk | `tier1_rss` | No |
| **CBS Music** | 93.9 MHz (`cbs-939`) | Christian Broadcasting System| Pop, Classical & Vocal Music | `live_direct` | No |
| **EBS FM** | 104.5 MHz (`ebs-1045`)| Educational Broadcasting System| Education, Culture & Language | `tier1_rss` | No |
| **KBS Classic**| 93.1 MHz (`kbs-931`) | Korean Broadcasting System | Classical Arts & Fine Music | `live_direct` | No |
| **KBS Happy** | 106.1 MHz (`kbs-1061`)| Korean Broadcasting System | Popular Golden Hits & Retro Talk | `live_direct` | No |
| **TBS eFM** | 101.3 MHz (`tbs-1013`)| Seoul Traffic Broadcasting | English-Language Seoul News & Culture | `live_direct` | No |
| **AFN The Eagle**| 88.5 MHz (`afn-885`)| American Forces Network Korea | American Pop, Rock & Pacific News | `live_direct` | No |
| **YTN News FM**| 94.5 MHz (`ytn-945`) | YTN News Network | 24/7 Rolling News, Politics & Economy | `live_direct` | No |
| **MBC Standard**| 95.9 MHz (`mbc-959`)| Munhwa Broadcasting Corp | Current Affairs, Talk & Economy | `live_direct` | No |
| **KBS Radio 1** | 97.3 MHz (`kbs-973`)| Korean Broadcasting System | Public Journalism & Policy Debate | `live_direct` | No |
| **CBS Standard**| 98.1 MHz (`cbs-981`)| Christian Broadcasting System| Investigative Journalism & News Show | `live_direct` | No |
| **SBS Love FM** | 103.5 MHz (`sbs-1035`)| Seoul Broadcasting System | Commercial Political Talk & Variety | `live_direct` | No |

### California Stations (11 Stations)
| Station Name | Frequency / ID | City / Network | Format | Primary Tier | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **KAZU** | 90.3 FM (`kazu-903`) | Monterey / NPR | NPR News & Central Coast Talk | `tier1_rss` | Verified CDN |
| **KSQD** | 90.7 FM (`ksqd-907`) | Santa Cruz / Monterey | Community Independent & Public Affairs | `tier4_continuity` | 14-day archive |
| **KZSC** | 88.1 FM (`kzsc-881`) | UC Santa Cruz / Monterey | College Independent & Underground | `live_direct` | Open Icecast |
| **KQED / KQEI** | 89.3 FM (`kqei-893`) | Northern California / NPR | Northern CA Public Radio & News | `live_direct` | KQED Network |
| **SmoothJazz.com**| 100.1 FM (`smoothjazz-100`)| Carmel-by-the-Sea | Smooth Jazz & Coastal Lounge | `live_direct` | 128k MP3 CDN |
| **KWAV** | 96.9 FM (`kwav-969`) | Monterey / Salinas | Adult Contemporary Pop Hits | `live_direct` | K-Wave 96.9 |
| **KDON** | 102.5 FM (`kdon-1025`)| Salinas / Monterey | Top 40 & Mainstream Hits | `live_direct` | iHeartMedia |
| **K-Ocean** | 105.1 FM (`kocn-1051`)| Pacific Grove / Monterey | Rhythmic Oldies & Classic Hits | `live_direct` | K-Ocean 105.1 |
| **KPIG** | 107.5 FM (`kpig-1075`)| Freedom / Monterey Bay | Legendary Americana & Blues | `isPaywalled` | Gated Subscription |
| **KTOM** | 92.7 FM (`ktom-927`) | Salinas / Marina | Today's Country Hits | `live_direct` | Country Hits |
| **KDFC** | 89.9 FM (`kdfc-899`) | Monterey / San Francisco | Classical Radio California | `live_direct` | Classical Arts |

---

## 🚀 Quickstart & Development

### Prerequisites
* **Node.js**: v18.0 or higher
* **npm**: v9.0 or higher

### Installation & Run

```bash
# Clone repository
git clone https://github.com/hoyajavis/remote-local-radio.git
cd remote-local-radio

# Install dependencies
npm install

# Start development server (Port 3005)
npm run dev
```

Open your browser to **`http://localhost:3005`**.

> [!NOTE]
> TimeShift Radio runs on **Port 3005** to avoid conflicts with common web frameworks.

---

## 🧪 Testing Architecture

Automated dual-layer test harness:

```bash
# Run Vitest unit & component test suite (57 tests)
npm test

# Run end-to-end persona test suite (29 tests)
npm run test:personas

# Run full automated test suite (all 86 tests)
npm run test:all

# Run TypeScript typecheck
npm run lint

# Production bundle build
npm run build
```

**Test Coverage Summary: 86 / 86 tests passing (100%)**
* **57 Vitest tests**: Unit tests for custom hooks (`useTimeShiftClock`, `useRadioPresets`, `useWakeLock`), component tests (`RadioChassis`, `VisibleRadioModal`), audio seek calculations, and resilience state machine transitions.
* **29 Persona tests**: Validates real-world listening journeys for both the Homesick Homemaker and Relocating Family personas across all 21 stations.

---

## 📚 Comprehensive Documentation

For deep technical details, explore our specifications in `docs/`:

* 🧭 **[Architecture & Evolution Guide](docs/architecture-and-evolution.md)**: Audience persona journeys, comparative sizing models, and architecture evolution.
* ⚙️ **[Engineering & API Specifications](docs/engineering-specs.md)**: Intra-hour seek synchronization math, complete 21-station directory details, AOD/RSS endpoints, and reverse proxy mechanics.
* 🚀 **[Operations, Deployment & Appliance Guide](docs/operations-and-deployment.md)**: Render Web Service production setup, HTTPS mixed-content tunneling, PWA iPad kitchen counter kiosk setup, Screen WakeLock, and telemetry troubleshooting.

---

## 📄 License
MIT License. Content and broadcast streams are copyright their respective broadcasters (MBC, KBS, SBS, TBS, CBS, EBS, KAZU, KSQD, KZSC, KQED, KDFC, iHeartMedia, Stephens Media Group).
