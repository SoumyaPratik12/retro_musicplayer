// src/store.ts — single source of truth (Zustand)
import { create } from 'zustand';
import { engine } from './audio/engine';
import { source } from './audio/source';
import { SKINS, applySkin } from './skins/skins';
import type { VizStyle } from './skins/skins';
import type { TrackMeta } from './global';

type Repeat = 'off' | 'one' | 'all';
interface State {
  tracks: TrackMeta[];
  queue: number[];          // indices into tracks
  current: number;          // index into queue, -1 = none
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  volume: number;           // 0..1
  rate: number;
  shuffle: boolean;
  repeat: Repeat;
  liked: Record<string, boolean>;
  skinId: string;
  vizOverride: VizStyle | '';   // '' = use skin default
  scanlines: boolean;

  importFiles: () => Promise<void>;
  importFolder: () => Promise<void>;
  importPaths: (paths: string[]) => Promise<void>;
  playAt: (queuePos: number) => Promise<void>;
  toggle: () => Promise<void>;
  next: () => Promise<void>;
  prev: () => Promise<void>;
  seek: (ms: number) => void;
  setVolume: (v: number) => void;
  setRate: (r: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleLike: () => void;
  setSkin: (id: string) => void;
  setViz: (v: VizStyle | '') => void;
  setScanlines: (b: boolean) => void;
  persist: () => void;
}

function buildQueue(n: number, shuffle: boolean): number[] {
  const q = Array.from({ length: n }, (_, i) => i);
  if (shuffle) for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; }
  return q;
}

export const useStore = create<State>((set, get) => ({
  tracks: [], queue: [], current: -1,
  isPlaying: false, positionMs: 0, durationMs: 0,
  volume: 0.7, rate: 1, shuffle: false, repeat: 'off',
  liked: {}, skinId: 'neo-retro-premium', vizOverride: '', scanlines: true,

  importFiles: async () => {
    const paths = await window.api.pickFiles();
    await addPaths(paths, set, get);
  },
  importFolder: async () => {
    const paths = await window.api.pickFolder();
    await addPaths(paths, set, get);
  },
  importPaths: async (paths) => { await addPaths(paths, set, get); },

  playAt: async (queuePos) => {
    const { queue, tracks } = get();
    if (queuePos < 0 || queuePos >= queue.length) return;
    const track = tracks[queue[queuePos]];
    await source.loadTrack(track);
    await source.play();
    set({ current: queuePos, isPlaying: true, durationMs: track.durationMs });
  },

  toggle: async () => {
    const { current, isPlaying, queue } = get();
    if (current < 0 && queue.length) { await get().playAt(0); return; }
    if (isPlaying) { source.pause(); set({ isPlaying: false }); }
    else { await source.play(); set({ isPlaying: true }); }
  },

  next: async () => {
    const { current, queue, repeat } = get();
    if (!queue.length) return;
    if (repeat === 'one') { await get().playAt(current); return; }
    let n = current + 1;
    if (n >= queue.length) { if (repeat === 'all') n = 0; else { source.pause(); set({ isPlaying: false }); return; } }
    await get().playAt(n);
  },
  prev: async () => {
    const { current, positionMs, queue } = get();
    if (!queue.length) return;
    if (positionMs > 3000) { get().seek(0); return; }
    await get().playAt(current <= 0 ? queue.length - 1 : current - 1);
  },

  seek: (ms) => { source.seek(ms); set({ positionMs: ms }); },
  setVolume: (v) => { source.setVolume(v); set({ volume: v }); get().persist(); },
  setRate: (r) => { source.setRate(r); set({ rate: r }); },
  toggleShuffle: () => {
    const { shuffle, tracks } = get(); const ns = !shuffle;
    set({ shuffle: ns, queue: buildQueue(tracks.length, ns), current: tracks.length ? 0 : -1 });
    get().persist();
  },
  cycleRepeat: () => { const o = get().repeat; set({ repeat: o === 'off' ? 'all' : o === 'all' ? 'one' : 'off' }); get().persist(); },
  toggleLike: () => {
    const { tracks, queue, current, liked } = get(); if (current < 0) return;
    const p = tracks[queue[current]].path; set({ liked: { ...liked, [p]: !liked[p] } }); get().persist();
  },

  setSkin: (id) => { const s = SKINS.find(x => x.id === id) || SKINS[0]; applySkin(s); set({ skinId: id }); get().persist(); },
  setViz: (v) => { set({ vizOverride: v }); get().persist(); },
  setScanlines: (b) => { set({ scanlines: b }); get().persist(); },

  persist: () => {
    const { tracks, volume, shuffle, repeat, liked, skinId, vizOverride, scanlines } = get();
    window.api.saveState({ tracks, volume, shuffle, repeat, liked, skinId, vizOverride, scanlines });
  }
}));

async function addPaths(paths: string[], set: any, get: any) {
  if (!paths.length) return;
  const existing = new Set(get().tracks.map((t: TrackMeta) => t.path));
  const fresh = paths.filter(p => !existing.has(p));
  const metas: TrackMeta[] = [];
  for (const p of fresh) metas.push(await window.api.readMeta(p));
  const tracks = [...get().tracks, ...metas];
  const wasEmpty = get().queue.length === 0;
  set({ tracks, queue: buildQueue(tracks.length, get().shuffle) });
  get().persist();
  if (wasEmpty && tracks.length) await get().playAt(0);
}

// engine -> store wiring
engine.onTime = (pos, dur) => useStore.setState({ positionMs: pos, durationMs: dur || useStore.getState().durationMs });
engine.onEnded = () => useStore.getState().next();

// rehydrate persisted state on boot
export async function boot() {
  const saved = await window.api.loadState();
  const s = useStore.getState();
  if (saved) {
    useStore.setState({
      tracks: saved.tracks || [], queue: buildQueue((saved.tracks || []).length, !!saved.shuffle),
      volume: saved.volume ?? 0.7, shuffle: !!saved.shuffle, repeat: saved.repeat || 'off',
      liked: saved.liked || {}, skinId: saved.skinId || 'neo-retro-premium',
      vizOverride: saved.vizOverride || '', scanlines: saved.scanlines ?? true
    });
  }
  engine.setVolume(useStore.getState().volume);
  applySkin(SKINS.find(x => x.id === useStore.getState().skinId) || SKINS[0]);
}
