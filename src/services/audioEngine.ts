/**
 * Web Audio Engine for TimeShift Radio
 * Manages gapless segment streaming, offline buffer playback, AnalyserNode for visualizers,
 * and authentic analog radio tuning artifacts.
 */

import { offlineStorage } from './offlineCache';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private currentVolume: number = 0.85;

  // Segment sequencing
  private currentStationId: string = 'mbc-919';
  private currentKstHour: number = 7;
  private segmentSeq: number = 0;
  private nextScheduleTime: number = 0;
  private isSimulatedOffline: boolean = false;
  private loopTimeoutId: any = null;

  // Active sources
  private activeSource: AudioBufferSourceNode | null = null;

  public init() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.currentVolume;

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.8;

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setSimulatedOffline(val: boolean) {
    this.isSimulatedOffline = val;
  }

  public setVolume(val: number) {
    this.currentVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.currentVolume, this.ctx?.currentTime || 0);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.currentVolume,
        this.ctx?.currentTime || 0
      );
    }
    return this.isMuted;
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

  /**
   * Start time-shifted stream playback at specified station and KST hour
   */
  public async play(stationId: string, kstHour: number) {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.currentStationId = stationId;
    this.currentKstHour = kstHour;
    this.isPlaying = true;
    this.nextScheduleTime = (this.ctx?.currentTime || 0) + 0.1;

    this.playTuningStatic(0.15); // gentle analog radio static burst
    this.scheduleNextSegmentLoop();
  }

  /**
   * Change station or target hour with FM static burst
   */
  public async tuneTo(stationId: string, kstHour: number) {
    this.currentStationId = stationId;
    this.currentKstHour = kstHour;
    this.segmentSeq = 0;

    if (this.isPlaying) {
      this.stopActiveSources();
      this.playTuningStatic(0.35); // realistic analog dial click and white noise
      this.nextScheduleTime = (this.ctx?.currentTime || 0) + 0.25;
      this.scheduleNextSegmentLoop();
    }
  }

  public stop() {
    this.isPlaying = false;
    if (this.loopTimeoutId) {
      clearTimeout(this.loopTimeoutId);
      this.loopTimeoutId = null;
    }
    this.stopActiveSources();
  }

  private stopActiveSources() {
    if (this.activeSource) {
      try {
        this.activeSource.stop();
        this.activeSource.disconnect();
      } catch {}
      this.activeSource = null;
    }
  }

  /**
   * Main gapless audio segment loop
   */
  private async scheduleNextSegmentLoop() {
    if (!this.isPlaying || !this.ctx) return;

    try {
      const seq = this.segmentSeq++;
      const key = `seg_${this.currentStationId}_${this.currentKstHour}_${seq % 100}`;

      let arrayBuffer: ArrayBuffer | null = null;

      // 1. Try offline cache first
      arrayBuffer = await offlineStorage.getSegment(key);

      // 2. If not cached and network allowed, fetch from server
      if (!arrayBuffer && !this.isSimulatedOffline && navigator.onLine) {
        try {
          const res = await fetch(`/api/audio/segment/${this.currentStationId}/${this.currentKstHour}/${seq % 100}`);
          if (res.ok) {
            arrayBuffer = await res.arrayBuffer();
            // Automatically cache in background for offline resilience!
            offlineStorage.saveSegment(key, arrayBuffer, {
              stationId: this.currentStationId,
              hour: this.currentKstHour,
              seq
            });
          }
        } catch (fetchErr) {
          console.warn('Network segment fetch failed:', fetchErr);
        }
      }

      if (arrayBuffer && this.ctx) {
        const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer.slice(0));
        const source = this.ctx.createBufferSource();
        source.buffer = audioBuffer;

        const gainNode = this.ctx.createGain();
        source.connect(gainNode);
        gainNode.connect(this.masterGain!);

        const now = this.ctx.currentTime;
        const startTime = Math.max(now, this.nextScheduleTime);
        source.start(startTime);

        this.activeSource = source;
        const duration = audioBuffer.duration;
        this.nextScheduleTime = startTime + duration - 0.05; // 50ms micro-crossfade

        // Schedule next segment ahead of time
        const delayUntilNextFetch = Math.max(200, (duration - 1.5) * 1000);
        this.loopTimeoutId = setTimeout(() => {
          this.scheduleNextSegmentLoop();
        }, delayUntilNextFetch);
        return;
      } else {
        // If neither network nor cache had segment, synthesize smooth fallback ambient tone
        this.playFallbackTone();
        this.loopTimeoutId = setTimeout(() => {
          this.scheduleNextSegmentLoop();
        }, 3000);
      }
    } catch (err) {
      console.warn('Error in segment loop:', err);
      this.loopTimeoutId = setTimeout(() => {
        this.scheduleNextSegmentLoop();
      }, 2000);
    }
  }

  /**
   * Plays analog radio frequency dial noise
   */
  public playTuningStatic(durationSec: number = 0.25) {
    if (!this.ctx || !this.masterGain) return;
    try {
      const bufferSize = this.ctx.sampleRate * durationSec;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Pink/bandpass filtered radio hiss
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.0990460;
        b1 = 0.96300 * b1 + white * 0.2965164;
        b2 = 0.57000 * b2 + white * 1.0526913;
        data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.04;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1400;
      filter.Q.value = 2.0;

      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noiseSource.start();
    } catch {}
  }

  /**
   * Play the Korean Top-of-Hour Time Signal (시보)
   */
  public async playTimeSignal(hour: number) {
    this.init();
    try {
      const res = await fetch(`/api/audio/timecheck/${hour}`);
      if (res.ok && this.ctx) {
        const buf = await res.arrayBuffer();
        const audioBuffer = await this.ctx.decodeAudioData(buf);
        const source = this.ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.masterGain!);
        source.start();
      }
    } catch (e) {
      console.warn('Could not play time signal:', e);
    }
  }

  /**
   * Play Station Jingle
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

  private playFallbackTone() {
    if (!this.ctx || !this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(261.63, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.5);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 1.5);
    } catch {}
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const audioEngine = new AudioEngine();
