# TimeShift Radio: Architecture & Evolution Guide

> **DOCUMENT PURPOSE & SCOPE**  
> This document details the strategic vision, audience personas, architectural evolution, and comparative sizing models for TimeShift Radio. It documents the six evaluated engineering paths, provides a comparative analysis against superseded architectures, and tracks the completed implementation roadmap.

---

## 1. The Problem Space & User Personas

Standard radio streaming applications fail users who desire a connection to an overseas home or future destination:
* **Live Streaming Fails:** Tuning in live to a foreign station means listening to middle-of-the-night infomercials or static when you are having morning coffee.
* **Podcast Apps Fail:** Podcast episodes always start at `00:00:00`, lack the top-of-the-hour *시보* time pips, strip out music and ads, and eliminate the continuous, serendipitous feeling of live broadcasting.

TimeShift Radio solves this through time-synchronized replay tailored to two primary personas:

### Persona 1: The Homesick Homemaker
* **User Profile:** A Korean homemaker living in California (e.g. Monterey Bay, Silicon Valley, or Los Angeles).
* **Listening Scenario:** Preparing breakfast and packing lunchboxes at 7:30 AM PDT.
* **Emotional Need:** Craves the comforting, familiar background soundscape of Seoul morning commuter radio (*Good Morning FM*, lively DJ banter, familiar Korean commercials, morning traffic/weather, and top-of-the-hour *시보* chimes).
* **Device Context:** An iPad or tablet propped up on a kitchen counter stand, running continuously while hands are busy cooking and washing dishes.

### Persona 2: The Relocating Family
* **User Profile:** A Korean family in Seoul preparing to relocate to California (e.g. Monterey County).
* **Listening Scenario:** Tuning in during their morning routine (8:00 AM KST) or evening dinner.
* **Emotional Need:** Wants authentic immersion in everyday American English conversational cadence, local Central Coast news (KAZU 90.3 NPR), community talk and independent music (KSQD 90.7, KZSC 88.1), and regional culture before arriving.
* **Device Context:** Home speakers, kitchen counter tablet, or mobile browser.

---

## 2. Exploration of the 6 Architectural Paths

During system design, six distinct content and delivery paths were evaluated:

| # | Architecture Path | Primary Content Source | Content Authenticity | Maintenance Burden | Server Storage & Egress Cost | Production Role |
| :- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **YouTube Visible Radio VODs** | Official broadcaster YouTube channels (*봉춘라디오*, *에라오*, *CoolFM*) | **100% Full Music** + In-studio camera video feed | Low (Official YouTube v3 API) | **$0 / month** (Offloaded to YouTube CDN) | **Active (Studio CAM)** |
| **2** | **Broadcaster In-App AOD** | Internal APIs of *MBC mini*, *KBS KONG*, *SBS Gorilla* | **100% Full Audio** (Exact live copy: ads, pips, songs) | **Very High** (Dynamic JWT rotation, anti-bot IP blocks) | **$0 / month** (Offloaded to broadcaster CDNs) | **Superseded (Brittle)** |
| **3** | **Open Broadcaster Podcast/AOD RSS** | Public RSS syndication (MBC minicast, SBS Wizard, KBS MediaFactory, NPR) | **Speech/Talk 100%**, Music selectively edited | **Very Low** (Static XML feeds, public CDN MP3s) | **$0 / month** (Direct client-to-CDN HTTP streaming) | **Active (Tier 1 AOD)** |
| **4** | **Station Rolling Archives** | Community archives (KSQD 90.7 RadioRethink 14-day history, Spinitron) | **100% Full Broadcast** (Complete unedited recording) | **Very Low** (Public HTTP archive endpoints with CORS) | **$0 / month** (Direct streaming from station archive) | **Active (Tier 4 Archive)**|
| **5** | **Continuous Live Ingest & Rolling Buffer** | 24/7 FFmpeg capture from live HLS/Icecast into cloud S3 circular buffer | **100% Full Broadcast** (Every second captured) | **High** (Server health, FFmpeg crash restarts, S3 pruning) | **~$25–$50 / month** (VPS compute + object storage + egress) | **Superseded (Costly)** |
| **6** | **Open Community Directories & Relays** | Radio-Browser.info API & IPTV-org community playlists | Variable (Depends on individual community stream) | Low-Medium (Requires dynamic fallback resolver) | **$0 / month** (Streamed from open mirrors) | **Active (Live Edge Fallback)**|

---

## 3. Comparative Sizing Models & Selection Rationale

Three distinct architectural models were mathematically sized and evaluated for deployment:

### Architectural Sizing Summary Matrix

