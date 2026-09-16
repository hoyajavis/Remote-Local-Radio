import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Helper to calculate CRC32 for PNG chunks
function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    let byte = buf[i];
    for (let j = 0; j < 8; j++) {
      if ((crc ^ byte) & 1) {
        crc = (crc >>> 1) ^ 0xEDB88320;
      } else {
        crc = crc >>> 1;
      }
      byte >>>= 1;
    }
  }
  return (crc ^ -1) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const combined = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(combined), 0);
  return Buffer.concat([len, combined, crcBuf]);
}

function createSolidPng(width, height, r, g, b) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR: 13 bytes
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw scanlines: each row starts with filter byte 0, followed by width * 4 bytes
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None

    // Create a subtle metallic gradient / border frame
    const isBorder = y < 16 || y >= height - 16;
    const gradientFactor = 0.85 + (0.3 * (1 - y / height));

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const isPixelBorder = isBorder || x < 16 || x >= width - 16;

      if (isPixelBorder) {
        // Metallic silver border
        rawData[pixelOffset] = 180;
        rawData[pixelOffset + 1] = 185;
        rawData[pixelOffset + 2] = 190;
        rawData[pixelOffset + 3] = 255;
      } else {
        // Main station color with gradient
        rawData[pixelOffset] = Math.min(255, Math.floor(r * gradientFactor));
        rawData[pixelOffset + 1] = Math.min(255, Math.floor(g * gradientFactor));
        rawData[pixelOffset + 2] = Math.min(255, Math.floor(b * gradientFactor));
        rawData[pixelOffset + 3] = 255;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Stations configuration with authentic colors
const STATIONS = [
  { id: 'mbc-919', name: 'MBC FM4U', freq: '91.9 MHz', color: [2, 132, 199], sub: '만나면 좋은 친구' },
  { id: 'sbs-1077', name: 'SBS Power FM', freq: '107.7 MHz', color: [245, 158, 11], sub: '보는 라디오 즐거움' },
  { id: 'kbs-891', name: 'KBS Cool FM', freq: '89.1 MHz', color: [225, 29, 72], sub: '대한민국 대표 음악채널' },
  { id: 'tbs-951', name: 'TBS FM', freq: '95.1 MHz', color: [16, 185, 129], sub: '서울 교통 & 시사' },
  { id: 'cbs-939', name: 'CBS Music FM', freq: '93.9 MHz', color: [99, 102, 241], sub: '아름다운 음악의 숲' },
  { id: 'ebs-1045', name: 'EBS FM', freq: '104.5 MHz', color: [139, 92, 246], sub: '책 읽어주는 라디오' },
  { id: 'kqei-893', name: 'KQED Monterey', freq: '89.3 MHz', color: [234, 88, 12], sub: 'Northern CA Public Radio' },
  { id: 'kazu-903', name: 'KAZU 90.3 NPR', freq: '90.3 MHz', color: [2, 132, 199], sub: 'Monterey Bay NPR News' },
  { id: 'ksqd-907', name: 'KSQD 90.7', freq: '90.7 MHz', color: [16, 185, 129], sub: 'Central Coast Community' },
  { id: 'kzsc-881', name: 'KZSC 88.1', freq: '88.1 MHz', color: [245, 158, 11], sub: 'The Great 88 Santa Cruz' },
  { id: 'smoothjazz-100', name: 'SmoothJazz.com', freq: '100.1 MHz', color: [139, 92, 246], sub: 'Carmel-by-the-Sea' },
  { id: 'tbs-1013', name: 'TBS eFM', freq: '101.3 MHz', color: [6, 182, 212], sub: 'English Commuter Bridge' },
  { id: 'kbs-931', name: 'KBS Classic FM', freq: '93.1 MHz', color: [14, 165, 233], sub: '명작 클래식 & 밤의 재즈' },
  { id: 'kbs-1061', name: 'KBS Happy FM', freq: '106.1 MHz', color: [249, 115, 22], sub: '중장년 감성 레트로 가요' },
  { id: 'afn-885', name: 'AFN The Eagle', freq: '88.5 MHz', color: [30, 58, 138], sub: 'American Top 40 & Sports' },
  { id: 'kwav-969', name: 'KWAV 96.9', freq: '96.9 MHz', color: [14, 116, 144], sub: 'Monterey Adult Contemporary' },
  { id: 'kdon-1025', name: '102.5 KDON', freq: '102.5 MHz', color: [219, 39, 119], sub: 'Monterey Top 40 Hits' },
  { id: 'kocn-1051', name: '105.1 K-Ocean', freq: '105.1 MHz', color: [217, 119, 6], sub: 'Rhythmic Oldies & R&B' },
  { id: 'kpig-1075', name: 'KPIG 107.5', freq: '107.5 MHz', color: [180, 83, 9], sub: 'Americana, Blues & Folk' },
  { id: 'ktom-927', name: '92.7 K-TOM', freq: '92.7 MHz', color: [30, 64, 175], sub: 'Salinas Valley Country' },
  { id: 'kdfc-899', name: 'KDFC 89.9', freq: '89.9 MHz', color: [136, 19, 55], sub: 'Northern CA Classical' },
  { id: 'ytn-945', name: 'YTN News FM', freq: '94.5 MHz', color: [2, 132, 199], sub: '24시간 대한민국 뉴스채널' },
  { id: 'mbc-959', name: 'MBC 표준FM', freq: '95.9 MHz', color: [3, 105, 161], sub: '시선을 모으는 정통 시사' },
  { id: 'kbs-973', name: 'KBS 1라디오', freq: '97.3 MHz', color: [29, 78, 216], sub: '대한민국 정통 시사보도' },
  { id: 'cbs-981', name: 'CBS 표준FM', freq: '98.1 MHz', color: [15, 118, 110], sub: '정론직필 시사 저널리즘' },
  { id: 'sbs-1035', name: 'SBS 러브FM', freq: '103.5 MHz', color: [194, 65, 12], sub: '생생한 시사와 유쾌한 토크' }
];

// 1. Ensure target directories exist
const iconsDir = path.join(projectRoot, 'public', 'icons');
const artworkDir = path.join(projectRoot, 'public', 'artwork');
fs.mkdirSync(iconsDir, { recursive: true });
fs.mkdirSync(artworkDir, { recursive: true });

console.log('Generating high-resolution artwork and icons...');

// 2. Generate Base App Icons (Amber/Costel retro theme)
const appIconPng = createSolidPng(512, 512, 245, 158, 11);
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), appIconPng);
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createSolidPng(192, 192, 245, 158, 11));

