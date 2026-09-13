import '@testing-library/jest-dom/vitest';
import { beforeEach, vi } from 'vitest';

// 1. Mock Web Audio API
class MockAudioParam {
  value: number;
  constructor(defaultValue: number = 0) {
    this.value = defaultValue;
  }
  setValueAtTime = vi.fn((val: number) => { this.value = val; });
  setTargetAtTime = vi.fn((val: number) => { this.value = val; });
  linearRampToValueAtTime = vi.fn((val: number) => { this.value = val; });
  exponentialRampToValueAtTime = vi.fn((val: number) => { this.value = val; });
}

class MockGainNode {
  gain = new MockAudioParam(1);
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockAnalyserNode {
  fftSize = 128;
  smoothingTimeConstant = 0.8;
  frequencyBinCount = 64;
  getByteFrequencyData = vi.fn((arr: Uint8Array) => {
    arr.fill(32);
  });
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockOscillatorNode {
  type = 'sine';
  frequency = new MockAudioParam(440);
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class MockBiquadFilterNode {
  type = 'lowpass';
  frequency = new MockAudioParam(350);
  gain = new MockAudioParam(0);
  Q = new MockAudioParam(1);
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockWaveShaperNode {
  curve: Float32Array | null = null;
  oversample = 'none';
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockDynamicsCompressorNode {
  threshold = new MockAudioParam(-24);
  knee = new MockAudioParam(30);
  ratio = new MockAudioParam(12);
  attack = new MockAudioParam(0.003);
  release = new MockAudioParam(0.25);
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockBufferSourceNode {
  buffer: any = null;
  loop = false;
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class MockAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};

  createGain() {
    return new MockGainNode();
  }

  createAnalyser() {
    return new MockAnalyserNode();
  }

  createOscillator() {
    return new MockOscillatorNode();
  }

  createBiquadFilter() {
    return new MockBiquadFilterNode();
  }

  createWaveShaper() {
    return new MockWaveShaperNode();
  }

  createDynamicsCompressor() {
    return new MockDynamicsCompressorNode();
  }

  createBuffer(channels: number, length: number, sampleRate: number) {
    return {
      getChannelData: vi.fn(() => new Float32Array(length)),
      duration: length / sampleRate,
      length,
      sampleRate,
      numberOfChannels: channels,
    };
  }

  createBufferSource() {
    return new MockBufferSourceNode();
  }

  createMediaElementSource() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  resume = vi.fn().mockResolvedValue(undefined);
  suspend = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
}

Object.defineProperty(window, 'AudioContext', {
  writable: true,
  configurable: true,
  value: MockAudioContext,
});
(window as any).webkitAudioContext = MockAudioContext;

// 2. Mock HTMLMediaElement methods
window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
window.HTMLMediaElement.prototype.pause = vi.fn();
window.HTMLMediaElement.prototype.load = vi.fn();
window.HTMLMediaElement.prototype.canPlayType = vi.fn().mockReturnValue('maybe');

// 3. Mock Screen Wake Lock API
Object.defineProperty(navigator, 'wakeLock', {
  writable: true,
  configurable: true,
  value: {
    request: vi.fn().mockResolvedValue({
      release: vi.fn().mockResolvedValue(undefined),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  },
});

// 4. Mock MediaSession API
class MockMediaMetadata {
  title = '';
  artist = '';
  album = '';
  artwork: any[] = [];
  constructor(init?: any) {
    if (init) Object.assign(this, init);
  }
}
(window as any).MediaMetadata = MockMediaMetadata;
(globalThis as any).MediaMetadata = MockMediaMetadata;

Object.defineProperty(navigator, 'mediaSession', {
  writable: true,
  configurable: true,
  value: {
    setActionHandler: vi.fn(),
    setPositionState: vi.fn(),
    playbackState: 'none',
    metadata: null,
  },
});

// 5. Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// 6. Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  createLinearGradient: vi.fn().mockReturnValue({
    addColorStop: vi.fn(),
  }),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
}) as any;

// 7. Reset localStorage before each test
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});
