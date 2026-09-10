# TimeShift Radio: System Resource Requirements & Architecture Specifications

> **DOCUMENT STATUS & SCOPE**
> This document provides an architectural breakdown, mathematical sizing, and comparative resource analysis across **three implementation models**:
> 1. **Model A (Current Demo Prototype):** Procedural audio synthesis in Node.js RAM, local JSON database, and client-side IndexedDB caching.
> 2. **Model B (Live Continuous Capture & Rolling Buffer):** 24/7 FFmpeg stream capture, 128 kbps AAC encoding, and a 24-hour circular retention buffer stored in cloud object storage (S3/GCS).
> 3. **Model C (Virtual On-Demand Time-Shift Engine):** Exploits the 16-hour California–Seoul time differential by fetching pre-recorded broadcaster AOD/Podcast/YouTube archives and seeking dynamically to the intra-hour minute/second, achieving **0 GB server audio storage** and **0 GB server audio bandwidth**.

---

## Part 1: Architecture Comparison Summary

| Metric / Dimension | Model A: Current Demo Prototype | Model B: Live Rolling Capture Buffer | Model C: Virtual AOD Time-Sync |
| :--- | :--- | :--- | :--- |
| **Audio Generation Source** | Procedural synthesis in RAM (`server/audioGenerator.ts`) | Live station stream capture via FFmpeg (`/docs/sources.md`) | Official broadcaster AOD / Podcast / YouTube VOD (`/docs/aod-apis.md`) |
| **Audio Codec & Bitrate** | 16-bit Linear PCM @ **352.8 kbps** | AAC-LC @ **128 kbps** (or Opus @ 64 kbps) | Standard MP3 / AAC @ **128–192 kbps** |
| **Server Audio Storage** | **0 GB** (generated on-the-fly in RAM) | **~5.52 GB** (4 stations $\times$ 24h rolling buffer) | **0 GB** (hosted on broadcaster / CDN infrastructure) |
| **Server Ingest Compute** | **0%** (zero external capture) | Continuous 24/7 background FFmpeg (15–25% CPU) | **0%** (zero stream capture processes) |
| **Bandwidth / User / Hour** | **~158.8 MB** (uncompressed PCM) | **~57.6 MB** (AAC) / **~28.8 MB** (Opus) | **0 MB from server** (direct client-to-CDN stream) |
| **Total Bandwidth (5 users / mo)** | **~59.5 GB** (streamed from server) | **~21.6 GB** (AAC) / **~10.8 GB** (Opus) | **0 GB** (offloaded to broadcaster CDN) |
| **Peak Concurrent Outflow (5 users)** | **1.76 Mbps** | **0.64 Mbps** (AAC) / **0.32 Mbps** (Opus) | **0 Mbps** from origin server |
| **Music Completeness** | Procedural melodic loops | 100% full broadcast audio | 100% on YouTube VOD; ~85% on Podcast RSS |
| **Estimated Infrastructure Cost** | **$0 / month** (fits in free tier container) | **~$20 – $50 / month** (VPS + S3 + egress) | **$0 – $5 / month** (serverless API proxy) |

---

## Part 2: Model A — Current Demo Prototype

### 2.1 How the Demo Mode Works Today
The current demo mode operates as a zero-dependency, self-contained interactive prototype designed to demonstrate the time-shift replay mechanics without requiring commercial broadcast relay contracts:
* **Audio Synthesis Engine (`server/audioGenerator.ts`):** Procedurally synthesizes carrier waves, chord progressions, white-noise FM hiss, hourly time pips (*시보*), and station sound signatures directly inside Node.js memory.
* **On-Demand Segment Streaming:** When the client requests an hour/segment (`/api/audio/segment/:stationId/:kstHour/:segmentId`), the backend creates a 6-second segment on-the-fly and pipes the binary stream back with `< 5 ms` latency.
* **Local State Engine:** Station profiles, bilingual DJ metadata, and 24-hour schedules are persisted to local JSON files (`data/stations.json`, `data/schedule.json`).

