/** Audio-analysis utilities shared by all themes. */

export interface Bands {
  /** Low frequencies (kick/bass), normalized 0..1. */
  bass: number;
  /** Mid frequencies (vocals/instruments), 0..1. */
  mid: number;
  /** High frequencies (cymbals/air), 0..1. */
  treble: number;
  /** Overall loudness, 0..1. */
  level: number;
}

/**
 * Read the analyser into `out` and reduce it to four normalized bands.
 * `out` must be `analyser.frequencyBinCount` long; reuse it across frames to
 * avoid per-frame allocation.
 */
export function sampleBands(analyser: AnalyserNode, out: Uint8Array): Bands {
  analyser.getByteFrequencyData(out as Uint8Array<ArrayBuffer>);
  const n = out.length;

  const avg = (from: number, to: number) => {
    const a = Math.max(0, from | 0);
    const b = Math.min(n, to | 0);
    if (b <= a) return 0;
    let sum = 0;
    for (let i = a; i < b; i++) sum += out[i];
    return sum / (b - a) / 255;
  };

  return {
    bass: avg(0, n * 0.08),
    mid: avg(n * 0.08, n * 0.35),
    treble: avg(n * 0.35, n),
    level: avg(0, n * 0.7),
  };
}

/**
 * Lightweight beat detector driven by bass energy. Flags a beat when current
 * bass exceeds a moving average by a margin, with a refractory cooldown.
 */
export class BeatDetector {
  private avg = 0;
  private lastBeat = -Infinity;

  constructor(
    private readonly sensitivity = 1.35,
    private readonly cooldownMs = 180,
    private readonly decay = 0.92,
  ) {}

  /** Returns true on the frame a beat is detected. `now` in milliseconds. */
  update(bass: number, now: number): boolean {
    this.avg = this.avg * this.decay + bass * (1 - this.decay);
    const isBeat =
      bass > this.avg * this.sensitivity &&
      bass > 0.18 &&
      now - this.lastBeat > this.cooldownMs;
    if (isBeat) this.lastBeat = now;
    return isBeat;
  }
}

/** Frame-rate-independent exponential smoothing toward a target. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}
