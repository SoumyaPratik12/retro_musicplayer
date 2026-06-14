// src/audio/source.ts — the swappable seam: local now, streaming later.
// Streaming adapters (Spotify/YTM) will implement this SAME interface after the
// feasibility spikes pass, so the UI/store above never changes.
import { engine } from './engine';
import type { TrackMeta } from '../global';

export interface AudioSource {
  readonly id: string;
  loadTrack(track: TrackMeta): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  seek(ms: number): void;
  setVolume(v: number): void;
  setRate(r: number): void;
  capabilities(): { seek: boolean; volume: boolean; rate: boolean };
}

export class LocalAudioSource implements AudioSource {
  readonly id = 'local';
  async loadTrack(track: TrackMeta) { engine.load(window.api.mediaUrl(track.path)); }
  async play() { await engine.play(); }
  pause() { engine.pause(); }
  seek(ms: number) { engine.seek(ms); }
  setVolume(v: number) { engine.setVolume(v); }
  setRate(r: number) { engine.setRate(r); }
  capabilities() { return { seek: true, volume: true, rate: true }; }
}

// Future: class SpotifyAudioSource implements AudioSource { ... }  (post-Spike A)
export const source: AudioSource = new LocalAudioSource();
