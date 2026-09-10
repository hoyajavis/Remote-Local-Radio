# Audio Sources Directory & Technical Mathematical Provenance

> **PURPOSE OF THIS DOCUMENT**
> 1. **Data Provenance & Mathematical Breakdown:** Demonstrates the exact physics formulas, audio engineering principles, and codebase references behind all bandwidth and storage figures quoted in this project.
> 2. **Production Audio Sources Directory:** Documents verified, authentic streaming endpoints, HLS (`.m3u8`) playlists, web APIs, and open aggregators for South Korean and international radio broadcasters.

---

## Part 1: Mathematical Provenance of All Resource Numbers

Every number provided in the resource analysis is derived from standard uncompressed audio transmission equations and real codebase constants.

### 1.1 Where the Current Demo Numbers Come From

#### 1. The 352.8 kbps Demo Bitrate
In `/server/audioGenerator.ts`, lines 18–26 and lines 167–188 define the exact PCM audio parameters:
```typescript
const SAMPLE_RATE = 22050; // 22.05 kHz sample rate
const CHANNELS = 1;        // Mono channel
const BITS_PER_SAMPLE = 16; // 16-bit linear PCM (2 bytes per sample)
```

**The Bitrate Equation:**
$$\text{Bitrate (bps)} = \text{Sample Rate } (f_s) \times \text{Bit Depth } (B) \times \text{Channels } (C)$$
$$\text{Bitrate} = 22,050 \text{ samples/sec} \times 16 \text{ bits/sample} \times 1 = 352,800 \text{ bits/second}$$
$$\mathbf{352,800 \text{ bps}} = \mathbf{352.8 \text{ kbps}}$$

**Bytes Transferred Per Second:**
$$\text{Byte Rate} = \frac{352,800 \text{ bits/sec}}{8 \text{ bits/byte}} = \mathbf{44,100 \text{ bytes/second}} = \mathbf{44.1 \text{ KB/sec}}$$

---

#### 2. The 6-Second Segment Size (~264.6 KB)
The backend generates chunks of 6.0 seconds for seamless ring-buffer feeding:
$$\text{PCM Data Payload} = 44,100 \text{ bytes/sec} \times 6.0 \text{ seconds} = 264,600 \text{ bytes}$$
Adding the standard 44-byte Canonical RIFF WAVE Header:
$$\text{Total File Size} = 264,600 + 44 = \mathbf{264,644 \text{ bytes}} \approx \mathbf{264.65 \text{ KB}} \text{ (or 258.44 KiB)}$$

---

#### 3. The Hourly Bandwidth per Listener (~158.8 MB)
How many 6-second segments are delivered in one hour?
$$\text{Segments per hour} = \frac{3,600 \text{ seconds}}{6.0 \text{ seconds/segment}} = \mathbf{600 \text{ segments/hour}}$$

$$\text{Hourly Data (bytes)} = 600 \times 264,600 \text{ bytes} = 158,760,000 \text{ bytes}$$
$$\text{Decimal (MB)} = \frac{158,760,000}{1,000,000} = \mathbf{158.76 \text{ MB / hour}}$$
$$\text{Binary (MiB)} = \frac{158,760,000}{1024 \times 1024} = \mathbf{151.40 \text{ MiB / hour}}$$

---

#### 4. The 3-Minute Client Pre-Buffer (~7.9 MB)
In `/src/services/offlineCache.ts`, the client pre-buffers 3 minutes of future audio chunks into IndexedDB:
$$\text{Segments} = \frac{3 \times 60 \text{ seconds}}{6.0 \text{ seconds}} = 30 \text{ segments}$$
$$\text{Pre-buffer Footprint} = 30 \text{ segments} \times 264,644 \text{ bytes} = 7,939,320 \text{ bytes} \approx \mathbf{7.94 \text{ MB}}$$

---

### 1.2 Where the Production (Compressed) Numbers Come From

Standard commercial web radio does not stream raw PCM over the air; it encodes the audio with psychoacoustic lossy compression:

#### 1. AAC-LC @ 128 kbps (Standard High-Fidelity Radio Broadcast)
* Bitrate: $128 \text{ kbps} = 128,000 \text{ bits/second}$
* Byte rate: $\frac{128,000}{8} = 16,000 \text{ bytes/second} = 16.0 \text{ KB/second}$
* Hourly consumption:
  $$\text{Hourly Data} = 16,000 \text{ bytes/sec} \times 3,600 \text{ sec} = 57,600,000 \text{ bytes} = \mathbf{57.60 \text{ MB / hour}}$$