### 2.2 Resource Profile (Demo Mode)

| Dimension | Specification | Derivation / Notes |
| :--- | :--- | :--- |
| **Audio Format** | 16-bit Linear PCM (WAV, mono) | Uncompressed wave stream |
| **Sample Rate** | 22,050 Hz (22.05 kHz) | Clean voice-band AM/FM fidelity |
| **Bitrate** | **352.8 kbps** (~44.1 KB/sec) | $(22,050 \times 16 \times 1) / 1000 = 352.8\text{ kbps}$ |
| **Segment Duration** | 6.0 seconds | $44,100\text{ B/s} \times 6\text{s} + 44\text{B} = 264,644\text{ bytes}$ (~264.6 KB) |
| **Hourly Bandwidth / Listener** | **~158.8 MB / hour** | $600\text{ segments/hr} \times 264,600\text{ bytes} \approx 158.76\text{ MB}$ |
| **Server Disk Storage** | **< 10 MB total** | Zero audio stored on disk; synthesized dynamically in RAM |
| **Server Memory (RAM)** | **50 MB – 90 MB** | Baseline Node.js / Express memory footprint |
| **Server CPU** | **< 2% of 1 vCPU** | Single-pass mathematical buffer generation |
| **Client Storage (per device)** | **~8 MB – 159 MB** | 3-minute transient pre-buffer (~8 MB) or 1-hr subway cache (~159 MB) |

---

## Part 3: Model B — Live Continuous Capture & Rolling Buffer

This production model records authentic live broadcasts from Seoul (MBC FM4U 91.9, KBS Cool FM 89.1, SBS Power FM 107.7, TBS 95.1) and replays them with an exact, synchronized time delay to overseas listeners.

### 3.1 Architecture Overview

```
[Seoul Live Radio Streams (HLS / RTMP)]
                  │
                  ▼
[24/7 Ingestion & Transcoding Worker (FFmpeg)]
  - Ingests 4 live station streams continuously
  - Transcodes to AAC-LC (128 kbps) & Opus (64 kbps)
  - Chunks into 6-second HLS/CMAF segments
                  │
                  ▼
[24-Hour Rolling Circular Buffer (Cloud Storage)]
  - AWS S3 or Google Cloud Storage bucket
  - Lifecycle Policy: Segments older than 25 hours auto-purged
  - Size: 4 stations × 1.38 GB/day = ~5.52 GB continuous storage
                  │
                  ▼
[Edge CDN Layer (Cloudflare / CloudFront)]
  - Caches 6s audio segments at regional edge points
  - Cache hit ratio > 95% across listeners in the same timezone
                  │
                  ▼
[Client Web & Mobile Apps]
  - Adaptive HLS playback, subway offline pre-caching, schedule EPG
```

### 3.2 Resource Profile (Model B)

| Subsystem | Requirement | Sizing & Architecture Details |
| :--- | :--- | :--- |
| **Audio Compression Codec** | **AAC-LC @ 128 kbps** (Stereo) & **Opus @ 64 kbps** (Mobile) | Reduces stream footprint by **64% to 82%** compared to uncompressed PCM |
| **Hourly Bandwidth / Listener** | **~57.6 MB / hour** (AAC 128k) or **~28.8 MB / hour** (Opus 64k) | $16,000\text{ B/s} \times 3600\text{s} = 57.6\text{ MB/hr}$ |
| **Live Ingest Workers** | 1–2 Ingestion Instances (Active/Standby) | 2 vCPUs, 4 GB RAM running headless FFmpeg processes capturing source streams |
| **24-Hour Rolling Buffer Storage** | **~1.38 GB per station / day** | 4 Seoul stations = **~5.52 GB** total continuous rolling storage on S3/GCS |
| **Storage Lifecycle / Pruning** | Automatic 25-Hour Object TTL | S3/GCS Object Lifecycle rules automatically delete expired chunks at zero compute cost |
| **Edge CDN Layer** | Global CDN (e.g. Cloudflare / CloudFront) | Essential for scale: thousands of California listeners at 8:00 AM pull the identical chunk |

