# TimeShift Radio: Engineering & API Specifications

> **DOCUMENT PURPOSE & TECHNICAL SCOPE**  
> This document provides the engineering specifications for TimeShift Radio. It covers acoustic physics derivations, intra-hour seek mathematics, the complete 21-station streaming directory, API request/response contracts, reverse proxy streaming mechanics, and the automated testing architecture.

---

## 1. Acoustic Physics & Bandwidth Mathematics

Every audio bandwidth and storage metric in the system is derived from standard acoustic engineering equations.

### 1.1 Bitrate Calculation
$$\text{Bitrate (bps)} = \text{Sample Rate } (f_s) \times \text{Bit Depth } (B) \times \text{Channels } (C)$$

* **Uncompressed Linear PCM (Prototype Demo Benchmark):**
  $$\text{Bitrate} = 22,050 \text{ Hz} \times 16 \text{ bits} \times 1 \text{ channel} = \mathbf{352,800 \text{ bps}} = \mathbf{352.8 \text{ kbps}}$$
  $$\text{Byte Rate} = \frac{352,800}{8} = \mathbf{44,100 \text{ bytes/second}} = \mathbf{44.1 \text{ KB/sec}}$$
* **Standard Broadcast AAC-LC (Production Audio):**
  $$\text{Bitrate} = 128,000 \text{ bps} = \mathbf{128 \text{ kbps}}$$
  $$\text{Byte Rate} = \frac{128,000}{8} = \mathbf{16,000 \text{ bytes/second}} = \mathbf{16.0 \text{ KB/sec}}$$
* **Speech/Talk Optimized Opus (Low-Bandwidth Mobile):**
  $$\text{Bitrate} = 64,000 \text{ bps} = \mathbf{64 \text{ kbps}}$$
  $$\text{Byte Rate} = \frac{64,000}{8} = \mathbf{8,000 \text{ bytes/second}} = \mathbf{8.0 \text{ KB/sec}}$$

---

### 1.2 Hourly Data Consumption per Listener
$$\text{Data Per Hour} = \text{Byte Rate} \times 3,600 \text{ seconds}$$

| Codec & Fidelity | Bitrate | Byte Rate | Hourly Footprint (MB) | Monthly Data (75 hrs/user) |
| :--- | :--- | :--- | :--- | :--- |
| **Linear PCM WAV (Mono)** | 352.8 kbps | 44.1 KB/s | **158.76 MB / hr** | 11.91 GB / user |
| **MP3 High Quality** | 192 kbps | 24.0 KB/s | **86.40 MB / hr** | 6.48 GB / user |
| **AAC-LC Broadcast (Stereo)**| 128 kbps | 16.0 KB/s | **57.60 MB / hr** | 4.32 GB / user |
| **Opus Mobile (Voice/News)** | 64 kbps | 8.0 KB/s | **28.80 MB / hr** | 2.16 GB / user |

Under the **Smart Hybrid Architecture (Model C)**, 100% of this audio data is streamed directly from broadcaster CDNs (or via the lightweight reverse proxy for CORS/mixed-content streams), resulting in **0 GB audio storage** and **< 50 MB server egress per user per month**.

---

## 2. Intra-Hour Seek Synchronization Mathematics

To ensure a live broadcast feel, playback does not start from the beginning of a podcast file ($t = 0$). Instead, it computes the exact intra-hour seek offset matching the user's current minute and second.

### 2.1 Seek Offset Equation
$$\Delta t_{\text{seek}} = (\text{Minute}_{\text{current}} \times 60) + \text{Second}_{\text{current}}$$

*Example:* If a listener tunes in at `08:23:45`, the seek offset is:
$$\Delta t_{\text{seek}} = (23 \times 60) + 45 = \mathbf{1,425 \text{ seconds}}$$

### 2.2 Episode Boundary Clamping & Modulo Wrapping
Radio programs vary in duration (e.g., 50-minute edits, 1-hour shows, or 2-hour compilations). To prevent seeking past the end of an audio file:
$$\Delta t_{\text{playback}} = \begin{cases} 
\Delta t_{\text{seek}} \pmod{D_{\text{total}}}, & \text{if } D_{\text{total}} > 0 \\
\Delta t_{\text{seek}}, & \text{if } D_{\text{total}} \text{ unknown}
\end{cases}$$

Where $D_{\text{total}}$ is the total duration of the resolved audio file in seconds.

---

## 3. The Authoritative 21-Station Directory

The system provides 21 verified stations organized into two regional banks:

### 3.1 Seoul Radio Stations (10 Stations)

