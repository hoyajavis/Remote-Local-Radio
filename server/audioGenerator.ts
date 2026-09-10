/**
 * Server-side Audio Generator for Time-Shifted Broadcast Segments
 * Produces valid PCM WAV chunks with station musical motifs, ambient broadcast textures,
 * and authentic Korean radio time signals.
 */

export function createWavBuffer(samples: Float32Array, sampleRate: number = 22050): Buffer {
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF chunk descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // "fmt " sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // subchunk1size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // audioFormat (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // bitsPerSample (16)

  // "data" sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Write PCM 16-bit samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    // Clamp to -1.0 to 1.0
    const s = Math.max(-1, Math.min(1, samples[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
    buffer.writeInt16LE(Math.floor(val), offset);
    offset += 2;
  }

  return buffer;
}

/**
 * Generate a 6-second broadcast segment tailored to the station and hour
 */
export function generateBroadcastSegment(
  stationId: string,
  hour: number,
  segmentIndex: number,
  durationSec: number = 6
): Buffer {
  const sampleRate = 22050;
  const totalSamples = Math.floor(sampleRate * durationSec);
  const samples = new Float32Array(totalSamples);

  // Base harmony frequency depending on station and time of day
  // Morning (5-9): C Major / A Minor uplifting chords (261Hz, 329Hz, 392Hz)
  // Afternoon (12-16): Vibrant G Major / D Major chords (392Hz, 440Hz, 587Hz)
  // Evening (18-21): Warm Soul / Jazz 7th chords (F Major 7, A Minor)
  // Night (22-4): Dreamy Lo-fi / Pentatonic ambient chill (E minor, B minor)
  
  let baseFreq = 220; // A3
  if (stationId === 'mbc-919') {
    baseFreq = (hour >= 6 && hour < 12) ? 261.63 : (hour >= 12 && hour < 18) ? 293.66 : (hour >= 18 && hour < 22) ? 220.00 : 196.00;
  } else if (stationId === 'kbs-891') {
    baseFreq = 329.63; // E4 upbeat
  } else if (stationId === 'sbs-1077') {
    baseFreq = 293.66; // D4 bright
  } else if (stationId === 'tbs-1013') {
    baseFreq = 246.94; // B3 cosmopolitan
  } else {
    baseFreq = 220;
  }

  // Chord progression changes every 2 seconds
  const chordRoots = [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 1.334];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const chordIdx = Math.floor(t / 1.5) % chordRoots.length;
    const f = chordRoots[chordIdx];

    // Sub-bass root
    const bass = 0.25 * Math.sin(2 * Math.PI * (f / 2) * t);

    // Warm Rhodes / FM electric piano harmonic stack
    const fundamental = 0.22 * Math.sin(2 * Math.PI * f * t);
    const harmonic3 = 0.12 * Math.sin(2 * Math.PI * f * 1.5 * t);
    const harmonic5 = 0.08 * Math.sin(2 * Math.PI * f * 2.0 * t);
    const shimmer = 0.04 * Math.sin(2 * Math.PI * (f * 3.01) * t);

    // Subtle gentle rhythm pulse (snare/rim click + hi-hat tick every 0.75s)
    const beatPhase = (t % 0.75) / 0.75;
    const kickEnvelope = Math.exp(-beatPhase * 25);
    const kick = 0.15 * Math.sin(2 * Math.PI * 60 * beatPhase) * kickEnvelope;

    // Atmospheric warm analog radio hiss (subtle)
    const radioNoise = (Math.random() * 2 - 1) * 0.018;

    // Smooth envelope at chunk boundaries to prevent clicks
    let envelope = 1.0;
    const fadeSamples = sampleRate * 0.05; // 50ms fade
    if (i < fadeSamples) {
      envelope = i / fadeSamples;
    } else if (i > totalSamples - fadeSamples) {
      envelope = (totalSamples - i) / fadeSamples;
    }

    samples[i] = (bass + fundamental + harmonic3 + harmonic5 + shimmer + kick + radioNoise) * envelope * 0.7;
  }

  return createWavBuffer(samples, sampleRate);
}

/**
 * Generate authentic Korean hourly time check signal (시보 음):
 * In South Korea, radio time signal plays at 57s, 58s, 59s with high pitched short pips (1000Hz, 100ms)
 * and at 00s a sustained higher tone (2000Hz or 1000Hz, 800ms) indicating the exact hour!
 */
export function generateTimeCheckSignal(hour: number): Buffer {
  const sampleRate = 22050;
  const durationSec = 4.5;
  const totalSamples = Math.floor(sampleRate * durationSec);
  const samples = new Float32Array(totalSamples);

  // Pip events at t = 0.5s (57s), t = 1.5s (58s), t = 2.5s (59s), t = 3.5s (00s sustained)
  const pips = [
    { start: 0.5, dur: 0.12, freq: 880 },
    { start: 1.5, dur: 0.12, freq: 880 },
    { start: 2.5, dur: 0.12, freq: 880 },
    { start: 3.5, dur: 0.75, freq: 1760 } // The top-of-hour long beep
  ];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let val = 0;

    for (const pip of pips) {
      if (t >= pip.start && t < pip.start + pip.dur) {
        const pt = t - pip.start;
        // smooth attack and decay
        const env = Math.sin((pt / pip.dur) * Math.PI);
        val += Math.sin(2 * Math.PI * pip.freq * pt) * env * 0.6;
      }
    }

    samples[i] = val;
  }

  return createWavBuffer(samples, sampleRate);
}

/**
 * Generate Station Jingle Identifier
 */
export function generateStationJingle(stationId: string): Buffer {
  const sampleRate = 22050;
  const durationSec = 3.2;
  const totalSamples = Math.floor(sampleRate * durationSec);
  const samples = new Float32Array(totalSamples);

  // Pentatonic MBC FM4U / Radio Chime: Sol - Do - Re - Mi - Sol
  const notes = [392.00, 523.25, 587.33, 659.25, 783.99];
  const noteDuration = 0.5;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let val = 0;

    const noteIdx = Math.min(notes.length - 1, Math.floor(t / noteDuration));
    const noteTime = t - noteIdx * noteDuration;
    const freq = notes[noteIdx];

    // Bell / chime envelope
    const env = Math.exp(-noteTime * 5.0);
    // Glockenspiel / chime tone with harmonics
    const chime = Math.sin(2 * Math.PI * freq * noteTime) * 0.4
      + Math.sin(2 * Math.PI * freq * 2 * noteTime) * 0.2
      + Math.sin(2 * Math.PI * freq * 3.5 * noteTime) * 0.1;

    val = chime * env;
    samples[i] = val;
  }

  return createWavBuffer(samples, sampleRate);
}
