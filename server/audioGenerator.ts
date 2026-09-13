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
 * Generate authentic Korean hourly time check signal (시보 음):
 * In South Korea, radio time signal plays at 57s, 58s, 59s with high pitched short pips (1000Hz, 100ms)
 * and at 00s a sustained higher tone (2000Hz or 1000Hz, 800ms) indicating the exact hour!
 */
export function generateTimeCheckSignal(hour: number): Buffer {
  const sampleRate = 22050;
  const durationSec = 4.5;
  const totalSamples = Math.floor(sampleRate * durationSec);
  const samples = new Float32Array(totalSamples);

  // Korean HLA broadcast standard: 3 warning pips at 440 Hz (A4) and 1 long chime at 880 Hz (A5)
  const pips = [
    { start: 0.5, dur: 0.10, freq: 440 },
    { start: 1.5, dur: 0.10, freq: 440 },
    { start: 2.5, dur: 0.10, freq: 440 },
    { start: 3.5, dur: 0.80, freq: 880 } // The top-of-hour long beep
  ];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let val = 0;

    for (const pip of pips) {
      if (t >= pip.start && t < pip.start + pip.dur) {
        const pt = t - pip.start;
        // smooth attack and decay
        const env = Math.sin((pt / pip.dur) * Math.PI);
        val += Math.sin(2 * Math.PI * pip.freq * pt) * env * 0.5;
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