| ID | Name | Freq (MHz) | Network | Format | Tier | Stream / AOD URL | Studio CAM |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `mbc_fm4u` | **MBC FM4U** | 91.9 | MBC | K-Pop & Morning Variety | `tier1_rss` | `http://minicast.imbc.com/PodCast/pod.aspx?code=1000670100000100000` | Yes |
| `kbs_coolfm`| **KBS Cool FM** | 89.1 | KBS | Popular Hits & Entertainment | `tier1_rss` | `https://api.kbs.co.kr/mediafactory/v1/podcast/rss/R2002-0056` | Yes |
| `sbs_powerfm`| **SBS Power FM** | 107.7 | SBS | Music & Comedy Variety | `tier1_rss` | `http://wizard2.sbs.co.kr/w3/podcast/v1_V0000364491.xml` | Yes |
| `tbs_fm` | **TBS FM** | 95.1 | TBS | Seoul News, Traffic & Talk | `tier1_rss` | `https://cdnfm.tbs.seoul.kr/tbs/_definst_/tbs_fm_web_360.smil/playlist.m3u8` | No |
| `cbs_musicfm`| **CBS Music FM** | 93.9 | CBS | 24/7 Pop & Vocal Classics | `live_direct` | `https://m-aac.cbs.co.kr/mweb_cbs939/_definst_/cbs939.stream/playlist.m3u8` | No |
| `ebs_fm` | **EBS FM** | 104.5 | EBS | Language, Culture & Education| `tier1_rss` | `http://ebsonairiosaod.ebs.co.kr/fmradiobandiaod/bandiappaac/playlist.m3u8` | No |
| `bbs_fm` | **BBS Buddhist** | 101.9 | BBS | Calm Reflection & Culture | `tier4_continuity` | `https://bbslive.nowcdn.co.kr/bbsradio/bbsradio.stream/playlist.m3u8` | No |
| `cpbc_fm` | **CPBC Peace** | 105.3 | CPBC | Choral, Classical & Peaceful | `tier4_continuity` | `https://cpbclive.nowcdn.co.kr/cpbcradio/cpbcradio.stream/playlist.m3u8` | No |
| `wbs_fm` | **WBS Voice** | 89.7 | WBS | Mindful Music & Public Talk | `tier4_continuity` | `http://wbsfm.live.smilecdn.com:1935/live/wbsfm/playlist.m3u8` | No |
| `ytn_fm` | **YTN News FM** | 94.5 | YTN | 24/7 Breaking Korean News | `tier4_continuity` | `https://live.ytnradio.kr/live/ytnradio.stream/playlist.m3u8` | No |

---

### 3.2 Monterey Bay / California Radio Stations (11 Stations)

| ID | Name | Freq (MHz) | City / Operator | Format | Tier | Stream URL / Endpoint | Status / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `kazu_903` | **KAZU 90.3** | 90.3 | CSU Monterey Bay / NPR | NPR News, Morning Edition | `tier1_rss` | `https://kazu.streamguys1.com/kazu.mp3` | Verified CDN |
| `ksqd_907` | **KSQD 90.7** | 90.7 | Natural Bridges Media | Community Indie & Local Talk | `tier4_continuity`| `https://ksqd.info:8100/stream` | 14-Day Archive |
| `kzsc_881` | **KZSC 88.1** | 88.1 | UC Santa Cruz | College Rock & Grooves | `live_direct` | `https://stream.kzsc.org/kzsc.mp3` | Open Icecast |
| `smoothjazz`| **SmoothJazz** | Online | Carmel-by-the-Sea | Smooth Jazz & Coastal Chill | `live_direct` | `https://smoothjazz.cdnstream1.com/2585_128.mp3` | 128k MP3 |
| `kwav_969` | **KWAV 96.9** | 96.9 | Monterey / Salinas | Adult Contemporary Pop Hits | `live_direct` | `https://stream.revma.ihrhls.com/zc2829` | K-Wave |
| `kdon_1025`| **KDON 102.5**| 102.5 | Salinas / Monterey | Top 40 & Mainstream Hits | `live_direct` | `https://stream.revma.ihrhls.com/zc2825` | Hit Music |
| `kocn_1051`| **KOCN 105.1**| 105.1 | Pacific Grove / Monterey | Throwback R&B & Oldies | `live_direct` | `https://stream.revma.ihrhls.com/zc2831` | K-Ocean |
| `ktom_987` | **KTOM 98.7** | 98.7 | Salinas / Marina | Today's Country Hits | `live_direct` | `https://stream.revma.ihrhls.com/zc2833` | Country Hits |
| `kbig_1043`| **KBIG 104.3**| 104.3 | California Regional | 80s, 90s & 2000s Pop Variety | `live_direct` | `https://stream.revma.ihrhls.com/zc177` | 104.3 MYfm |
| `kdfc_899` | **KDFC 89.9** | 89.9 | Monterey / Bay Area | Classical Arts & Orchestral | `live_direct` | `https://kdfcstream.org/kdfc-mp3` | Classical Radio |
| `kpig_1075`| **KPIG 107.5**| 107.5 | Freedom / Monterey Bay | Americana, Roots & Blues | `isPaywalled` | `http://kpig.com/mp3` | Gated Subscription |

---

## 4. Backend API Contracts & Stream Resolver

### 4.1 Stream Resolution Endpoint
`GET /api/stream/resolve/:stationId`

Resolves the active broadcast stream URL and seek parameters based on target location time.

#### Request Parameters:
* `:stationId` (path, string): Unique identifier of target station (e.g. `mbc_fm4u`, `kazu_903`).