| Metric / Dimension | Model A: Procedural Synthesis *(Superseded)* | Model B: Live Rolling Capture Buffer *(Superseded)* | Model C: Smart Hybrid Engine *(Selected Production)* |
| :--- | :--- | :--- | :--- |
| **Audio Source** | Mathematical synthesis in RAM (`server/audioGenerator.ts`) | Continuous FFmpeg stream capture (`docs/sources.md`) | Official Broadcaster AOD/RSS, Live CDNs & YouTube VODs |
| **Audio Codec & Bitrate** | 16-bit Linear PCM @ **352.8 kbps** | AAC-LC @ **128 kbps** (or Opus @ 64 kbps) | MP3 / AAC @ **128–192 kbps** |
| **Server Audio Storage** | **0 GB** (Synthesized on-the-fly in RAM) | **~5.52 GB** (4 stations $\times$ 24h rolling S3 buffer) | **0 GB** (Audio hosted on broadcaster CDNs) |
| **Server Ingest Compute** | **< 2% of 1 vCPU** (Single-pass buffer generation) | **Continuous 15–25% CPU** (Headless FFmpeg capture) | **0%** (Zero background stream capture processes) |
| **Bandwidth / User / Hour** | **~158.8 MB** (Uncompressed PCM) | **~57.6 MB** (AAC 128k) | **< 50 KB from server** (Audio streams direct from CDN) |
| **Total Bandwidth (5 users / mo)** | **~59.5 GB** (Streamed from server) | **~21.6 GB** (AAC egress from VPS/S3) | **< 50 MB** (Server only delivers JSON metadata) |
| **Peak Concurrent Outflow** | **1.76 Mbps** (5 concurrent listeners) | **0.64 Mbps** (AAC 128k) | **< 10 kbps** (API calls only) |
| **Music Completeness** | Synthetic melodic FM loops | 100% full broadcast | 100% (YouTube VOD) / ~85% (Podcast RSS) |
| **Monthly Infrastructure Cost**| **$0.00 / month** | **~$25.00 – $50.00 / month** (Cloud VPS + S3 + egress) | **$0.00 / month** (Comfortably fits free cloud tiers) |

---

### Detailed Comparison Against Superseded Architectures

#### 1. Why Model A (Procedural Audio Synthesis) was Superseded
* **What it was:** A Node.js memory synthesis engine (`server/audioGenerator.ts`) generating 352.8 kbps 16-bit PCM WAV chunks with mathematical sine carrier waves, chord progressions, white-noise FM hiss, and hourly time pips.
* **Why it was replaced:** While technically interesting and zero-dependency, procedural synthesis was fundamentally a placeholder prototype. Listeners do not tune into radio for synthesized tones; they tune in for authentic Korean and American voices, spontaneous DJ banter, cultural ads, regional news, and genuine music recordings.

#### 2. Why Model B (24/7 FFmpeg Cloud Capture) was Superseded
* **What it was:** Dedicated cloud servers executing background FFmpeg processes 24 hours a day, segmenting live HLS/Icecast streams into 6-second chunks, and saving them to an AWS S3 or Google Cloud Storage circular rolling buffer with an automated 25-hour lifecycle purge rule.
* **Why it was replaced:** Maintaining 24/7 cloud capture processes incurs \$25–\$50/month in server compute, disk I/O, and outbound network egress. More importantly, **it is technically redundant due to the 16-hour California–Seoul timezone difference**:
  * When a California listener wakes up at 7:00 AM PDT, it is 11:00 PM KST in Seoul.
  * Seoul's 7:00 AM morning commuter broadcast concluded **14 hours ago**.
  * Broadcaster automated publishing pipelines finish transcoding and uploading the full morning show MP3 to high-speed edge CDNs within 1–2 hours.
  * Therefore, the audio file is already cached on global CDNs 12 hours before the overseas listener wakes up, making server-side recording unnecessary.

#### 3. Why Client-Side IndexedDB Pre-Caching was Pruned
* **What it was:** An IndexedDB offline cache manager (`offlineCache.ts`) that fetched and stored 30 six-second chunks (~7.94 MB) ahead of the playhead.
* **Why it was pruned:** Modern HTML5 `<audio>` elements natively handle progressive streaming, network jitter buffering, and Range headers (`Range: bytes=start-end`). Running an application-level chunk cache in IndexedDB added significant complexity, memory leaks, and disk churn without improving playback smoothness.

#### 4. Why Proprietary In-App AOD (Path 2) was Rejected
* **What it was:** Attempting to reverse-engineer private API endpoints powering broadcaster mobile apps (*MBC mini*, *SBS Gorilla*, *KBS KONG*).
* **Why it was rejected:** These endpoints rely on obfuscated tokens, rotating JWTs, and strict anti-bot firewall rules (Cloudflare/Akamai bot management). Maintenance was brittle and prone to constant failure. By contrast, public AOD/RSS feeds (Path 3) and official YouTube VODs (Path 1) are permanent, reliable, and CDN-accelerated.

#### 5. Policy on Paywalled Stations (KPIG 107.5 FM)
* **What it is:** KPIG 107.5 FM is a legendary Americana and roots radio station broadcasting from Freedom / Monterey Bay. Since early webcasting history, KPIG has protected its high-fidelity streaming audio behind a paid subscription paywall.
* **Architecture Treatment:** Rather than attempting to bypass subscriber authentication or removing the station from the directory, KPIG is preserved in the Monterey preset bank with `isPaywalled: true`. When selected, the appliance chassis displays an amber `PAYWALLED` badge on the retro VFD display and informs the user of its subscription status, respecting the broadcaster's commercial terms.