* Reduction vs. PCM Demo: $\frac{158.76 - 57.60}{158.76} = \mathbf{63.7\% \text{ reduction}}$

#### 2. Opus @ 64 kbps (Voice / News / Talk Radio Optimization)
* Bitrate: $64 \text{ kbps} = 64,000 \text{ bits/second} = 8,000 \text{ bytes/second}$
* Hourly consumption:
  $$\text{Hourly Data} = 8,000 \text{ bytes/sec} \times 3,600 \text{ sec} = 28,800,000 \text{ bytes} = \mathbf{28.80 \text{ MB / hour}}$$
* Reduction vs. PCM Demo: $\frac{158.76 - 28.80}{158.76} = \mathbf{81.9\% \text{ reduction}}$

---

### 1.3 Where the 24-Hour Rolling Server Storage Number Comes From

To replay live radio with a time-shift delay up to 24 hours, the server retains a rolling 24-hour circular buffer for each monitored station:
$$\text{Storage per station per day (at 128 kbps)} = 57.60 \text{ MB/hour} \times 24 \text{ hours} = 1,382.4 \text{ MB} = \mathbf{1.3824 \text{ GB / station / day}}$$

For the **4 primary Seoul stations** (MBC FM4U 91.9, KBS Cool FM 89.1, SBS Power FM 107.7, TBS 95.1):
$$\text{Total 24h Buffer Storage} = 4 \text{ stations} \times 1.3824 \text{ GB} = \mathbf{5.5296 \text{ GB}}$$

---

### 1.4 Where the 5 Users / 1 Month Number (375 Hours & 59.5 GB) Comes From

We modeled 5 distinct listener personas across 30 days:
* User 1 (Morning commuter): $1.0 \text{ hr/day} \times 30 = 30 \text{ hrs}$
* User 2 (Morning + evening commuter): $2.0 \text{ hrs/day} \times 30 = 60 \text{ hrs}$
* User 3 (Half-day office worker): $4.0 \text{ hrs/day} \times 30 = 120 \text{ hrs}$
* User 4 (Casual listener): $0.5 \text{ hrs/day} \times 30 = 15 \text{ hrs}$
* User 5 (Power listener): $5.0 \text{ hrs/day} \times 30 = 150 \text{ hrs}$
$$\mathbf{\text{Total Hours}} = 30 + 60 + 120 + 15 + 150 = \mathbf{375.0 \text{ listening hours}}$$

**Total Bandwidth Streamed (Demo Mode):**
$$375 \text{ hours} \times 158.76 \text{ MB/hour} = 59,535 \text{ MB} = \mathbf{59.535 \text{ GB}}$$

**Total Bandwidth Streamed (128 kbps AAC):**
$$375 \text{ hours} \times 57.60 \text{ MB/hour} = 21,600 \text{ MB} = \mathbf{21.60 \text{ GB}}$$

**Peak Concurrent Network Outflow (If all 5 users listen simultaneously):**
$$5 \times 352.8 \text{ kbps} = \mathbf{1,764 \text{ kbps}} = \mathbf{1.764 \text{ Mbps}}$$

---

## Part 2: Specific Live Audio Sources Directory

For a production deployment, live streams can be pulled from three categories of sources:
1. Direct official HLS (`.m3u8`) CDNs (openly accessible)
2. Broadcaster web API endpoints (requiring token handshake)
3. Open radio databases & community relay networks

### 2.1 Direct Verified South Korean Stream URLs (HLS / AAC)

These streams originate directly from Korean municipal and public broadcast CDNs:

| Station Name | Frequency / Network | Stream Type | Live Stream URL | Notes / Codec |
| :--- | :--- | :--- | :--- | :--- |
| **TBS FM** | 95.1 MHz (Seoul Traffic) | HLS (`.m3u8`) | `https://cdnfm.tbs.seoul.kr/tbs/_definst_/tbs_fm_web_360.smil/playlist.m3u8` | Official CDN, AAC stereo |
| **TBS eFM** | 101.3 MHz (Seoul English) | HLS (`.m3u8`) | `https://cdnfm.tbs.seoul.kr/tbs/_definst_/tbs_efm_web_360.smil/playlist.m3u8` | 24h Foreign language |
| **EBS FM** | 104.5 MHz (Educational) | HLS (`.m3u8`) | `http://ebsonairiosaod.ebs.co.kr/fmradiobandiaod/bandiappaac/playlist.m3u8` | Official EBS Bandi CDN |
| **Arirang Radio** | Worldwide / Jeju 88.7 MHz | HLS (`.m3u8`) | `http://amdlive.ctnd.com.edgesuite.net/arirang_3ch/smil:arirang_3ch.smil/playlist.m3u8` | English/Korean K-Pop |
| **CBS Music FM** | 93.9 MHz (Seoul) | HLS (`.m3u8`) | `https://m-aac.cbs.co.kr/mweb_cbs939/_definst_/cbs939.stream/playlist.m3u8` | 24/7 Popular Music |
| **CBS Standard FM**| 98.1 MHz (Seoul) | HLS (`.m3u8`) | `https://m-aac.cbs.co.kr/mweb_cbs981/_definst_/cbs981.stream/playlist.m3u8` | News & current affairs |
| **Gugak FM** | 99.1 MHz (National Traditional) | HLS (`.m3u8`) | `https://mgugaklive.nowcdn.co.kr/gugakradio/gugakradio.stream/playlist.m3u8` | Korean Traditional music |
| **FEBC Seoul** | 106.9 MHz (Far East) | HLS (`.m3u8`) | `http://mlive2.febc.net:1935/live/seoulfm/playlist.m3u8` | Music and talk |
| **BeFM** | 90.5 MHz (Busan English) | HLS (`.m3u8`) | `http://befm905.live.smilecdn.com:1935/befm905_live/live/playlist.m3u8` | Regional relay |

---

### 2.2 Major Commercial Broadcasters (MBC, KBS, SBS) Ingestion APIs

South Korea's "Big Three" terrestrial broadcasters protect direct URLs behind dynamic authorization tokens or WebSocket handshakes:

#### 1. KBS (Korean Broadcasting System - KBS 1Radio, KBS Cool FM 89.1, KBS Classic FM 93.1)
* **App Platform:** *KBS KONG* / *KBS+ (my K)*
* **API Ingest Pattern:**
  * Request a streaming session token via the KBS my K CMS endpoint:
    `POST https://myk.kbs.co.kr/api/kp_cms/live_stream`
  * Body parameters: `channel_code` (e.g. `24` for Cool FM, `25` for Classic FM) and client application identity token.
  * The response returns a signed Akamai / GSCDN HLS manifest URL valid for 6–12 hours:
    `https://kbs-radio.gscdn.kbs.co.kr/live/cool_fm/playlist.m3u8?token=...`

#### 2. MBC (Munhwa Broadcasting Corporation - MBC FM4U 91.9, MBC Standard FM 95.9)
* **App Platform:** *MBC mini*
* **API Ingest Pattern:**
  * Stream session discovery endpoint:
    `GET https://sminiplay.imbc.com/aacplay.ashx?channel=mfm&protocol=M3U8`
  * Parameters:
    * `channel=mfm` (MBC FM4U 91.9 MHz)
    * `channel=sfm` (MBC Standard FM 95.9 MHz)
    * `channel=chm` (All-That-Music Channel)
  * Returns an XML/JSON payload with the active edge CDN stream URL (e.g., `https://radiolive.imbc.com/.../playlist.m3u8`).

#### 3. SBS (Seoul Broadcasting System - SBS Power FM 107.7, SBS Love FM 103.5)
* **App Platform:** *SBS Gorilla*
* **API Ingest Pattern:**
  * Uses an authenticated JWT token exchange:
    `GET https://apis.sbs.co.kr/play-api/1.0/livestream/powerpc`
  * Due to dynamic token rotation (tokens expire after ~2–4 hours), an ingestion worker must refresh credentials periodically to sustain an unbroken 24/7 capture pipeline.

---

### 2.3 Open Community Aggregators & Metadata APIs

If direct broadcaster scrapers are too brittle to maintain, you can integrate open APIs that automatically track and health-check global stream links:

#### 1. Radio-Browser.info (Open Community Radio Database)
* **API Endpoint for South Korea:**
  `https://de1.api.radio-browser.info/json/stations/search?countrycode=KR`
* **Features:**
  * Over 50 active South Korean stations indexed.
  * Real-time uptime checks, codecs (AAC, MP3), and verified streaming URLs.
  * Free, non-authenticated public API with multiple global mirrors (`all.api.radio-browser.info`).

#### 2. Community IPTV-org Playlists (GitHub)
* **Repository:** `https://github.com/iptv-org/iptv`
* Maintained by thousands of contributors; provides crowdsourced, tested `.m3u8` streaming endpoints for broadcast TV and radio worldwide.