// Also generate high-quality SVG app icon
const appIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2d221b"/>
      <stop offset="50%" stop-color="#181310"/>
      <stop offset="100%" stop-color="#0a0807"/>
    </linearGradient>
    <linearGradient id="amber" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)" stroke="#44352b" stroke-width="8"/>
  <rect x="36" y="36" width="440" height="440" rx="80" fill="none" stroke="#f59e0b" stroke-opacity="0.25" stroke-width="4"/>
  
  <!-- Radio Dial & Speaker Grill -->
  <circle cx="256" cy="256" r="160" fill="#120e0c" stroke="#f59e0b" stroke-width="12"/>
  <circle cx="256" cy="256" r="136" fill="none" stroke="#f59e0b" stroke-opacity="0.15" stroke-width="2"/>
  
  <!-- Frequency Marks -->
  <path d="M 256 120 L 256 140" stroke="#f59e0b" stroke-width="6" stroke-linecap="round"/>
  <path d="M 160 160 L 174 174" stroke="#f59e0b" stroke-width="6" stroke-linecap="round"/>
  <path d="M 352 160 L 338 174" stroke="#f59e0b" stroke-width="6" stroke-linecap="round"/>
  
  <!-- Central Knob -->
  <circle cx="256" cy="256" r="72" fill="url(#amber)" filter="drop-shadow(0 8px 16px rgba(0,0,0,0.6))"/>
  <circle cx="256" cy="256" r="48" fill="#78350f"/>
  <line x1="256" y1="216" x2="256" y2="240" stroke="#fef3c7" stroke-width="6" stroke-linecap="round"/>
  
  <!-- Typography -->
  <text x="256" y="440" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="34" letter-spacing="4" fill="#f59e0b" text-anchor="middle">TIMESHIFT</text>