---

## 4. The Active Production Architecture: Smart Hybrid

The final system combines the best elements of Paths 1, 3, 4, and 6 into a cohesive **Smart Hybrid Engine**:

```
[ User Selects Station at Time T ]
                 │
                 ▼
[ GET /api/stream/resolve/:stationId ]
                 │
  ┌──────────────┼──────────────────────────────┬─────────────────────────────┐
  ▼              ▼                              ▼                             ▼
[ Tier 1: AOD ] [ Tier 3: YouTube VOD ]       [ Tier 4: Archive ]           [ Live Direct Edge ]
(MBC minicast,  (Visible Radio CAM VODs       (KSQD 14-day history,         (CBS Music FM,
 SBS Wizard,     with Studio TV monitor;       BBS/CPBC/WBS/YTN loops)       KZSC, KDFC,
 KBS Media,      Audio-Video Handshake)                                      KWAV, KDON)
 NPR One)
  │              │                              │                             │
  └──────────────┴──────────────────────────────┴─────────────────────────────┘
                                 │
                                 ▼
           [ Client: Native HTML5 Audio with HTTP Range 206 ]
             - Direct streaming from Broadcaster CDNs
             - Sub-minute seek offset: Δt = (Minutes × 60) + Seconds
             - Fallback: /api/proxy/audio for CORS / mixed-content
```

### Operational Timing Equations

#### Direction A: California Listener $\rightarrow$ Seoul Radio
* **Time Offset:** Seoul (KST, UTC+9) is **+16 hours ahead (PDT)** / **+17 hours ahead (PST)**.
* **Target Show Timing:** Morning broadcast (07:00–09:00 KST) finishes airing at 05:00 PM PDT yesterday.
* **Intra-Hour Seek Offset:**
  $$\Delta t_{\text{seek}} = (\text{Minute}_{\text{current}} \times 60) + \text{Second}_{\text{current}}$$
  The player requests a byte range at offset $\Delta t_{\text{seek}}$, with modulo duration clamping to prevent seeking past episode bounds.

#### Direction B: Seoul Listener $\rightarrow$ Monterey Bay Radio
* **Time Offset:** Monterey (PDT, UTC-7) is **16 hours behind (PDT)** / **17 hours behind (PST)**.
* **The 8-Hour Delay Equation:** When it is 08:00 AM KST Tuesday in Seoul, Monterey local time is 04:00 PM PDT Monday. Monday's 08:00 AM morning broadcast completed **8 hours ago**:
  $$\text{Delay}_{\text{PDT}} = 24\text{ hours} - 16\text{ hours} = \mathbf{8 \text{ hours}}$$
  $$\text{Delay}_{\text{PST}} = 24\text{ hours} - 17\text{ hours} = \mathbf{7 \text{ hours}}$$

---

## 5. Roadmap Progression & Completed Milestones

The project was executed through five progressive development phases, followed by architectural hardening:

```
Phase 1: Backend Stream & Archive Resolver                         [COMPLETED]
Phase 2: Frontend Audio & Soundscape Engine                       [COMPLETED]
Phase 3: Visual Delight — Studio CAM & Handshake                  [COMPLETED]
Phase 4: Costel Kitchen Appliance Chassis & Retro VFD UI          [COMPLETED]
Phase 5: Production Hardening & Codebase Modernization            [COMPLETED]
```

### Key Hardening Accomplishments:
1. **Frontend Code Splitting & Hook Isolation:** Extracted custom hooks (`useTimeShiftClock`, `useRadioPresets`, `useWakeLock`) and split heavy bundles (`vendor-react`, `vendor-audio`, `vendor-ui`, modals), reducing the initial JavaScript payload by **68.7%**.
2. **Backend Modularity & Atomic I/O:** Decoupled station configurations into `types.ts`, `seoulConfigs.ts`, `californiaConfigs.ts`, and `stationConfigs.ts`. Modernized `database.ts` with non-blocking atomic file writes.
3. **Playback Resilience & 8-State Telemetry:** Implemented a robust telemetry machine (`idle`, `tuning`, `buffering`, `playing`, `stalled`, `reconnecting`, `error`, `paywalled`) with exponential backoff (1s, 2s, 4s) and automatic proxy failover.
4. **Automated Dual-Layer Testing Harness:** Built a Vitest + React Testing Library suite (52 unit/component tests) alongside an end-to-end backend persona test suite (29 tests), achieving **81/81 tests passing (100%)**.
5. **Streamlined Car-Stereo Appliance UI:** Decommissioned early development scaffolding (the legacy 24h schedule timeline drawer and schedule admin modal) in favor of the direct car-stereo interface with physical SEEK rocker, 6 instant hardware presets, latching power switch, and automatic commuter daypart sync.
