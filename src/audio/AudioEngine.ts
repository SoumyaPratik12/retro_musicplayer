/**
 * AudioEngine — WKWebView-safe playback + FFT.
 *
 * macOS WKWebView has a long-standing bug where an <audio> element routed
 * through a MediaElementAudioSourceNode produces frozen AnalyserNode data
 * (and local files in <audio> can throw NotSupportedError). So we never use a
 * media element: we decode the whole track with decodeAudioData and play it
 * through an AudioBufferSourceNode, which feeds the AnalyserNode correctly.
 *
 * Graph:  AudioBufferSourceNode -> GainNode -> AnalyserNode -> destination
 *
 * Transport (play/pause/seek/position) is bookkept manually because a
 * BufferSourceNode can only be started once — every resume/seek creates a new
 * source node from the cached AudioBuffer.
 */
export class AudioEngine {
  readonly ctx: AudioContext;
  readonly analyser: AnalyserNode;
  private readonly gain: GainNode;

  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;

  /** ctx.currentTime at the moment the current source was started. */
  private startedAt = 0;
  /** Position (seconds) within the buffer where the current source started. */
  private offset = 0;
  private _playing = false;

  /** Fired when a track reaches its natural end (not on pause/seek/stop). */
  onended: (() => void) | null = null;

  constructor() {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new Ctx();

    this.gain = this.ctx.createGain();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.82;

    this.gain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  get duration(): number {
    return this.buffer?.duration ?? 0;
  }

  get playing(): boolean {
    return this._playing;
  }

  /** Current playback position in seconds. */
  get position(): number {
    if (!this.buffer) return 0;
    if (this._playing) {
      return Math.min(this.offset + (this.ctx.currentTime - this.startedAt), this.buffer.duration);
    }
    return this.offset;
  }

  /** Decode raw bytes into the active buffer. Stops any current playback. */
  async loadBytes(bytes: ArrayBuffer): Promise<void> {
    this.stopSource();
    this._playing = false;
    this.offset = 0;
    // decodeAudioData detaches the ArrayBuffer; that's fine, we own this copy.
    this.buffer = await this.ctx.decodeAudioData(bytes);
  }

  async play(): Promise<void> {
    if (!this.buffer || this._playing) return;
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
    // Restart from the very start if we'd reached the end.
    if (this.offset >= this.buffer.duration) this.offset = 0;
    this.startSource(this.offset);
  }

  pause(): void {
    if (!this._playing) return;
    this.offset = this.position;
    this.stopSource();
    this._playing = false;
  }

  /** Seek to `t` seconds; preserves play/pause state. */
  seek(t: number): void {
    if (!this.buffer) return;
    const wasPlaying = this._playing;
    this.stopSource();
    this._playing = false;
    this.offset = Math.max(0, Math.min(t, this.buffer.duration));
    if (wasPlaying) this.startSource(this.offset);
  }

  setVolume(v: number): void {
    this.gain.gain.value = Math.max(0, Math.min(1, v));
  }

  private startSource(at: number): void {
    if (!this.buffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer;
    src.connect(this.gain);
    src.onended = () => {
      // Only a *natural* end leaves this source installed and playing.
      // Manual stops null out this.source first, so they don't fire onended.
      if (src === this.source && this._playing) {
        this._playing = false;
        this.offset = this.buffer?.duration ?? 0;
        this.source = null;
        this.onended?.();
      }
    };
    this.source = src;
    this.startedAt = this.ctx.currentTime;
    this.offset = at;
    this._playing = true;
    src.start(0, at);
  }

  private stopSource(): void {
    if (!this.source) return;
    const s = this.source;
    this.source = null; // detach first so onended treats this as a manual stop
    try {
      s.stop();
    } catch {
      /* already stopped */
    }
    s.disconnect();
  }
}

/** Process-wide singleton. Constructed suspended until the first user gesture. */
export const engine = new AudioEngine();