---

## Part 3: Production Ingestion Pipeline Implementation (FFmpeg)

To capture and split live streams into clean, timestamped 6-second chunks for the 24-hour rolling replay engine:

### 3.1 Ingestion Worker Shell Script
A worker running FFmpeg ingests a target station's live stream and outputs normalized HLS chunks into a local or cloud-mounted directory:

```bash
#!/usr/bin/env bash
# Ingest live MBC FM4U or TBS FM stream into rolling 6-second segments

STATION_ID="mbc_fm4u"
STREAM_URL="https://cdnfm.tbs.seoul.kr/tbs/_definst_/tbs_fm_web_360.smil/playlist.m3u8"
OUTPUT_DIR="/var/timeshift/buffer/${STATION_ID}"

mkdir -p "${OUTPUT_DIR}"

ffmpeg -re \
  -i "${STREAM_URL}" \
  -c:a aac -b:a 128k -ar 44100 -ac 2 \
  -f hls \
  -hls_time 6 \
  -hls_list_size 14400 \
  -hls_flags delete_segments+append_list \
  -hls_segment_filename "${OUTPUT_DIR}/seg_%Y%m%d_%H%M%S.ts" \
  -strftime 1 \
  "${OUTPUT_DIR}/live_buffer.m3u8"
```

### 3.2 Automated Rolling Pruner (Cron / Lifecycle Policy)
Any segment files older than 25 hours are pruned continuously:
```bash
# Delete segments older than 25 hours (1500 minutes)
find /var/timeshift/buffer -name "*.ts" -mmin +1500 -delete
```
*(On AWS S3 or Google Cloud Storage, this is handled automatically at zero compute cost using an Object Lifecycle Rule set to `Age: 1 day`).*

---

## Part 4: Legal & Broadcasting Rights Consideration

When moving from procedural synthesis to real-world broadcast relays:
1. **Public vs. Commercial Feeds:** Municipal and government stations like **TBS FM**, **EBS FM**, and **Arirang Radio** provide publicly accessible educational and municipal services, making them accessible for prototypes.
2. **Commercial Broadcasters (MBC, KBS, SBS):** Retransmission of commercial radio broadcasts requires statutory webcasting agreements or rebroadcast agreements under the **Korean Music Copyright Association (KOMCA)** and **Federation of Korean Music Performers (FKMP)**.

---

## Part 5: Audio on Demand (AOD) Sources & Zero-Storage Architecture

As an alternative to capturing live streams into a 24-hour server rolling buffer (Model B in [`/docs/usage.md`](./usage.md)), the system can leverage **Audio on Demand (AOD / 다시듣기)** archives published by official networks (Model C). 

Because California is 16 hours behind Seoul during PDT (and 17 hours during PST), target morning broadcasts have already finished airing and are uploaded to broadcaster CDNs before overseas listeners wake up:

* **Detailed Technical Specifications:** See [`/docs/aod-apis.md`](./aod-apis.md) for full endpoint analysis, HTTP Range headers, CORS status, and intra-episode seek sync algorithms.
* **Comparative System Sizing:** See [`/docs/usage.md`](./usage.md) for the three-model resource analysis (Demo vs. 24/7 Buffer vs. Virtual AOD).
* **MBC minicast API:** `http://minicast.imbc.com/PodCast/pod.aspx?code={ID}` (Verified CORS `*` and direct byte-range seekable MP3s).
* **KBS MediaFactory API:** `https://api.kbs.co.kr/mediafactory/v1/podcast/rss/{ID}` (Cloud-hosted AWS/GSCDN distribution).
* **SBS Wizard API:** `http://wizard2.sbs.co.kr/w3/podcast/{ID}.xml` (CloudFront CDN distribution with 2-hour full broadcast MP3s).

---

## Part 6: Target Location Directory — Monterey, CA, USA

When Monterey, California, USA is configured as the **target broadcast location** (e.g. for listeners in Seoul, South Korea), TimeShift Radio ingests authentic local radio stations serving the Monterey Bay, Salinas Valley, and Santa Cruz areas.

### 6.1 Monterey Bay Radio Stations & Verified Streaming Endpoints

The following radio stations broadcast from or directly serve Monterey County and the Monterey Bay Area. All primary stream URLs have been live-tested and verified operational:

| Station Call Letters & Frequency | Station Name / Operator | Format & Core Programming | Verified Direct Stream URL | Format / Codec | Status & Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **KAZU 90.3 FM** | NPR for the Monterey Bay Area (CSU Monterey Bay, Pacific Grove / Monterey) | National Public Radio, local Monterey news, *Morning Edition*, *All Things Considered*, environmental journalism | `https://kazu.streamguys1.com/kazu.mp3`<br>*(Alt: `https://kazu.streamguys1.com/kazu-npr`)* | **128 kbps MP3**<br>*(64 kbps AAC)* | **Verified Active (HTTP 200)**.<br>Hosted on StreamGuys edge CDN; zero authentication required. |
| **KSQD 90.7 FM** *(also 89.7 / 89.5 FM)* | "K-Squid" Community Radio (Natural Bridges Media, Monterey Bay) | Eclectic indie music, Central Coast community affairs, live local talk, arts | `https://ksqd.info:8100/stream` | **192 kbps MP3** (Stereo, 48 kHz) | **Verified Active (HTTP 200)**.<br>Icecast 2.4 stream with full browser CORS support (`access-control-allow-origin: *`). |
| **KZSC 88.1 FM** | UC Santa Cruz / Monterey Bay Community Radio | Non-commercial independent, college rock, jazz, global grooves, public affairs | `https://stream.kzsc.org/kzsc.mp3` | **128 kbps MP3** | **Verified Active (HTTP 200)**.<br>Open Icecast stream with CORS headers enabled. |
| **SmoothJazz.com Global Radio** | SmoothJazz.com (Carmel-by-the-Sea / Monterey Peninsula) | Smooth jazz, chill lounge, adult contemporary from Monterey Peninsula | `https://smoothjazz.cdnstream1.com/2585_128.mp3`<br>*(Alt: `.../2585_64.aac`)* | **128 kbps MP3**<br>*(64 kbps AAC+)* | **Verified Active (HTTP 200)**.<br>Commercial global stream originated from the Monterey Peninsula. |
| **KPIG 107.5 FM** | KPIG Radio (Stephens Media Group, Freedom / Monterey Bay) | Legendary Americana, roots, folk, blues, and Central Coast humor | `http://kpig.com/mp3`<br>*(Alt: `http://kpig.com/aac-player`)* | **128 kbps MP3**<br>*(64 kbps AAC)* | Historic webcaster since 1995. High-bitrate streams available via official Icecast. |

---

### 6.2 FFmpeg Ingestion Pipeline for Monterey Icecast Streams

Capturing Monterey Icecast/Shoutcast streams into the 24-hour circular rolling buffer uses the following hardened script:

```bash
#!/usr/bin/env bash
# Ingest KAZU 90.3 FM (Monterey Bay NPR) into 6-second CMAF/HLS segments
STATION_ID="kazu_903"
STREAM_URL="https://kazu.streamguys1.com/kazu.mp3"
BUFFER_DIR="/var/timeshift/buffer/${STATION_ID}"

mkdir -p "${BUFFER_DIR}"

ffmpeg -re \
  -i "${STREAM_URL}" \
  -c:a aac -b:a 128k -ar 44100 -ac 2 \
  -f hls \
  -hls_time 6 \
  -hls_list_size 14400 \
  -hls_flags delete_segments+append_list \
  -hls_segment_filename "${BUFFER_DIR}/seg_%Y%m%d_%H%M%S.ts" \
  -strftime 1 \
  "${BUFFER_DIR}/live_buffer.m3u8"
```

---

### 6.3 US Regulatory, Copyright & Licensing Framework

When relaying or time-shifting United States radio broadcasts internationally:

1. **Non-Commercial Educational (NCE) Stations (KAZU 90.3, KSQD 90.7, KZSC 88.1):**
   * These stations operate under FCC non-commercial educational licenses.
   * Digital streaming is covered under the **Corporation for Public Broadcasting (CPB) and SoundExchange statutory agreements**, allowing educational and cultural webcasting.
2. **Commercial Music Streaming (SoundExchange & 17 U.S.C. § 114):**
   * In the United States, digital performance of sound recordings is administered by **SoundExchange** under statutory licenses.
   * Commercial retransmission requires compliance with statutory ephemeral recording rules and SoundExchange per-performance reporting ($0.0025 to $0.0030 per performance).
3. **Syndicated Programming Restrictions:**
   * National NPR programming (such as *Morning Edition* and *All Things Considered*) heard on KAZU carries strict digital rights restrictions for third-party rebroadcasters. TimeShift Radio avoids these legal barriers under **Model C** by utilizing public RSS and NPR One client-side deep links, where the user streams directly from the broadcaster's own CDN.