</svg>`;
fs.writeFileSync(path.join(iconsDir, 'icon.svg'), appIconSvg);

// 3. Generate PNG & SVG for each station
for (const st of STATIONS) {
  // Generate PNG
  const pngBuf = createSolidPng(512, 512, st.color[0], st.color[1], st.color[2]);
  fs.writeFileSync(path.join(artworkDir, `${st.id}.png`), pngBuf);

  // Generate SVG Card with authentic typography for lock-screen display
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg-${st.id}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgb(${Math.min(255, st.color[0] + 40)}, ${Math.min(255, st.color[1] + 40)}, ${Math.min(255, st.color[2] + 40)})"/>
      <stop offset="100%" stop-color="rgb(${Math.max(0, st.color[0] - 40)}, ${Math.max(0, st.color[1] - 40)}, ${Math.max(0, st.color[2] - 40)})"/>
    </linearGradient>
    <linearGradient id="bezel" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.4"/>
    </linearGradient>
  </defs>
  
  <!-- Outer Chassis -->
  <rect width="512" height="512" rx="64" fill="url(#bg-${st.id})"/>
  <rect width="512" height="512" rx="64" fill="url(#bezel)"/>
  <rect x="16" y="16" width="480" height="480" rx="52" fill="none" stroke="#ffffff" stroke-opacity="0.2" stroke-width="4"/>

  <!-- Top Badge: TIMESHIFT PURE RADIO -->
  <rect x="156" y="44" width="200" height="32" rx="16" fill="#000000" fill-opacity="0.4"/>
  <text x="256" y="65" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="12" letter-spacing="3" fill="#ffffff" fill-opacity="0.9" text-anchor="middle">TIMESHIFT RADIO</text>

  <!-- Central Display Plate -->
  <rect x="48" y="100" width="416" height="312" rx="32" fill="#000000" fill-opacity="0.55" stroke="#ffffff" stroke-opacity="0.15" stroke-width="2"/>
  
  <!-- Frequency Pill -->
  <rect x="80" y="132" width="130" height="36" rx="8" fill="#ffffff" fill-opacity="0.15"/>
  <text x="145" y="156" font-family="ui-monospace, monospace" font-weight="900" font-size="16" letter-spacing="1" fill="#facc15" text-anchor="middle">${st.freq}</text>

  <!-- Station Name -->
  <text x="80" y="230" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="38" fill="#ffffff">${st.name}</text>
  
  <!-- Tagline / Korean Network -->
  <text x="80" y="272" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="18" fill="#e2e8f0" fill-opacity="0.85">${st.sub}</text>

  <!-- Graphic EQ indicator line -->
  <g transform="translate(80, 320)">
    <rect x="0" y="12" width="6" height="24" rx="3" fill="#10b981"/>
    <rect x="12" y="4" width="6" height="32" rx="3" fill="#10b981"/>
    <rect x="24" y="18" width="6" height="18" rx="3" fill="#10b981"/>
    <rect x="36" y="8" width="6" height="28" rx="3" fill="#10b981"/>
    <rect x="48" y="0" width="6" height="36" rx="3" fill="#10b981"/>
    <rect x="60" y="14" width="6" height="22" rx="3" fill="#10b981"/>
    <rect x="72" y="20" width="6" height="16" rx="3" fill="#10b981"/>
    <text x="96" y="26" font-family="ui-monospace, monospace" font-weight="700" font-size="13" letter-spacing="2" fill="#10b981">ON AIR • LIVE SYNC</text>
  </g>

  <!-- Bottom Brand -->
  <text x="256" y="462" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="14" letter-spacing="4" fill="#ffffff" fill-opacity="0.6" text-anchor="middle">COSTEL MULTIMEDIA</text>
</svg>`;
  fs.writeFileSync(path.join(artworkDir, `${st.id}.svg`), svg);
}

console.log(`Successfully generated ${STATIONS.length} station artworks and app icons!`);
