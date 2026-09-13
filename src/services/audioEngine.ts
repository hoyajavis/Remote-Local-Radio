/**
 * Web Audio Engine for TimeShift Radio
 * Pure TimeShift Architecture with Documented Multi-Tier Archive Streaming:
 * - Direct HTTP byte-range seeking from official broadcaster CDNs
 * - Web Audio AnalyserNode feeding the green LCD spectrum visualizer
 * - Pure client-side Korean top-of-hour 시보 (chime pips) and analog FM tuning static
 * - MediaSession API integration for mobile background audio & lock screen controls
 */

import Hls from 'hls.js';

export interface ResolvedStreamInfo {
  stationId: string;
  stationName: string;
  showTitle: string;
  showTitleKo: string;
  djName: string;
  broadcastHour: number;
  showStartHour?: number;
  tier: string;
  tierLabel: string;
  audioUrl: string;
  seekOffsetSeconds: number;
  videoSeekOffsetSeconds?: number;
  totalDurationSeconds: number;
  youtubeVideoId?: string;
  isReplay: boolean;
  replayDate?: string;
  needsProxy?: boolean;
  episodeSubtitle?: string;
  guests?: string[];
  cornerTitle?: string;
  isLiveOnAir?: boolean;
  isLiveVideoStream?: boolean;
  isPaywalled?: boolean;
  paywallNotice?: string;
}

export interface MediaSessionCallbacks {
  onPlay?: () => void;
  onPause?: () => void;
  onNextPreset?: () => void;
  onPreviousPreset?: () => void;
}

export type PlaybackTelemetryStatus =
  | 'idle'
  | 'tuning'
  | 'buffering'
  | 'playing'
  | 'stalled'
  | 'reconnecting'
  | 'error'
  | 'paywalled';

export interface PlaybackTelemetry {
  status: PlaybackTelemetryStatus;
  retryAttempt: number;
  maxRetries: number;
  message?: string;
  messageKo?: string;
  lastUpdated: number;
}

export type PlaybackTelemetryListener = (telemetry: PlaybackTelemetry) => void;

type StreamInfoListener = (info: ResolvedStreamInfo | null) => void;

export type AudioEffectMode = 'clean' | 'tube' | 'tabletop' | 'vintage_am';

function makeTriodeCurve(samples = 1024): Float32Array {
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; ++i) {
    const x = (i * 2) / samples - 1;
    // Asymmetric triode soft saturation: gentle 2nd harmonic warmth
    if (x < -1) {
      curve[i] = -1;
    } else if (x > 1) {
      curve[i] = 1;
    } else {
      curve[i] = Math.tanh(1.25 * x) + 0.05 * (x * x - 0.25);
    }
  }
  return curve;
}

function makeTabletopCurve(samples = 1024): Float32Array {
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; ++i) {
    const x = (i * 2) / samples - 1;
    // Small acoustic speaker driver soft limiting
    curve[i] = Math.tanh(1.35 * x);
  }
  return curve;
}

function makeTransistorCurve(samples = 1024): Float32Array {
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; ++i) {
    const x = (i * 2) / samples - 1;
    // Compact transistor radio mild clipping / compression
    curve[i] = (1.5 * x) / (1 + Math.abs(1.2 * x));
  }
  return curve;
}

