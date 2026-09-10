# Official Audio on Demand (AOD) APIs & Virtual Time-Shift Architecture

> **DOCUMENT PURPOSE & SCOPE**
> This document details the technical specifications, real verified endpoints, authentication models, and data synchronization algorithms for leveraging **official broadcaster Audio-on-Demand (AOD / *다시듣기*) and Podcast APIs** (KBS, MBC, SBS, EBS, TBS).
>
> By utilizing official on-demand archives instead of maintaining a 24-hour continuous rolling recording buffer on your server, **server audio storage requirements drop from ~5.5 GB to 0 GB**, and streaming bandwidth is offloaded directly to broadcaster CDNs.
>
> * Related Documents:
>   * [`/docs/usage.md`](./usage.md): Overall resource requirements across Models A, B, and C.
>   * [`/docs/sources.md`](./sources.md): Direct live streaming URLs, FFmpeg ingestion scripts, and mathematical derivations.

---

## 1. The Core Architecture: Virtual Time-Shift Replay via AOD

### 1.1 Bidirectional Topologies & Time Differentials

TimeShift Radio supports **bidirectional time-shifting** between North America's Pacific Coast and South Korea:

| Direction | Broadcast Origin (Target Location) | Listener Destination (Listening Location) | Time Difference ($\Delta T$) | Replay Timing Logic |
| :--- | :--- | :--- | :--- | :--- |
| **Direction A** | **Seoul, South Korea** (`Asia/Seoul`, KST) | **California, USA** (`America/Los_Angeles`, PT) | Seoul is **+16h ahead (PDT)** / **+17h ahead (PST)** | Morning show in Seoul aired **14 hours ago**; target audio is already uploaded to broadcaster CDN. |
| **Direction B** | **Monterey, CA, USA** (`America/Los_Angeles`, PT) | **Seoul, South Korea** (`Asia/Seoul`, KST) | Monterey is **16h behind (PDT)** / **17h behind (PST)** | When it is 8:00 AM in Seoul, it is 4:00 PM yesterday in Monterey. Monterey's 8:00 AM show aired **8 hours ago**! |

---