---

## Part 4: Model C — Virtual On-Demand Time-Shift Engine

Model C eliminates 24/7 stream capture processes and rolling storage by utilizing the **16-hour California–Seoul time differential** and official broadcaster AOD / Podcast / YouTube VOD archives.

### 4.1 The 16-Hour Timing Mechanism
* California is **16 hours behind** Seoul during Daylight Saving Time (PDT, UTC-7 vs. KST, UTC+9) and **17 hours behind** during Standard Time (PST, UTC-8 vs. KST, UTC+9).
* When a California listener tunes in at **7:00 AM PDT (Monday)**, it is already **11:00 PM KST (Monday night)** in Seoul.
* The matching 7:00 AM–9:00 AM morning broadcast finished airing **14 hours ago**, and broadcasters systematically publish the episode to their cloud CDNs within **1 to 3 hours**.
* **Result:** Target radio content is already processed, uploaded, and cached on official CDNs before overseas listeners tune in.

### 4.2 Intra-Episode Time-Sync
When the user tunes in at $HH:MM:SS$, the server identifies the matching episode and returns the exact intra-hour seek offset:
$$\Delta t_{\text{seek}} = (\text{Minutes} \times 60) + \text{Seconds}$$

The client HTML5 player sends an HTTP Range header (`Range: bytes=...`) directly to the broadcaster CDN (such as MBC's CORS-enabled `podcastfiledown.imbc.com` or SBS's AWS CloudFront CDN), starting playback at the exact second.