#### Response Schema (`200 OK`):
```json
{
  "stationId": "mbc_fm4u",
  "streamUrl": "http://podcastfiledown.imbc.com/original/2026/09/11/mfm_morning_20260911.mp3",
  "resolvedTier": "tier1_rss",
  "seekOffset": 1425,
  "episodeTitle": "굿모닝FM 테이입니다 (1부)",
  "hasVisibleRadio": true,
  "visibleRadioVideoId": "aBcD1234XyZ",
  "isPaywalled": false,
  "timezoneOffsetHours": 16
}
```

---

### 4.2 Streaming Reverse Proxy Endpoint
`GET /api/proxy/audio?url={encodedStreamUrl}`

Tunnels external audio streams through the server domain to resolve CORS headers and prevent HTTPS mixed-content blocking in modern browsers.

#### Key Mechanics:
1. **HTTP Range Forwarding:** Forwards the client's `Range: bytes=start-end` header upstream to the broadcaster's CDN.
2. **Partial Content Handling:** Returns `206 Partial Content` with upstream `Content-Range`, `Content-Length`, and `Content-Type`.
3. **CORS Headers:** Injects permissive cross-origin headers:
   ```http
   Access-Control-Allow-Origin: *
   Access-Control-Allow-Methods: GET, HEAD, OPTIONS
   Access-Control-Allow-Headers: Range
   Access-Control-Expose-Headers: Content-Range, Content-Length, Accept-Ranges
   ```

---

### 4.3 Time-Shift Status Endpoint
`GET /api/timeshift/status`

Returns real-time synchronization metadata between the listener location and target broadcast city.

#### Response Schema (`200 OK`):
```json
{
  "localTime": "2026-09-11T08:23:45.000-07:00",
  "targetTime": "2026-09-12T00:23:45.000+09:00",
  "currentDaypart": "morning_drive",
  "currentShow": "굿모닝FM 테이입니다",
  "timezoneDiffHours": 16,
  "isDaylightSaving": true
}
```

---

## 5. Client-Side Audio Engine & YouTube Handshake

### 5.1 Dual-Media Coexistence & Handshake

```
                 ┌────────────────────────────────┐
                 │       USER TOGGLES CAM         │
                 └───────────────┬────────────────┘
                                 │
          ┌──────────────────────┴──────────────────────┐
          │                                             │
          ▼ [CAM OPEN]                                  ▼ [CAM CLOSED]
┌──────────────────────────────────┐          ┌──────────────────────────────────┐
│ 1. Set background <audio>.muted  │          │ 1. Pause YouTube IFrame Player   │
│ 2. Set background <audio>.volume │          │ 2. Set background <audio>.muted  │
│    to 0                          │          │    to false                      │
│ 3. Start YouTube IFrame Player   │          │ 3. Restore background volume     │
│    at calculated seekSeconds     │          │    to active level               │
└──────────────────────────────────┘          └──────────────────────────────────┘
```

This handshake guarantees that audio from the YouTube studio camera never clashes with background broadcast MP3 audio.

### 5.2 Top-of-the-Hour Korean *시보* Chimes

At `:59:57` preceding each hour, the client-side Web Audio API synthesizes authentic Korean radio time pips:
* **National Standard HLA Pips:** Three 440 Hz (A4) beeps of 100 ms duration at `:59:57`, `:59:58`, and `:59:59`, followed by an 880 Hz (A5) pip at exactly `:00:00`.
* **MBC Electric Piano Chime:** Synthesizes the signature 4-note ascending chime (*솔-도-미-솔* / G4-C5-E5-G5) preceding the time pips.

---

## 6. Testing Architecture & Verification Suite

The repository contains an automated dual-layer test suite:

### 6.1 Client-Side Suite (Vitest + React Testing Library)
Located in `tests/`:
* `useTimeShiftClock.test.ts`: Tests real-time synchronization, intra-hour seek calculation, and daypart transitions.
* `useRadioPresets.test.ts`: Validates 6-slot preset storage, bank swapping (Band 1 $\leftrightarrow$ Band 2), and active station persistence.
* `useWakeLock.test.ts`: Verifies Screen Wake Lock API acquisition, release, and tab visibility recovery.
* `RadioChassis.test.tsx`: Tests rendering of the retro VFD display, frequency readouts, and tactile preset buttons.
* `VisibleRadioModal.test.tsx`: Verifies Studio CAM opening, closing, and audio-video mute handshake.
* `audioSeek.test.ts`: Validates sub-minute mathematical seek equations and duration boundary modulo clamping.
* `resilienceStateMachine.test.ts`: Tests all 8 VFD telemetry states (`idle`, `tuning`, `buffering`, `playing`, `stalled`, `reconnecting`, `error`, `paywalled`) and exponential backoff.

### 6.2 Backend Persona Suite
Located in `tests/personaVerification.test.ts`:
* 29 comprehensive end-to-end tests validating the full daily journey for both the **Homesick Homemaker** (Seoul presets) and the **Relocating Family** (Monterey Bay presets).

### Test Commands:
```powershell
npm test          # Runs client Vitest suite (44 tests)
npm run test:all  # Runs client + backend persona suites (73 tests)
```
**Current Status:** **73/73 tests passing (100%)**.
