// src/audio/engine.ts — Web Audio graph: <audio> -> analyser -> gain -> output
import type { Frame } from '../viz/draw';

class Engine {
  private audio = new Audio();
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gain: GainNode | null = null;
  private freq = new Uint8Array(0);
  private time = new Uint8Array(0);
  onEnded: (() => void) | null = null;
  onTime: ((posMs: number, durMs: number) => void) | null = null;

  constructor() {
    this.audio.crossOrigin = 'anonymous';
    this.audio.addEventListener('ended', () => this.onEnded?.());
    this.audio.addEventListener('timeupdate', () =>
      this.onTime?.(this.audio.currentTime * 1000, (this.audio.duration || 0) * 1000));
  }

  private ensureGraph() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    const src = this.ctx.createMediaElementSource(this.audio);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.8;
    this.gain = this.ctx.createGain();
    src.connect(this.analyser);
    this.analyser.connect(this.gain);
    this.gain.connect(this.ctx.destination);
    this.freq = new Uint8Array(this.analyser.frequencyBinCount);
    this.time = new Uint8Array(this.analyser.frequencyBinCount);
  }

  load(url: string) { this.audio.src = url; this.audio.load(); }

  async play() {
    this.ensureGraph();
    if (this.ctx?.state === 'suspended') await this.ctx.resume(); // resume on user gesture
    await this.audio.play();
  }
  pause() { this.audio.pause(); }
  seek(ms: number) { this.audio.currentTime = ms / 1000; }
  setVolume(v: number) { if (this.gain) this.gain.gain.value = v; else this.audio.volume = v; }
  setRate(r: number) { this.audio.playbackRate = r; }
  get paused() { return this.audio.paused; }

  getFrame(t: number, bins = 48): Frame {
    if (!this.analyser) return { fft: new Array(bins).fill(0), wave: new Array(bins).fill(0), energy: 0, t };
    this.analyser.getByteFrequencyData(this.freq);
    this.analyser.getByteTimeDomainData(this.time);
    const fft: number[] = [], wave: number[] = [];
    const step = Math.floor(this.freq.length / bins) || 1;
    let energy = 0;
    for (let i = 0; i < bins; i++) {
      let s = 0; for (let j = 0; j < step; j++) s += this.freq[i * step + j] || 0;
      const v = (s / step) / 255; fft.push(v); energy += v;
      wave.push(((this.time[i * step] || 128) - 128) / 128);
    }
    return { fft, wave, energy: energy / bins, t };
  }
}

export const engine = new Engine();