### 4.3 Resource Profile (Model C)
* **Server Audio Storage:** **0 GB** (Audio is stored permanently on broadcaster CDNs).
* **Server Ingestion CPU:** **0%** (No FFmpeg processes).
* **Server Audio Bandwidth:** **0 GB** (Audio is streamed directly from broadcaster CDN to the user's browser).
* **Server Role:** Lightweight JSON metadata resolver (`< 20 ms` response time).

---

## Part 5: 5 Users Over One Month (30 Days / 375 Total Hours)

The following side-by-side comparison models **5 active listeners** across a 30-day month, totaling **375 aggregate listening hours** (averaging 2.5 hours per user per day).

### 5.1 Comparative Resource Table

| Metric | Model A (Demo Prototype) | Model B (Rolling Capture Buffer) | Model C (Virtual AOD Time-Sync) |
| :--- | :--- | :--- | :--- |
| **Audio Format** | PCM WAV @ 352.8 kbps | AAC-LC @ 128 kbps | MP3 / AAC @ 128–192 kbps |
| **Data Streamed / User (75 hrs/mo)** | **~11.9 GB** / user | **~4.3 GB** (AAC) / **~2.1 GB** (Opus) | **~4.3 GB** (from CDN, 0 GB from server) |
| **Total Monthly Server Egress** | **~59.5 GB / month** | **~21.6 GB** (AAC) / **~10.8 GB** (Opus) | **< 50 MB** (JSON metadata only) |
| **Peak Concurrent Server Bandwidth** | **1.76 Mbps** | **0.64 Mbps** (AAC) | **< 10 kbps** (API calls only) |
| **Server Audio Storage Required** | **0 GB** (RAM synthesis) | **~5.52 GB** (4 stations $\times$ 24h) | **0 GB** (CDN hosted) |
| **Client Storage Footprint (per device)** | 8 MB – 159 MB (IndexedDB) | 3 MB – 58 MB (IndexedDB) | 3 MB – 58 MB (IndexedDB) |
| **Music Completeness** | Synthesized FM loops | 100% full broadcast audio | 100% (YouTube VOD) / ~85% (Podcast RSS) |
| **Monthly Hosting & Infrastructure Cost** | **$0.00** (Free Cloud Run tier) | **~$25.00 – $45.00** (VPS + Storage + Egress) | **$0.00 – $5.00** (Serverless API proxy) |

---

## Part 6: Expansion to International Cities

Adding new source cities (e.g., Tokyo, London, Paris, New York, or regional Korean broadcasts like Busan):

### 6.1 Under Model A (Demo Mode)
* Update timezone offset math in `/api/timeshift/status` using standard IANA keys (`Asia/Tokyo`, `Europe/London`).
* Add station identity presets and bilingual schedules in `data/stations.json` and `data/schedule.json`.
* **Resource Impact:** **0 GB disk, 0% added compute.**

### 6.2 Under Model B (Live Rolling Capture Buffer)
* Each additional station requires 1 continuous FFmpeg capture stream and 1.38 GB of rolling buffer storage per day:
  * **1 City (4 Stations):** ~5.5 GB rolling buffer
  * **3 Cities (12 Stations):** ~16.6 GB rolling buffer
  * **5 Cities (20 Stations):** ~27.6 GB rolling buffer

### 6.3 Under Model C (Virtual AOD Time-Sync)
* Map public podcast/AOD RSS feeds or official YouTube live channels for target stations.
* **Resource Impact:** **0 GB server storage and 0 GB server audio bandwidth**, regardless of how many cities or stations are added.

---

## Part 7: Bidirectional Topology — Target: Monterey, CA, USA & Listener: Seoul, South Korea

This section provides the mathematical foundation, delay equations, and resource requirements for the reverse operational configuration: **broadcasting from Monterey, California, USA to listeners located in Seoul, South Korea**.

### 7.1 Geographical & Timezone Topologies

| Parameter | Broadcast Origin (Target Location) | Listener Destination (Listening Location) |
| :--- | :--- | :--- |
| **Location** | **Monterey, California, USA** | **Seoul, South Korea** |
| **Timezone** | Pacific Time (`America/Los_Angeles`) | Korea Standard Time (`Asia/Seoul`) |
| **UTC Offset** | UTC-7 (PDT, Daylight) / UTC-8 (PST, Standard) | UTC+9 (KST, Year-round) |
| **Time Differential ($\Delta T$)** | **16 hours behind Seoul (PDT)** / **17 hours behind Seoul (PST)** | **16 hours ahead of Monterey (PDT)** / **17 hours ahead of Monterey (PST)** |
| **Primary Stations** | KAZU 90.3 FM (NPR), KSQD 90.7 FM, KPIG 107.5 FM, SmoothJazz.com | Seoul mobile/web listeners on Wi-Fi/5G |

---

### 7.2 The Reverse Time-Shift Dynamics & Delay Equation

When a user in Seoul wants to listen to Monterey radio synchronized to their current local time of day:

1. **The Day-Shift Scenario:**
   * A listener in Seoul wakes up at **8:00 AM KST (Tuesday morning)**.
   * They want to hear Monterey's 8:00 AM morning broadcast (e.g., KAZU 90.3 NPR Morning Edition local cut-in or KPIG 107.5 morning show).
   * At 8:00 AM Tuesday in Seoul, the local time in Monterey is **4:00 PM PDT Monday afternoon** ($8:00\text{ AM} - 16\text{ hours} = 4:00\text{ PM}$ previous day).
   * Monterey's Tuesday 8:00 AM broadcast will not air for another 16 hours.
   * Therefore, the relevant Monterey broadcast that matches the user's morning context is **the most recently completed 8:00 AM Monterey broadcast (from Monday morning)**.

2. **The Replay Delay Equation:**
   To align the most recent matching broadcast time-of-day with the listener's local time, the required historical replay delay ($\text{Delay}_{\text{replay}}$) relative to Monterey's live broadcast time is:

   $$\text{Delay}_{\text{PDT}} = 24\text{ hours} - 16\text{ hours} = \mathbf{8 \text{ hours of delay}}$$
   $$\text{Delay}_{\text{PST}} = 24\text{ hours} - 17\text{ hours} = \mathbf{7 \text{ hours of delay}}$$

   * **Verification:** In Monterey, Monday's 8:00 AM broadcast aired 8 hours ago (at 4:00 PM Monday). By replaying the Monterey audio captured **8 hours ago**, the Seoul listener at 8:00 AM Tuesday hears the exact 8:00 AM Monterey broadcast!
   * **Buffer Sufficiency Proof:** A 24-hour circular rolling buffer stores 24 hours of continuous history. Because the required delay is only 7 to 8 hours, **a standard 24-hour buffer always contains 100% of the required audio** with a generous 16-hour safety margin.

```
[Seoul Listener Local Time: Tuesday 08:00 AM KST]
                          │
                          ▼
[Monterey Real-Time Clock: Monday 04:00 PM PDT (t = now)]
                          │
                          ▼
[Apply Time-Shift Replay Delay: 8.0 Hours Backwards (t - 8h)]
                          │
                          ▼
[Target Content Resolved: Monterey Monday 08:00 AM Broadcast]
  ├─► Model B: Read segment from S3 rolling buffer at (now - 8h)
  └─► Model C: Fetch KAZU/NPR AOD podcast file + seek offset
                          │
                          ▼
[Result: Seoul listener hears Monterey 8:00 AM morning show with perfect day-part alignment]
```

---

### 7.3 Resource Requirements: Seoul Listeners $\rightarrow$ Monterey Stations (5 Users / 1 Month)

Modeling 5 active listeners in Seoul streaming Monterey radio for **75 hours each per month** (375 aggregate listening hours):

| Resource Dimension | Model A: Current Demo Prototype | Model B: Live Rolling Capture Buffer | Model C: Virtual AOD Time-Sync |
| :--- | :--- | :--- | :--- |
| **Audio Source** | Procedurally synthesized Monterey station presets (`server/audioGenerator.ts`) | Live stream ingestion of 4 Monterey stations via FFmpeg | Official KAZU NPR RSS feeds & KSQD on-demand archives |
| **Audio Format & Bitrate** | 16-bit PCM @ **352.8 kbps** | AAC-LC @ **128 kbps** (or Opus @ 64k) | MP3 / AAC @ **128–192 kbps** |
| **Monterey Stations Ingested** | KAZU 90.3, KSQD 90.7, KPIG 107.5, SmoothJazz.com | Continuous capture of 4 live Monterey streams | On-demand podcast & archive endpoints |
| **Server Continuous Storage** | **0 GB** (in-memory synthesis) | **~5.52 GB** (4 stations $\times$ 24h on S3/GCS) | **0 GB** (hosted on US broadcaster CDNs) |
| **Total Monthly Egress (5 users)** | **~59.5 GB / month** | **~21.6 GB** (AAC) / **~10.8 GB** (Opus) | **< 50 MB** (JSON metadata only) |
| **Peak Concurrent Bandwidth** | **1.76 Mbps** | **0.64 Mbps** (AAC) | **< 10 kbps** from application server |
| **Transpacific Network Latency** | Direct server response (< 20 ms) | CDN edge in Seoul (< 20 ms) or US origin (~130 ms) | US CDN edge cache in East Asia (~15–30 ms) |
| **Estimated Monthly Cost** | **$0.00** | **~$25.00 – $45.00** | **$0.00 – $5.00** |

---

### 7.4 Network Routing & Transpacific Performance
* **Physical Distance:** Monterey, CA to Seoul, South Korea is approximately **9,050 km (5,620 miles)** across the Pacific Ocean.
* **Undersea Fiber Latency:** Transpacific fiber cables (such as FASTER, JUPITER, and PLCN) deliver round-trip times (RTT) between California (San Jose / SFO) and Seoul (ICN) of **120 ms to 140 ms**.
* **Streaming Tolerance:** Because TimeShift Radio buffers audio in 6-second CMAF/HLS segments (or uses client-side HTML5 pre-buffering), a 130 ms transpacific RTT represents only ~2% of a single segment's duration. Playback is completely smooth with zero buffering stalls.