function makeLinearCurve(samples = 2): Float32Array {
  const curve = new Float32Array(samples);
  curve[0] = -1;
  curve[1] = 1;
  return curve;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private mediaSourceNode: MediaElementAudioSourceNode | null = null;
  private hls: Hls | null = null;

  // Web Audio DSP After-Effects Nodes
  private audioEffectMode: AudioEffectMode = 'clean';
  private effectInputGain: GainNode | null = null;
  private effectFilterLow: BiquadFilterNode | null = null;
  private effectFilterMid: BiquadFilterNode | null = null;
  private effectFilterHigh: BiquadFilterNode | null = null;
  private effectWaveShaper: WaveShaperNode | null = null;
  private effectCompressor: DynamicsCompressorNode | null = null;
  private rfNoiseSource: AudioBufferSourceNode | null = null;
  private rfNoiseGain: GainNode | null = null;

  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private isDuckedForVideo: boolean = false;
  private currentVolume: number = 0.85;

  private mediaSessionCallbacks: MediaSessionCallbacks = {};

  private currentStationId: string = 'mbc-919';
  private currentTargetHour: number = 7;
  private currentTargetMinute: number = 0;
  private currentTargetSecond: number = 0;
  private currentBand: 'seoul_in_usa' | 'california_in_seoul' = 'seoul_in_usa';
  private isCamMode: boolean = false;

  private currentStreamInfo: ResolvedStreamInfo | null = null;
  private listeners: Set<StreamInfoListener> = new Set();
  private isSeeking: boolean = false;
  private lastTransitionHour: number = -1;
  private isChimeTriggered: boolean = false;

  private telemetry: PlaybackTelemetry = {
    status: 'idle',
    retryAttempt: 0,
    maxRetries: 3,
    lastUpdated: Date.now()
  };
  private telemetryListeners: Set<PlaybackTelemetryListener> = new Set();
  private retryTimer: any = null;
  private stallTimer: any = null;
  private maxRetries: number = 3;
  private currentRetryAttempt: number = 0;

  public init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtxClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.currentVolume;

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.8;

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      // Web Audio DSP After-Effects Chain:
      // effectInputGain -> effectFilterLow -> effectFilterMid -> effectFilterHigh -> effectCompressor -> effectWaveShaper -> masterGain
      this.effectInputGain = this.ctx.createGain();
      this.effectFilterLow = this.ctx.createBiquadFilter();
      this.effectFilterMid = this.ctx.createBiquadFilter();
      this.effectFilterHigh = this.ctx.createBiquadFilter();
      this.effectCompressor = this.ctx.createDynamicsCompressor();
      this.effectWaveShaper = this.ctx.createWaveShaper();

      this.effectInputGain.connect(this.effectFilterLow);
      this.effectFilterLow.connect(this.effectFilterMid);
      this.effectFilterMid.connect(this.effectFilterHigh);
      this.effectFilterHigh.connect(this.effectCompressor);
      this.effectCompressor.connect(this.effectWaveShaper);
      this.effectWaveShaper.connect(this.masterGain);

      // RF Atmospheric Noise Bed (for Vintage AM)
      this.rfNoiseGain = this.ctx.createGain();
      this.rfNoiseGain.gain.value = 0;
      this.rfNoiseGain.connect(this.masterGain);

      try {
        const noiseBuf = this.createRfNoiseBuffer();
        if (noiseBuf) {
          this.rfNoiseSource = this.ctx.createBufferSource();
          this.rfNoiseSource.buffer = noiseBuf;
          this.rfNoiseSource.loop = true;
          this.rfNoiseSource.connect(this.rfNoiseGain);
          this.rfNoiseSource.start();
        }
      } catch (e) {
        console.warn('[AudioEngine] RF noise generator note:', e);
      }

      // Initialize DSP filter parameters with current mode
      this.setAudioEffect(this.audioEffectMode);
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (!this.audioElement && typeof window !== 'undefined') {
      this.audioElement = new Audio();
      this.audioElement.crossOrigin = 'anonymous';
      this.audioElement.preload = 'auto';

      // Media element telemetry & recovery event handlers
      this.audioElement.addEventListener('waiting', () => {
        if (this.isPlaying && !this.isDuckedForVideo) {
          this.setTelemetry('buffering', { message: 'Buffering stream...', messageKo: '스트림 버퍼링 중...' });
          if (!this.stallTimer) {
            this.stallTimer = setTimeout(() => {
              if (this.isPlaying && !this.isDuckedForVideo) {
                console.warn('[AudioEngine] Buffer wait exceeded 4s, marking as stalled');
                this.setTelemetry('stalled', { message: 'Stream stalled. Waiting for packets...', messageKo: '스트림 지연 중...' });
                this.scheduleReconnect();
              }
            }, 4000);
          }
        }
      });

      this.audioElement.addEventListener('stalled', () => {
        if (this.isPlaying && !this.isDuckedForVideo) {
          console.warn('[AudioEngine] Media stalled event received');
          this.setTelemetry('stalled', { message: 'Network stalled. Recovering...', messageKo: '네트워크 수신 지연. 복구 시도 중...' });
          this.scheduleReconnect();
        }
      });

      this.audioElement.addEventListener('playing', () => {
        this.clearStallAndRetryTimers();
        this.currentRetryAttempt = 0;
        this.setTelemetry('playing', { retryAttempt: 0, message: 'On Air', messageKo: '방송 중' });
      });

      this.audioElement.addEventListener('canplay', () => {
        if (this.telemetry.status === 'buffering' || this.telemetry.status === 'tuning') {
          if (!this.audioElement?.paused) {
            this.clearStallAndRetryTimers();
            this.setTelemetry('playing', { retryAttempt: 0, message: 'On Air', messageKo: '방송 중' });
          }
        }
      });

      this.audioElement.addEventListener('error', (e) => {
        console.warn('[AudioEngine] Media element error event:', e);
        if (this.isPlaying && !this.isDuckedForVideo) {
          this.setTelemetry('error', { message: 'Playback error encountered.', messageKo: '재생 오류 발생' });
          this.scheduleReconnect();
        }
      });

      this.audioElement.addEventListener('pause', () => {
        if (!this.isPlaying && !this.isDuckedForVideo) {
          this.setTelemetry('idle', { message: 'Standby', messageKo: '대기 중' });
        }
      });

      // Periodic lock-screen scrubber position update
      this.audioElement.addEventListener('timeupdate', () => {
        if (Math.floor(this.audioElement?.currentTime || 0) % 5 === 0) {
          this.updatePositionState();
        }
      });

      // Once media element source is connected to Web Audio, it stays connected
      if (this.ctx && !this.mediaSourceNode) {
        try {
          this.mediaSourceNode = this.ctx.createMediaElementSource(this.audioElement);
          this.mediaSourceNode.connect(this.effectInputGain || this.masterGain!);
        } catch (e) {
          console.warn('[AudioEngine] createMediaElementSource warning:', e);
        }
      }
    }
  }

  private createRfNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      data[i] = (b0 + b1 + b2) * 0.08;
    }
    return buffer;
  }

  private updateRfNoiseState() {
    if (!this.ctx || !this.rfNoiseGain) return;
    const now = this.ctx.currentTime || 0;
    const shouldPlayNoise =
      this.audioEffectMode === 'vintage_am' &&
      this.isPlaying &&
      !this.isDuckedForVideo &&
      !this.isMuted;
    this.rfNoiseGain.gain.setTargetAtTime(shouldPlayNoise ? 0.012 : 0, now, 0.08);
  }

  public getAudioEffect(): AudioEffectMode {
    return this.audioEffectMode;
  }

  public setAudioEffect(mode: AudioEffectMode) {
    this.audioEffectMode = mode;
    if (
      !this.ctx ||
      !this.effectFilterLow ||
      !this.effectFilterMid ||
      !this.effectFilterHigh ||
      !this.effectCompressor ||
      !this.effectWaveShaper
    ) {
      return;
    }

    const now = this.ctx.currentTime || 0;
    const ramp = 0.06; // 60ms click-free smooth parameter ramp

    switch (mode) {
      case 'clean':
        // 1. Studio Reference Monitor: Flat uncolored 20Hz-20kHz response, uncompressed
        this.effectFilterLow.type = 'lowshelf';
        this.effectFilterLow.frequency.setTargetAtTime(100, now, ramp);
        this.effectFilterLow.gain.setTargetAtTime(0, now, ramp);

        this.effectFilterMid.type = 'peaking';
        this.effectFilterMid.frequency.setTargetAtTime(1000, now, ramp);
        this.effectFilterMid.gain.setTargetAtTime(0, now, ramp);
        this.effectFilterMid.Q.setTargetAtTime(1.0, now, ramp);

        this.effectFilterHigh.type = 'highshelf';
        this.effectFilterHigh.frequency.setTargetAtTime(10000, now, ramp);
        this.effectFilterHigh.gain.setTargetAtTime(0, now, ramp);

        this.effectCompressor.threshold.setTargetAtTime(0, now, ramp);
        this.effectCompressor.ratio.setTargetAtTime(1, now, ramp);
        this.effectCompressor.attack.setTargetAtTime(0.02, now, ramp);
        this.effectCompressor.release.setTargetAtTime(0.25, now, ramp);

        this.effectWaveShaper.curve = makeLinearCurve();
        break;

      case 'tube':
        // 2. Warm Tube (Analog FM): Low-shelf broadcast warmth (+2.5dB at 100Hz), 75µs FM de-emphasis (-2.0dB at 9.5kHz), soft triode saturation
        this.effectFilterLow.type = 'lowshelf';
        this.effectFilterLow.frequency.setTargetAtTime(100, now, ramp);
        this.effectFilterLow.gain.setTargetAtTime(2.5, now, ramp);

        this.effectFilterMid.type = 'peaking';
        this.effectFilterMid.frequency.setTargetAtTime(350, now, ramp);
        this.effectFilterMid.gain.setTargetAtTime(1.2, now, ramp);
        this.effectFilterMid.Q.setTargetAtTime(0.8, now, ramp);

        this.effectFilterHigh.type = 'highshelf';
        this.effectFilterHigh.frequency.setTargetAtTime(9500, now, ramp);
        this.effectFilterHigh.gain.setTargetAtTime(-2.2, now, ramp);

        this.effectCompressor.threshold.setTargetAtTime(-18, now, ramp);
        this.effectCompressor.ratio.setTargetAtTime(1.8, now, ramp);
        this.effectCompressor.attack.setTargetAtTime(0.02, now, ramp);
        this.effectCompressor.release.setTargetAtTime(0.15, now, ramp);

        this.effectWaveShaper.curve = makeTriodeCurve();
        break;

      case 'tabletop':
        // 3. Vintage Tabletop / Kitchen Speaker: 320Hz cabinet cavity resonance (+3.8dB), vocal presence at 2.8kHz, sub-bass cut, paper cone roll-off
        this.effectFilterLow.type = 'highpass';
        this.effectFilterLow.frequency.setTargetAtTime(85, now, ramp);
        this.effectFilterLow.Q.setTargetAtTime(0.7, now, ramp);

        this.effectFilterMid.type = 'peaking';
        this.effectFilterMid.frequency.setTargetAtTime(320, now, ramp);
        this.effectFilterMid.gain.setTargetAtTime(3.8, now, ramp);
        this.effectFilterMid.Q.setTargetAtTime(1.8, now, ramp);

        this.effectFilterHigh.type = 'peaking';
        this.effectFilterHigh.frequency.setTargetAtTime(2800, now, ramp);
        this.effectFilterHigh.gain.setTargetAtTime(2.2, now, ramp);
        this.effectFilterHigh.Q.setTargetAtTime(1.2, now, ramp);

        this.effectCompressor.threshold.setTargetAtTime(-14, now, ramp);
        this.effectCompressor.ratio.setTargetAtTime(2.5, now, ramp);
        this.effectCompressor.attack.setTargetAtTime(0.01, now, ramp);
        this.effectCompressor.release.setTargetAtTime(0.08, now, ramp);

        this.effectWaveShaper.curve = makeTabletopCurve();
        break;

      case 'vintage_am':
        // 4. Nostalgic AM / Late-Night Transistor: Steep 4.2kHz RF bandpass, 1.8kHz vocal horn peak, AGC compression, atmospheric receiver hiss
        this.effectFilterLow.type = 'highpass';
        this.effectFilterLow.frequency.setTargetAtTime(220, now, ramp);
        this.effectFilterLow.Q.setTargetAtTime(0.9, now, ramp);

        this.effectFilterMid.type = 'peaking';
        this.effectFilterMid.frequency.setTargetAtTime(1800, now, ramp);
        this.effectFilterMid.gain.setTargetAtTime(4.2, now, ramp);
        this.effectFilterMid.Q.setTargetAtTime(1.5, now, ramp);

        this.effectFilterHigh.type = 'lowpass';
        this.effectFilterHigh.frequency.setTargetAtTime(4200, now, ramp);
        this.effectFilterHigh.Q.setTargetAtTime(1.2, now, ramp);

        this.effectCompressor.threshold.setTargetAtTime(-24, now, ramp);
        this.effectCompressor.ratio.setTargetAtTime(4.0, now, ramp);
        this.effectCompressor.attack.setTargetAtTime(0.005, now, ramp);
        this.effectCompressor.release.setTargetAtTime(0.10, now, ramp);

        this.effectWaveShaper.curve = makeTransistorCurve();
        break;
    }

    this.updateRfNoiseState();
  }

  public getTelemetry(): PlaybackTelemetry {
    return { ...this.telemetry };
  }

  public subscribeTelemetry(listener: PlaybackTelemetryListener): () => void {
    this.telemetryListeners.add(listener);
    listener({ ...this.telemetry });
    return () => this.telemetryListeners.delete(listener);
  }

  public setTelemetry(status: PlaybackTelemetryStatus, patch?: Partial<PlaybackTelemetry>) {
    this.telemetry = {
      ...this.telemetry,
      status,
      retryAttempt: this.currentRetryAttempt,
      maxRetries: this.maxRetries,
      lastUpdated: Date.now(),
      ...patch
    };
    for (const listener of this.telemetryListeners) {
      try {
        listener({ ...this.telemetry });
      } catch (err) {
        console.warn('[AudioEngine] Telemetry listener error:', err);
      }
    }
  }

  private clearStallAndRetryTimers() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.stallTimer) {
      clearTimeout(this.stallTimer);
      this.stallTimer = null;
    }
  }

  private scheduleReconnect() {
    if (!this.isPlaying || this.isDuckedForVideo) return;
    this.clearStallAndRetryTimers();

    if (this.currentRetryAttempt >= this.maxRetries) {
      console.warn(`[AudioEngine] Max reconnection attempts (${this.maxRetries}) reached.`);
      this.setTelemetry('error', {
        message: 'Signal lost. Reconnect failed.',
        messageKo: '신호 끊김. 재연결 실패'
      });
      return;
    }

    this.currentRetryAttempt++;
    const delay = Math.min(8000, 1000 * Math.pow(2, this.currentRetryAttempt - 1)); // 1s, 2s, 4s

    this.setTelemetry('reconnecting', {
      retryAttempt: this.currentRetryAttempt,
      maxRetries: this.maxRetries,
      message: `Reconnecting (${this.currentRetryAttempt}/${this.maxRetries})...`,
      messageKo: `신호 재연결 시도 (${this.currentRetryAttempt}/${this.maxRetries})...`
    });

    this.retryTimer = setTimeout(() => {
      this.executeReconnect();
    }, delay);
  }

  private executeReconnect() {
    if (!this.isPlaying || this.isDuckedForVideo) return;
    console.log(`[AudioEngine] Executing reconnect attempt ${this.currentRetryAttempt}/${this.maxRetries}`);

    // If live stream repeatedly fails on this device/network, gracefully fall back to the Tier 1 AOD archive MP3!
    if (this.currentStreamInfo?.isLiveOnAir && this.currentRetryAttempt >= 2 && this.currentStationId) {
      console.warn('[AudioEngine] Live stream repeatedly failing on this device. Falling back to Tier 1 AOD archive...');
      if (this.hls) {
        this.hls.destroy();
        this.hls = null;
      }
      this.play(
        this.currentStationId,
        this.currentTargetHour,
        this.currentTargetMinute,
        this.currentTargetSecond,
        this.currentBand,
        this.isCamMode,
        true // forceArchiveFallback
      ).catch(err => {
        console.error('[AudioEngine] Archive fallback failed:', err);
      });
      return;
    }

    // If HLS instance is active
    if (this.hls) {
      try {
        this.hls.recoverMediaError();
        this.hls.startLoad();
        this.audioElement?.play().catch(e => {
          console.warn('[AudioEngine] Reconnect HLS error:', e);
          this.scheduleReconnect();
        });
      } catch (err) {
        console.warn('[AudioEngine] HLS reconnect exception:', err);
        this.scheduleReconnect();
      }
      return;
    }

    // Standard audio: switch to proxy or reload
    if (this.audioElement && this.currentStreamInfo) {
      const seek = this.audioElement.currentTime || this.currentStreamInfo.seekOffsetSeconds;
      let streamUrl = this.currentStreamInfo.audioUrl;
      // If direct CDN failed or stalled, route through backend proxy
      if (!streamUrl.includes('/api/proxy/audio')) {
        streamUrl = `/api/proxy/audio?url=${encodeURIComponent(streamUrl)}`;
      }
      this.audioElement.src = streamUrl;
      if (seek > 0 && !this.currentStreamInfo.isLiveOnAir) {
        try {
          this.audioElement.currentTime = seek;
        } catch {}
      }
      this.audioElement.load();
      this.audioElement.play().catch(e => {
        console.warn('[AudioEngine] Reconnect play error:', e);
        this.scheduleReconnect();
      });
    }
  }

  public setMediaSessionCallbacks(callbacks: MediaSessionCallbacks) {
    this.mediaSessionCallbacks = callbacks;
  }

  public subscribeStreamInfo(listener: StreamInfoListener): () => void {
    this.listeners.add(listener);
    if (this.currentStreamInfo) {
      listener(this.currentStreamInfo);
    }
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(info: ResolvedStreamInfo | null) {
    this.currentStreamInfo = info;
    for (const listener of this.listeners) {
      listener(info);
    }
  }

  public setVolume(val: number) {
    this.currentVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.currentVolume, this.ctx?.currentTime || 0);
    }
    if (this.audioElement) {
      this.audioElement.volume = this.isMuted ? 0 : this.currentVolume;
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    const effectiveVol = (this.isMuted || this.isDuckedForVideo) ? 0 : this.currentVolume;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(effectiveVol, this.ctx?.currentTime || 0);
    }
    if (this.audioElement) {
      this.audioElement.volume = effectiveVol;
    }
    this.updateRfNoiseState();
    return this.isMuted;
  }

  /**
   * Audio-Video Handshake:
   * Smoothly mutes and pauses background HTML5 audio when YouTube Visible Radio CAM is toggled ON,
   * and cleanly resumes audio when CAM is toggled OFF.
   */
  public duckForVideo(ducked: boolean, resumeSeekSeconds?: number) {
    this.isDuckedForVideo = ducked;
    this.clearStallAndRetryTimers();
    if (ducked) {
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
      if (this.audioElement) {
        this.audioElement.volume = 0;
        this.audioElement.pause();
      }
    } else {
      const effectiveVol = this.isMuted ? 0 : this.currentVolume;
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setValueAtTime(effectiveVol, this.ctx.currentTime);
      }
      if (this.audioElement) {
        this.audioElement.volume = effectiveVol;
        if (typeof resumeSeekSeconds === 'number' && resumeSeekSeconds > 0 && !this.currentStreamInfo?.isLiveOnAir) {
          try {
            this.audioElement.currentTime = resumeSeekSeconds;
          } catch (err) {
            console.warn('[AudioEngine] Error seeking on resume after video:', err);
          }
        }
        if (this.isPlaying) {
          this.setTelemetry('buffering', { message: 'Resuming audio...', messageKo: '오디오 재개 중...' });
          this.audioElement.play().catch(e => console.warn('[AudioEngine] Resume after cam error:', e));
        }
      }
    }
    this.updateRfNoiseState();
  }

  public getIsDuckedForVideo(): boolean {
    return this.isDuckedForVideo;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getFrequencyData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(64);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  public getCurrentStreamInfo(): ResolvedStreamInfo | null {
    return this.currentStreamInfo;
  }

  public getCurrentTime(): number {
    return this.audioElement?.currentTime || 0;
  }

  /**
   * Main playback method: Resolves the multi-tier archive stream and initiates byte-range playback
   */
  public async play(
    stationId: string,
    targetHour: number,
    targetMinute: number = 0,
    targetSecond: number = 0,
    band: 'seoul_in_usa' | 'california_in_seoul' = 'seoul_in_usa',
    isCamMode: boolean = false,
    forceArchiveFallback: boolean = false
  ) {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.clearStallAndRetryTimers();
    this.currentRetryAttempt = 0;
    this.setTelemetry('tuning', { message: 'Tuning station...', messageKo: '주파수 수신 중...' });

    this.currentStationId = stationId;
    this.currentTargetHour = targetHour;
    this.currentTargetMinute = targetMinute;
    this.currentTargetSecond = targetSecond;
    this.currentBand = band;
    this.isCamMode = isCamMode;
    this.isPlaying = true;
    this.updateRfNoiseState();

    // Play tactile analog FM tuning static burst
    this.playTuningStatic(0.18);

    try {
      // 1. Resolve stream from backend (pass client timezone, exact seconds, and liveSync flag)
      const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';
      const liveSyncParam = forceArchiveFallback ? '&liveSync=false' : '';
      const res = await fetch(
        `/api/stream/resolve?stationId=${encodeURIComponent(stationId)}&targetHour=${targetHour}&targetMinute=${targetMinute}&targetSecond=${targetSecond}&band=${band}&isCamRequested=${isCamMode}&timezone=${encodeURIComponent(tz)}${liveSyncParam}`
      );
      if (!res.ok) {
        throw new Error(`Failed to resolve stream (HTTP ${res.status})`);
      }

      const info: ResolvedStreamInfo = await res.json();
      this.notifyListeners(info);

      // Clean up previous Hls instance if any
      if (this.hls) {
        this.hls.destroy();
        this.hls = null;
      }

      // Handle paywalled station (e.g. KPIG 107.5)
      if (info.isPaywalled || !info.audioUrl) {
        this.clearStallAndRetryTimers();
        this.setTelemetry('paywalled', {
          message: info.paywallNotice || 'Subscription Required',
          messageKo: '유료 방송 (구독 필요)'
        });
        if (this.audioElement) {
          this.audioElement.pause();
          this.audioElement.src = '';
        }
        this.isPlaying = false;
        this.updateMediaSession(info);
        return;
      }

      this.setTelemetry('buffering', { message: 'Connecting stream...', messageKo: '방송국 연결 중...' });

      // 2. Select URL: If needs proxy (e.g. plain HTTP or CORS), route through proxy unless HLS
      let streamUrl = info.audioUrl;
      const isHls = streamUrl.includes('.m3u8') || streamUrl.includes('stream/?stn=');
      if ((info.needsProxy || streamUrl.startsWith('http://')) && !isHls) {
        streamUrl = `/api/proxy/audio?url=${encodeURIComponent(streamUrl)}`;
      }

      // 3. Configure audio element
      if (this.audioElement) {
        this.audioElement.pause();

        if (isHls && Hls.isSupported()) {
          this.hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
          });
          this.hls.loadSource(streamUrl);
          this.hls.attachMedia(this.audioElement);
          this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
            this.audioElement?.play().catch(e => {
              console.warn('[AudioEngine] Live HLS autoplay blocked or error:', e);
            });
          });
          this.hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              console.warn('[AudioEngine] Fatal HLS error:', data.type);
              this.setTelemetry('stalled', { message: 'Live stream interrupted', messageKo: '실시간 스트림 끊김' });
              if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                this.hls?.startLoad();
              } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                this.hls?.recoverMediaError();
              }
              this.scheduleReconnect();
            }
          });
        } else if (isHls && this.audioElement.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS for Safari / iOS
          this.audioElement.src = streamUrl;
          this.audioElement.play().catch(e => {
            console.warn('[AudioEngine] Safari native HLS play error:', e);
          });
        } else {
          // Standard MP3 / AAC direct or byte-range seek playback
          this.audioElement.src = streamUrl;

          const applySeek = () => {
            if (!this.audioElement) return;
            if (info.seekOffsetSeconds > 0 && !info.isLiveOnAir) {
              try {
                this.audioElement.currentTime = info.seekOffsetSeconds;
              } catch (err) {
                console.warn('[AudioEngine] Seek error:', err);
              }
            }
          };

          const onReadyToSeek = () => {
            if (!this.audioElement) return;
            applySeek();
            this.audioElement.play().catch(e => {
              console.warn('[AudioEngine] Playback autoplay blocked or error:', e);
            });
            this.audioElement.removeEventListener('loadedmetadata', onReadyToSeek);
            this.audioElement.removeEventListener('canplay', onReadyToSeek);
          };

          const onPlaying = () => {
            if (!this.audioElement) return;
            // Guard: ensure currentTime wasn't reset to 0 by browser play() initiation
            if (info.seekOffsetSeconds > 0 && !info.isLiveOnAir && Math.abs(this.audioElement.currentTime - info.seekOffsetSeconds) > 3) {
              try {
                this.audioElement.currentTime = info.seekOffsetSeconds;
              } catch {}
            }
            this.audioElement.removeEventListener('playing', onPlaying);
          };

          this.audioElement.addEventListener('loadedmetadata', onReadyToSeek, { once: true });
          this.audioElement.addEventListener('canplay', onReadyToSeek, { once: true });
          this.audioElement.addEventListener('playing', onPlaying, { once: true });

          this.audioElement.load();
        }
      }

      // 4. Update MediaSession API metadata
      this.updateMediaSession(info);
    } catch (err: any) {
      console.error('[AudioEngine] play error:', err.message);
      this.setTelemetry('error', {
        message: 'Station resolve failed',
        messageKo: '방송국 연결 실패'
      });
      this.scheduleReconnect();
    }
  }

  /**
   * Station or Hour Preset Change
   */
  public async tuneTo(
    stationId: string,
    targetHour: number,
    targetMinute: number = 0,
    targetSecond: number = 0,
    band: 'seoul_in_usa' | 'california_in_seoul' = 'seoul_in_usa',
    isCamMode: boolean = false
  ) {
    this.currentStationId = stationId;
    this.currentTargetHour = targetHour;
    this.currentTargetMinute = targetMinute;
    this.currentTargetSecond = targetSecond;
    this.currentBand = band;

    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    if (this.audioElement) {
      this.audioElement.pause();
    }

    if (this.isPlaying) {
      this.playTuningStatic(0.3); // Dial frequency search hiss
      await this.play(stationId, targetHour, targetMinute, targetSecond, band, isCamMode);
    } else {
      this.setTelemetry('idle', { message: 'Standby', messageKo: '대기 중' });
      // In standby, prefetch stream metadata so the chassis LCD reflects the current show/host
      this.prefetchStreamInfo(stationId, targetHour, targetMinute, targetSecond, band);
    }
  }

  /**
   * Pre-fetch Station Show Metadata in Standby Mode
   * Updates currentStreamInfo and notifies listeners without starting audio playback.
   */
  public async prefetchStreamInfo(
    stationId: string,
    targetHour: number,
    targetMinute: number = 0,
    targetSecond: number = 0,
    band: 'seoul_in_usa' | 'california_in_seoul' = 'seoul_in_usa'
  ): Promise<ResolvedStreamInfo | null> {
    try {
      const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';
      const res = await fetch(
        `/api/stream/resolve?stationId=${encodeURIComponent(stationId)}&targetHour=${targetHour}&targetMinute=${targetMinute}&targetSecond=${targetSecond}&band=${band}&timezone=${encodeURIComponent(tz)}`
      );
      if (!res.ok) return null;
      const info: ResolvedStreamInfo = await res.json();
      if (this.currentStationId === stationId) {
        this.notifyListeners(info);
      }
      return info;
    } catch (err) {
      console.warn('[AudioEngine] prefetchStreamInfo warning:', err);
      return null;
    }
  }

  public stop() {
    this.isPlaying = false;
    this.updateRfNoiseState();
    this.clearStallAndRetryTimers();
    this.currentRetryAttempt = 0;
    this.setTelemetry('idle', { message: 'Standby', messageKo: '대기 중' });
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.removeAttribute('src');
      this.audioElement.load();
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Automatic Top-of-the-Hour Transition Engine
   * Checks the broadcast clock on every second:
   * 1. At :59:57, triggers the authentic station 시보 chime
   * 2. At :00:00, smoothly tunes into the next hour's broadcast stream and advances show metadata
   */
  public checkTopOfHourTransition(
    broadcastHour: number,
    broadcastMinute: number,
    broadcastSecond: number,
    stationId: string,
    band: 'seoul_in_usa' | 'california_in_seoul' = 'seoul_in_usa',
    isCamMode: boolean = false
  ) {
    if (!this.isPlaying) return;

    // 1. At :59:57, play station-specific top-of-hour chime
    if (broadcastMinute === 59 && broadcastSecond === 57 && !this.isChimeTriggered) {
      this.isChimeTriggered = true;
      console.log(`[AudioEngine] Top-of-Hour 시보 triggered for upcoming hour ${(broadcastHour + 1) % 24}:00 on ${stationId}`);
      this.playTimeSignal((broadcastHour + 1) % 24, stationId);
    }

    // 2. At :00:00 (정각), automatically advance to the next hour's broadcast show!
    if (broadcastMinute === 0 && broadcastSecond === 0 && this.lastTransitionHour !== broadcastHour) {
      this.lastTransitionHour = broadcastHour;
      this.isChimeTriggered = false;
      console.log(`[AudioEngine] Top-of-Hour transition executing: advancing to ${broadcastHour}:00:00 on ${stationId}`);
      this.tuneTo(stationId, broadcastHour, 0, 0, band, isCamMode);
    }

    // Reset chime trigger when safely past top-of-hour
    if (broadcastMinute === 0 && broadcastSecond > 4) {
      this.isChimeTriggered = false;
    }
  }

  /**
   * Synthesizes authentic bandpass-filtered pink noise static for dial tuning
   */
  public playTuningStatic(durationSec: number = 0.25) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * durationSec);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Pink/bandpass filtered radio hiss
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.099046;
        b1 = 0.96300 * b1 + white * 0.2965164;
        b2 = 0.57000 * b2 + white * 1.0526913;
        data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.035;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1400;
      filter.Q.value = 1.8;

      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noiseSource.start();
    } catch {}
  }

  /**
   * Synthesizes the authentic Korean top-of-hour time signal (시보) directly in Web Audio:
   * - MBC: Iconic "솔 - 도 - 미" chime (392Hz -> 523Hz -> 659Hz) followed by 880Hz top chime
   * - Standard (SBS, KBS, TBS, US): 3 warning pips at 440 Hz (A4) followed by 1 long chime at 880 Hz (A5)
   */
  public playTimeSignal(hour: number = 7, targetStationId?: string) {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const stId = targetStationId || this.currentStationId;
    const isMbc = stId.includes('mbc');

    try {
      const now = this.ctx.currentTime;

      if (isMbc) {
        // MBC Signature 3-Tone Chime: 솔(G4: 392Hz) -> 도(C5: 523.25Hz) -> 미(E5: 659.25Hz) -> 정각(880Hz)
        const mbcNotes = [
          { start: 0.1, dur: 0.5, freq: 392.00 },
          { start: 0.65, dur: 0.5, freq: 523.25 },
          { start: 1.2, dur: 0.7, freq: 659.25 },
          { start: 2.1, dur: 0.8, freq: 880.00 }
        ];

        for (const note of mbcNotes) {
          const osc = this.ctx.createOscillator();
          const overtone = this.ctx.createOscillator();
          const noteGain = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(note.freq, now + note.start);

          overtone.type = 'triangle';
          overtone.frequency.setValueAtTime(note.freq * 2, now + note.start);

          // Bell exponential decay envelope
          noteGain.gain.setValueAtTime(0.0001, now + note.start);
          noteGain.gain.linearRampToValueAtTime(0.35, now + note.start + 0.015);
          noteGain.gain.exponentialRampToValueAtTime(0.001, now + note.start + note.dur);

          osc.connect(noteGain);
          overtone.connect(noteGain);
          noteGain.connect(this.masterGain);

          osc.start(now + note.start);
          overtone.start(now + note.start);
          osc.stop(now + note.start + note.dur);
          overtone.stop(now + note.start + note.dur);
        }
      } else {
        // Authentic HLA Standard: 3 preparatory pips at 440 Hz (A4) + 1 top chime at 880 Hz (A5)
        const pips = [
          { start: 0.1, dur: 0.10, freq: 440 },
          { start: 1.1, dur: 0.10, freq: 440 },
          { start: 2.1, dur: 0.10, freq: 440 },
          { start: 3.1, dur: 0.80, freq: 880 }
        ];

        for (const pip of pips) {
          const osc = this.ctx.createOscillator();
          const pipGain = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(pip.freq, now + pip.start);

          pipGain.gain.setValueAtTime(0.001, now + pip.start);
          pipGain.gain.linearRampToValueAtTime(0.35, now + pip.start + 0.015);
          pipGain.gain.linearRampToValueAtTime(0.001, now + pip.start + pip.dur);

          osc.connect(pipGain);
          pipGain.connect(this.masterGain);

          osc.start(now + pip.start);
          osc.stop(now + pip.start + pip.dur);
        }
      }
    } catch (e) {
      console.warn('Error playing client 시보 tone:', e);
    }
  }
  /**
   * Play tactile double-pip confirmation tone when saving a preset (car stereo style)
   */
  public playPresetSavedTone() {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    try {
      const now = this.ctx.currentTime;
      // Pip 1: 880 Hz (A5)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(0.25, now + 0.01);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc1.connect(gain1);
      gain1.connect(this.masterGain);
      osc1.start(now);
      osc1.stop(now + 0.08);

      // Pip 2: 1318.5 Hz (E6 - higher cheerful confirming pip)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.51, now + 0.09);
      gain2.gain.setValueAtTime(0.001, now + 0.09);
      gain2.gain.linearRampToValueAtTime(0.28, now + 0.10);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc2.connect(gain2);
      gain2.connect(this.masterGain);
      osc2.start(now + 0.09);
      osc2.stop(now + 0.22);
    } catch {}
  }

  /**
   * Play station jingle tone
   */
  public async playJingle(stationId: string) {
    this.init();
    try {
      const res = await fetch(`/api/audio/jingle/${stationId}`);
      if (res.ok && this.ctx) {
        const buf = await res.arrayBuffer();
        const audioBuffer = await this.ctx.decodeAudioData(buf);
        const source = this.ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.masterGain!);
        source.start();
      }
    } catch (e) {
      console.warn('Could not play jingle:', e);
    }
  }

  /**
   * MediaSession API for lock screens, Bluetooth AVRCP, and smartwatch notification controls
   */
  private updateMediaSession(info: ResolvedStreamInfo) {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      try {
        const albumText = info.cornerTitle
          ? `[${info.cornerTitle}] • ${info.isReplay ? `어제 방송 (${info.replayDate})` : 'TimeShift On-Air'}`
          : (info.isReplay ? `TimeShift Replay (${info.replayDate})` : 'TimeShift Pure Radio');

        navigator.mediaSession.metadata = new MediaMetadata({
          title: info.showTitleKo || info.showTitle,
          artist: `${info.stationName} • DJ ${info.djName}`,
          album: albumText,
          artwork: [
            { src: `/artwork/${info.stationId}.png`, sizes: '512x512', type: 'image/png' },
            { src: `/artwork/${info.stationId}.svg`, sizes: '512x512', type: 'image/svg+xml' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }
          ]
        });

        navigator.mediaSession.playbackState = 'playing';

        // 1. Play / Pause Handlers
        navigator.mediaSession.setActionHandler('play', () => {
          if (this.mediaSessionCallbacks.onPlay) {
            this.mediaSessionCallbacks.onPlay();
          } else {
            this.play(this.currentStationId, this.currentTargetHour, this.currentTargetMinute, this.currentTargetSecond, this.currentBand);
          }
        });

        navigator.mediaSession.setActionHandler('pause', () => {
          if (this.mediaSessionCallbacks.onPause) {
            this.mediaSessionCallbacks.onPause();
          } else {
            this.stop();
          }
        });

        // 2. Hardware / Bluetooth Station Preset Switching
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          console.log('[MediaSession] Hardware Next Track -> Next Preset');
          if (this.mediaSessionCallbacks.onNextPreset) {
            this.mediaSessionCallbacks.onNextPreset();
          }
        });

        navigator.mediaSession.setActionHandler('previoustrack', () => {
          console.log('[MediaSession] Hardware Previous Track -> Previous Preset');
          if (this.mediaSessionCallbacks.onPreviousPreset) {
            this.mediaSessionCallbacks.onPreviousPreset();
          }
        });

        // 3. Intra-episode Seeking (Lock-screen scrubber)
        try {
          navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (details.seekTime !== undefined && this.audioElement) {
              this.audioElement.currentTime = details.seekTime;
              this.updatePositionState();
            }
          });
        } catch {}

        this.updatePositionState();
      } catch (err) {
        console.warn('[AudioEngine] MediaSession update error:', err);
      }
    }
  }

  /**
   * Reports current stream position to the OS lock screen
   */
  public updatePositionState() {
    if (
      typeof window !== 'undefined' &&
      'mediaSession' in navigator &&
      'setPositionState' in navigator.mediaSession &&
      this.audioElement &&
      this.currentStreamInfo
    ) {
      try {
        const duration = this.currentStreamInfo.totalDurationSeconds || (Number.isFinite(this.audioElement.duration) ? this.audioElement.duration : 3600);
        const position = Math.min(Math.max(0, this.audioElement.currentTime || 0), duration);
        if (duration > 0 && position <= duration) {
          navigator.mediaSession.setPositionState({
            duration,
            playbackRate: this.audioElement.playbackRate || 1,
            position
          });
        }
      } catch {}
    }
  }
}

export const audioEngine = new AudioEngine();