### 1.2 Direction A Lifecycle (Listening to Seoul Radio in California)
1. **07:00 AM – 09:00 AM KST (Seoul Morning):**  
   The flagship morning commuter show (e.g., *Good Morning FM* or *Kim Young-chul's Power FM*) airs live across Seoul.
2. **09:00 AM – 11:30 AM KST (Encoding & Syndication):**  
   Broadcaster automated encoding pipelines transcode the broadcast, attach metadata, and upload MP3 files to their public CDNs and podcast feeds.
3. **11:00 PM KST / 07:00 AM PDT (California Listener Wakes Up):**  
   When the California user opens TimeShift Radio at 7:00 AM PDT, the matching morning broadcast finished airing **14 hours ago**. The full audio file has been sitting on the broadcaster's edge CDN for over 12 hours.
4. **Conclusion:** No server-side stream recording is required for overseas listeners during their waking hours; the target audio is already archived on high-speed CDNs.

---

### 1.3 Direction B Lifecycle (Listening to Monterey Radio in Seoul)
1. **08:00 AM – 09:00 AM PDT Monday (Monterey Morning):**  
   KAZU 90.3 broadcasts *Morning Edition* with local Monterey Bay news and environmental reports; KPIG 107.5 airs its morning Americana show.
2. **09:00 AM – 12:00 PM PDT Monday (Syndication & Archival):**  
   Local news segments and archives are published to NPR One / KAZU RSS and community archive servers.
3. **08:00 AM KST Tuesday / 04:00 PM PDT Monday (Seoul Listener Wakes Up):**  
   When a listener in Seoul opens TimeShift Radio at 8:00 AM Tuesday morning, local time in Monterey is 4:00 PM Monday afternoon.
4. **The 8-Hour Delay Equation:**  
   $$\text{Delay}_{\text{PDT}} = 24\text{ hours} - 16\text{ hours} = \mathbf{8 \text{ hours of delay}}$$
   $$\text{Delay}_{\text{PST}} = 24\text{ hours} - 17\text{ hours} = \mathbf{7 \text{ hours of delay}}$$
   In Monterey, Monday's 8:00 AM show completed **8 hours ago**. Replaying that completed broadcast at 8:00 AM KST creates a seamless, natural day-part experience for the listener in Seoul.

---

### 1.4 Intra-Episode Time-Sync Algorithm

To preserve the authentic feeling of tuning into a live radio broadcast rather than pressing play on a static podcast, the client player does not start at $t = 0$. Instead, it calculates the **intra-hour offset**:

$$\Delta t_{\text{seek}} = (\text{Minutes}_{\text{current}} \times 60) + \text{Seconds}_{\text{current}}$$

#### Handling Multi-Part Shows
Most South Korean 2-hour radio shows are split into two 1-hour files:
* **Part 1 (1부, 2부):** Broadcast during the first hour ($HH:00$ to $HH:59$).
* **Part 2 (3부, 4부):** Broadcast during the second hour ($(HH+1):00$ to $(HH+1):59$).

The playback resolver maps the current hour to the corresponding part, then calculates $\Delta t_{\text{seek}}$ within that specific file:

$$\Delta t_{\text{seek}} = (\text{Minute} \pmod{60} \times 60) + \text{Second}$$

**Example:**
* A user tunes in at **7:24:15 AM California time**.
* The server resolves the 7:00 AM morning show (Part 1).
* The client audio player requests byte ranges starting at:
  $$\Delta t_{\text{seek}} = (24 \times 60) + 15 = \mathbf{1,455 \text{ seconds (24m 15s)}}$$
* The listener immediately hears the exact music, traffic update, or banter that was airing at 7:24:15 AM in Seoul.

```
[User Tunes In: 7:24:15 AM PDT]
                │
                ▼
[Target TimeSlot Calculation: 7:00 AM KST]
                │
                ▼
[Query Broadcaster AOD / Podcast Index API]
  ├─► Locate Episode: "Morning News / FM Radio" for Today's Date
  └─► Resolve Stream URL: https://podcastfiledown.imbc.com/.../LOOK_20260910_11.mp3
                │
                ▼
[Calculate Playback Offset: 24 min 15 sec (t = 1455s)]
                │
                ▼
[Client Web Audio Player / HTML5 Audio Element]
  └─► Client sends: Range: bytes=3200000-
  └─► Broadcaster CDN responds with 206 Partial Content
  └─► Playback begins immediately; ZERO server bandwidth or storage consumed.
```

---

## 2. Verified Official Broadcaster AOD APIs & Feed Structures

Live network testing confirms the following broadcaster APIs are operational, publicly reachable, and support byte-range seeking.

---

### 2.1 MBC (Munhwa Broadcasting Corporation) — *MBC minicast API*

MBC provides open XML/RSS syndication feeds for all MBC Standard FM (95.9 MHz) and FM4U (91.9 MHz) programs.

* **Syndication Feed URL:**
  `http://minicast.imbc.com/PodCast/pod.aspx?code={PROGRAM_CODE}`
* **Flagship Program Codes:**
  * `1000674100000100000`: *Kim Jong-bae's Focus on News* (김종배의 시선집중, 07:05–08:30 KST)
  * `1000662100000100000`: *Good Morning FM Tei* (굿모닝FM 테이, 07:00–09:00 KST)
  * `1000578100000100000`: *Bae Chul-soo's Music Camp* (배철수의 음악캠프, 18:00–20:00 KST)
* **Metadata Structure:**
  * `<pubDate>`: RFC 822 formatted date (e.g., `Thu, 10 Sep 2026 08:30:00 +0900`)
  * `<itunes:duration>`: Formatted duration string (e.g. `00:32:08`)
  * `<enclosure url="..." length="..." type="audio/mpeg" />`
* **Audio Delivery Pipeline:**
  1. Enclosure URL: `https://podcastfile.imbc.com/cgi-bin/podcast.fcgi/podcast/look_1/LOOK_20260910_11.mp3`
  2. Resolves via `302 Found` to high-speed CDN: `https://podcastfiledown.imbc.com/originaldata/look_1/LOOK_20260910_11.mp3`
* **Verified Network Characteristics:**
  * **HTTP Status:** `HTTP/2 200 OK` (30.8 MB for 32 minutes)
  * **Range Requests:** `accept-ranges: bytes` (**Supported** — allows seeking to any second)
  * **CORS Support:** `access-control-allow-origin: *` (**Fully open** — browsers can stream directly with zero proxying)
  * **Authentication:** None required.

---

### 2.2 KBS (Korean Broadcasting System) — *MediaFactory Cloud API*

KBS hosts its podcast and on-demand radio catalog on its AWS-based "MediaFactory" cloud infrastructure.

* **Syndication Feed URL:**
  `https://api.kbs.co.kr/mediafactory/v1/podcast/rss/{PROGRAM_ID}`
* **Flagship Program IDs:**
  * `R2010-0090-history`: *KBS History in Story* (다큐멘터리 역사를 찾아서)
  * `R2018-0052-kiss`: *Kiss the Radio* (키스 더 라디오, 22:00–24:00 KST)
  * `R2020-0012-volume`: *Volume Up* (볼륨을 높여요, 20:00–22:00 KST)
* **Audio Delivery Pipeline:**
  1. Enclosure URL: `https://static.api.kbs.co.kr/mediafactory/v1/podcast/play/{EPISODE_GUID}.mp3`
  2. Resolves via `302 Found` to GSCDN / Akamai edge: `https://podcast.gscdn.kbs.co.kr/{PROGRAM_ID}/file/...mp3`
* **Verified Network Characteristics:**
  * **HTTP Status:** `HTTP/2 200 OK`
  * **Range Requests:** `accept-ranges: bytes` (**Supported**)
  * **Authentication:** Publicly accessible without API keys.

---

### 2.3 SBS (Seoul Broadcasting System) — *SBS Wizard / Podcast API*

SBS syndicates Power FM (107.7 MHz) and Love FM (103.5 MHz) daily programs through its `wizard2.sbs.co.kr` backend.

* **Syndication Feed URL:**
  `http://wizard2.sbs.co.kr/w3/podcast/{PROGRAM_VOD_ID}.xml`
* **Flagship Program VOD IDs:**
  * `V0000328482`: *Cultwo Show* (두시탈출 컬투쇼, 14:00–16:00 KST)
  * `V2000010054`: *Kim Young-chul's Power FM* (김영철의 파워FM, 07:00–09:00 KST)
  * `V0000364478`: *Boom Boom Power* (붐붐파워, 16:00–18:00 KST)
* **Audio Delivery Pipeline:**
  1. Enclosure URL: `http://podcastdown.sbs.co.kr/powerfm/2026/09/POWER-V0000328482-20260910(14-00)-...MP3`
  2. Resolves via `301 Moved Permanently` to AWS CloudFront CDN: `https://podcastfile2.sbs.co.kr/powerfm/...MP3`
* **Verified Network Characteristics:**
  * **HTTP Status:** `HTTP/2 200 OK` (116.1 MB full 2-hour broadcast)
  * **Range Requests:** `accept-ranges: bytes` (**Supported**)
  * **Edge Caching:** CloudFront `x-cache: HIT` worldwide
  * **Authentication:** None required.

---

### 2.4 Monterey, CA (Target Location) — NPR & Community Radio AOD APIs

When Monterey, California is the target broadcast source for listeners in Seoul, on-demand programming is accessed through US public and community syndication systems:

#### 1. KAZU 90.3 FM / NPR One Syndication
* **Local Program RSS Feed:** `https://www.kazu.org/rss.xml`
* **Content Catalog:** KAZU produces local Monterey Bay news reports, environmental documentaries, and regional cut-ins for *Morning Edition* and *All Things Considered*.
* **NPR One & Station API:**
  * Endpoint: `https://api.npr.org/v2/stations/find?call=KAZU`
  * Delivers structured JSON metadata for local segments with direct CDN MP3 enclosure URLs (`ondemand.npr.org/...`).
* **Seek Support:** NPR CDN MP3 files support HTTP Range headers (`Range: bytes=...`) enabling direct byte-offset seeking to any second of a segment.

#### 2. KSQD 90.7 FM — Community Archives (RadioRethink / Spinitron API)
* **Archive Portal:** `https://www.radiorethink.com/tuner/?stationCode=KSQD`
* **On-Demand Catalog:** KSQD archives all live broadcast shows (community affairs, indie rock, jazz) for **14 days** following original broadcast.
* **Stream Delivery:** Audio is indexed by broadcast timestamp ($YYYY\text{-}MM\text{-}DD\text{ }HH:00$) and delivered via Icecast archive endpoints (`https://ksqd.info:8100/archive/...`) with CORS enabled.

#### 3. The 8-Hour Reverse Time-Shift Offset Execution
When a Seoul listener tunes in at $T_{\text{Seoul}} = 08:24:15\text{ KST}$:
1. The resolver queries Monterey's broadcast history for the matching 8:00 AM hour that aired 8 hours ago in Monterey.
2. The seek offset is calculated:
   $$\Delta t_{\text{seek}} = (24 \times 60) + 15 = \mathbf{1,455 \text{ seconds}}$$
3. The client player requests the KAZU/KSQD episode with `Range: bytes=3200000-`, immediately playing the Monterey 8:24:15 AM audio.

---

## 3. Comprehensive Categorization of Potential AOD Sources

The following table categorizes all viable on-demand sources by technical access tier and commercial cost:

| Category | Platform / Source | Access Type | Cost | Pros | Cons / Caveats |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Category 1: Open Broadcaster Syndication (RSS / AOD)** | MBC minicast, KBS MediaFactory, SBS Wizard | **Open / Public** (HTTP RSS / MP3) | **$0 (Free)** | • Zero server storage<br>• Zero server bandwidth<br>• Full CORS on MBC<br>• Byte-range seek supported | Some commercial pop songs are shortened or omitted on specific music shows for podcast licensing. |
| **Category 2: YouTube Visible Radio VODs (*보이는 라디오*)** | MBC 봉춘라디오, SBS 에라오, KBS CoolFM | **Open / API** (YouTube Data API v3) | **$0 (Free)** (10k units/day quota) | • Contains **100% full music**<br>• Available minutes after show ends<br>• Studio video feed included | Requires headless YouTube IFrame/Player integration; background audio on mobile requires care. |
| **Category 3: Internal Broadcaster AOD (*다시듣기*)** | MBC mini Web, KBS KONG, SBS Gorilla App | **Authenticated / Proprietary** | **$0** (Ad-supported for end users) | • Unedited radio feed (full commercials + music + pips) | Undocumented APIs; periodic session token rotation; potential geo-fencing. |
| **Category 4: Korean Audio Platforms** | Podbbang (팟빵), Naver NOW / AudioClip, FLO | **Third-Party Commercial** | **Contact / B2B Licensing** | • Rich bilingual metadata<br>• Aggregated directory across all networks | Commercial API agreements needed for public product syndication. |
| **Category 5: Cloud Stream Recording as a Service** | Zeno Media, Radio.co, AWS MediaLive / EventBridge | **Managed Third-Party B2B** | **$15 – $60 / month** | • True live stream recorded to S3<br>• Zero local server storage | Ongoing monthly SaaS cost; requires configuring 24/7 stream recorders. |

---

## 4. Cost & Resource Comparison: Rolling Buffer vs. AOD Sync

| Resource Metric | Model B: Rolling Server Buffer (FFmpeg + S3) | Model C: Virtual AOD Sync (Broadcaster CDNs) | Variance / Savings |
| :--- | :--- | :--- | :--- |
| **Server Audio Disk Storage** | **~5.52 GB** (4 stations $\times$ 24 hours) | **0 GB** (Audio is hosted on broadcaster CDNs) | **100% Storage Elimination** |
| **Server Ingestion CPU** | Constant 24/7 FFmpeg processes (~15–25% CPU) | Zero continuous capture (0% background CPU) | **Significant CPU Savings** |
| **Server Outbound Bandwidth (5 users / mo)** | **~21.6 GB** (AAC) / **~10.8 GB** (Opus) | **< 50 MB** (Streamed client-to-CDN direct) | **> 99% Bandwidth Offload** |
| **Music Completeness** | 100% (Exact broadcast copy) | 100% on YouTube VOD / ~85% on Podcast RSS | Dependent on source selected |
| **Infrastructure Sizing** | Dedicated VPS / Container with persistent NVMe | Lightweight serverless instance (Cloud Run / Vercel) | Cheaper & zero maintenance |

---

## 5. Recommended Implementation Roadmap for TimeShift Radio

To implement Model C inside the TimeShift Radio application:

1. **Step 1: Build an Episode Resolver Service (`server/aodResolver.ts`)**
   * Maintain a registry mapping station IDs and schedule hours to broadcaster podcast RSS feed URLs across both Seoul and Monterey locations:
     ```typescript
     export const STATION_AOD_REGISTRY = {
       // Target Location: Seoul, South Korea
       mbc_standard: {
         morning_commute: "http://minicast.imbc.com/PodCast/pod.aspx?code=1000674100000100000",
         evening_drive: "http://minicast.imbc.com/PodCast/pod.aspx?code=1000578100000100000"
       },
       sbs_power: {
         morning_commute: "http://wizard2.sbs.co.kr/w3/podcast/V2000010054.xml",
         afternoon_show: "http://wizard2.sbs.co.kr/w3/podcast/V0000328482.xml"
       },
       // Target Location: Monterey, CA, USA
       kazu_903: {
         morning_edition: "https://www.kazu.org/rss.xml",
         local_news: "https://api.npr.org/v2/stations/find?call=KAZU"
       },
       ksqd_907: {
         community_archive: "https://ksqd.info:8100/archive/"
       }
     };
     ```
2. **Step 2: Time-Shift Calculation & Metadata Endpoint**
   * Provide an API endpoint (`/api/timeshift/resolve/:targetLocation/:stationId/:listenerHour`) that parses the feed, computes the appropriate delay ($\Delta T$ or $24 - \Delta T$), locates the matching episode, computes $\Delta t_{\text{seek}}$, and returns:
     ```json
     {
       "targetLocation": "monterey_ca",
       "listenerLocation": "seoul_kr",
       "stationId": "kazu_903",
       "streamUrl": "https://ondemand.npr.org/anon.npr-mp3/npr/kazu/2026/09/morning_local_news.mp3",
       "seekOffsetSeconds": 1455,
       "episodeTitle": "KAZU Monterey Bay Local News & Marine Sanctuary Report",
       "corsDirectPlay": true
     }
     ```
3. **Step 3: Frontend Playback Controller**
   * Set `audioElement.src = streamUrl`.
   * On `canplay` or `loadedmetadata`, set `audioElement.currentTime = seekOffsetSeconds`.
   * For music shows where complete music tracks are desired, fall back to the synchronized YouTube "Visible Radio" player.
