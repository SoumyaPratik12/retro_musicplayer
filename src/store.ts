// src/store.ts — single source of truth (Zustand). Identity is by track path.
import { create } from 'zustand';
import { engine, EQ_BANDS } from './audio/engine';
import { source } from './audio/source';
import { SKINS, applySkin } from './skins/skins';
import type { VizStyle } from './skins/skins';
import type { TrackMeta } from './global';

type Repeat = 'off' | 'one' | 'all';
export type SortKey = 'added' | 'title' | 'artist' | 'album' | 'duration';
export interface Playlist { id: string; name: string; paths: string[]; }

interface State {
  tracks: TrackMeta[];
  queue: string[];               // playback order, by path
  currentPath: string | null;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  volume: number;                // 0..1
  shuffle: boolean;
  repeat: Repeat;
  liked: Record<string, boolean>;
  skinId: string;
  vizOverride: VizStyle | '';
  scanlines: boolean;
  // library management
  search: string;
  sortBy: SortKey;
  playlists: Playlist[];
  activePlaylist: string | null; // null = all tracks
  view: string[];                // derived visible list, by path
  watchedFolders: string[];
  eq: number[];                  // dB per EQ_BANDS

  importFiles: () => Promise<void>;
  importFolder: () => Promise<void>;
  importPaths: (paths: string[]) => Promise<void>;
  rescan: () => Promise<void>;
  removeTrack: (path: string) => void;
  playAt: (viewPos: number) => Promise<void>;
  toggle: () => Promise<void>;
  next: () => Promise<void>;
  prev: () => Promise<void>;
  seek: (ms: number) => void;
  setVolume: (v: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleLike: () => void;
  setSkin: (id: string) => void;
  setViz: (v: VizStyle | '') => void;
  setScanlines: (b: boolean) => void;
  setSearch: (q: string) => void;
  setSort: (k: SortKey) => void;
  createPlaylist: (name?: string) => string;
  deletePlaylist: (id: string) => void;
  setActivePlaylist: (id: string | null) => void;
  addToPlaylist: (id: string, path: string) => void;
  removeFromPlaylist: (id: string, path: string) => void;
  setEQ: (i: number, db: number) => void;
  resetEQ: () => void;
  persist: () => void;
}

function shuffleArr<T>(a: T[]): T[] {
  const q = [...a];
  for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; }
  return q;
}

function computeView(s: State): string[] {
  const byPath = new Map(s.tracks.map(t => [t.path, t]));
  let list: string[];
  if (s.activePlaylist) {
    const pl = s.playlists.find(p => p.id === s.activePlaylist);
    list = (pl?.paths || []).filter(p => byPath.has(p)); // playlist order, drop missing
  } else {
    list = s.tracks.map(t => t.path);                    // library add order
  }
  const q = s.search.trim().toLowerCase();
  if (q) list = list.filter(p => { const t = byPath.get(p)!; return (t.title + ' ' + t.artist + ' ' + t.album).toLowerCase().includes(q); });
  if (s.sortBy !== 'added') {
    const k = s.sortBy;
    list = [...list].sort((a, b) => {
      const ta = byPath.get(a)!, tb = byPath.get(b)!;
      if (k === 'duration') return ta.durationMs - tb.durationMs;
      return String(ta[k] || '').localeCompare(String(tb[k] || ''));
    });
  }
  return list;
}

function recomputeView() { useStore.setState(st => ({ view: computeView(st) })); }

async function playPath(path: string) {
  const { tracks, view, shuffle } = useStore.getState();
  const t = tracks.find(x => x.path === path);
  if (!t) return;
  let q = shuffle ? shuffleArr(view) : [...view];
  if (shuffle) q = [path, ...q.filter(p => p !== path)];
  if (!q.includes(path)) q = [path, ...q]; // keep current playable even if filtered out of view
  await source.loadTrack(t);
  await source.play();
  useStore.setState({ queue: q, currentPath: path, isPlaying: true, durationMs: t.durationMs });
}

async function addPaths(paths: string[]) {
  if (!paths.length) return;
  const existing = new Set(useStore.getState().tracks.map(t => t.path));
  const fresh = paths.filter(p => !existing.has(p));
  if (!fresh.length) { recomputeView(); return; }
  const metas: TrackMeta[] = [];
  for (const p of fresh) metas.push(await window.api.readMeta(p));
  const wasEmpty = useStore.getState().tracks.length === 0;
  useStore.setState(st => ({ tracks: [...st.tracks, ...metas] }));
  recomputeView();
  useStore.getState().persist();
  if (wasEmpty && useStore.getState().view.length) await useStore.getState().playAt(0);
}

export const useStore = create<State>((set, get) => ({
  tracks: [], queue: [], currentPath: null,
  isPlaying: false, positionMs: 0, durationMs: 0,
  volume: 0.7, shuffle: false, repeat: 'off',
  liked: {}, skinId: 'neo-retro-premium', vizOverride: '', scanlines: true,
  search: '', sortBy: 'added', playlists: [], activePlaylist: null, view: [],
  watchedFolders: [], eq: EQ_BANDS.map(() => 0),

  importFiles: async () => { await addPaths(await window.api.pickFiles()); },
  importFolder: async () => {
    const { dir, files } = await window.api.pickFolder();
    await addPaths(files);
    if (dir) {
      const wf = Array.from(new Set([...get().watchedFolders, dir]));
      set({ watchedFolders: wf });
      window.api.watchFolders(wf);
      get().persist();
    }
  },
  importPaths: async (paths) => { await addPaths(paths); },

  rescan: async () => {
    const { watchedFolders, tracks } = get();
    if (!watchedFolders.length) return;
    const onDisk = await window.api.expandPaths(watchedFolders);
    const have = new Set(tracks.map(t => t.path));
    const fresh = onDisk.filter(p => !have.has(p));
    const metas: TrackMeta[] = [];
    for (const p of fresh) metas.push(await window.api.readMeta(p));
    const diskSet = new Set(onDisk);
    const underWatched = (p: string) => watchedFolders.some(f => p.startsWith(f));
    const kept = [...tracks, ...metas].filter(t => !underWatched(t.path) || diskSet.has(t.path));
    const allPaths = new Set(kept.map(t => t.path));
    set({
      tracks: kept,
      playlists: get().playlists.map(pl => ({ ...pl, paths: pl.paths.filter(p => allPaths.has(p)) })),
      queue: get().queue.filter(p => allPaths.has(p))
    });
    if (get().currentPath && !allPaths.has(get().currentPath!)) { source.pause(); set({ isPlaying: false, currentPath: null, positionMs: 0, durationMs: 0 }); }
    recomputeView();
    get().persist();
  },

  removeTrack: (path) => {
    const liked = { ...get().liked }; delete liked[path];
    set({
      tracks: get().tracks.filter(t => t.path !== path),
      playlists: get().playlists.map(pl => ({ ...pl, paths: pl.paths.filter(p => p !== path) })),
      queue: get().queue.filter(p => p !== path),
      liked
    });
    if (get().currentPath === path) { source.pause(); set({ isPlaying: false, currentPath: null, positionMs: 0, durationMs: 0 }); }
    recomputeView();
    get().persist();
  },

  playAt: async (viewPos) => {
    const { view } = get();
    if (viewPos < 0 || viewPos >= view.length) return;
    await playPath(view[viewPos]);
  },

  toggle: async () => {
    const { currentPath, isPlaying, view } = get();
    if (!currentPath) { if (view.length) await playPath(view[0]); return; }
    if (isPlaying) { source.pause(); set({ isPlaying: false }); }
    else { await source.play(); set({ isPlaying: true }); }
  },

  next: async () => {
    const { queue, currentPath, repeat } = get();
    if (!queue.length) return;
    if (repeat === 'one' && currentPath) { await playPath(currentPath); return; }
    const i = currentPath ? queue.indexOf(currentPath) : -1;
    let n = i + 1;
    if (n >= queue.length) { if (repeat === 'all') n = 0; else { source.pause(); set({ isPlaying: false }); return; } }
    await playPath(queue[n]);
  },
  prev: async () => {
    const { queue, currentPath, positionMs } = get();
    if (!queue.length) return;
    if (positionMs > 3000) { get().seek(0); return; }
    const i = currentPath ? queue.indexOf(currentPath) : 0;
    await playPath(queue[i <= 0 ? queue.length - 1 : i - 1]);
  },

  seek: (ms) => { source.seek(ms); set({ positionMs: ms }); },
  setVolume: (v) => { source.setVolume(v); set({ volume: v }); get().persist(); },
  toggleShuffle: () => {
    const { shuffle, view, currentPath } = get(); const ns = !shuffle;
    let q = ns ? shuffleArr(view) : [...view];
    if (ns && currentPath && q.includes(currentPath)) q = [currentPath, ...q.filter(p => p !== currentPath)];
    set({ shuffle: ns, queue: q }); get().persist();
  },
  cycleRepeat: () => { const o = get().repeat; set({ repeat: o === 'off' ? 'all' : o === 'all' ? 'one' : 'off' }); get().persist(); },
  toggleLike: () => { const { currentPath, liked } = get(); if (!currentPath) return; set({ liked: { ...liked, [currentPath]: !liked[currentPath] } }); get().persist(); },

  setSkin: (id) => { const sk = SKINS.find(x => x.id === id) || SKINS[0]; applySkin(sk); set({ skinId: id }); get().persist(); },
  setViz: (v) => { set({ vizOverride: v }); get().persist(); },
  setScanlines: (b) => { set({ scanlines: b }); get().persist(); },

  setSearch: (q) => { set({ search: q }); recomputeView(); },
  setSort: (k) => { set({ sortBy: k }); recomputeView(); get().persist(); },

  createPlaylist: (name) => {
    const id = 'pl_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const nm = name || `Playlist ${get().playlists.length + 1}`;
    set({ playlists: [...get().playlists, { id, name: nm, paths: [] }] });
    get().persist();
    return id;
  },
  deletePlaylist: (id) => {
    set({ playlists: get().playlists.filter(p => p.id !== id) });
    if (get().activePlaylist === id) set({ activePlaylist: null });
    recomputeView();
    get().persist();
  },
  setActivePlaylist: (id) => { set({ activePlaylist: id }); recomputeView(); },
  addToPlaylist: (id, path) => {
    set({ playlists: get().playlists.map(pl => pl.id === id && !pl.paths.includes(path) ? { ...pl, paths: [...pl.paths, path] } : pl) });
    recomputeView();
    get().persist();
  },
  removeFromPlaylist: (id, path) => {
    set({ playlists: get().playlists.map(pl => pl.id === id ? { ...pl, paths: pl.paths.filter(p => p !== path) } : pl) });
    recomputeView();
    get().persist();
  },

  setEQ: (i, db) => { engine.setEQ(i, db); const eq = [...get().eq]; eq[i] = db; set({ eq }); get().persist(); },
  resetEQ: () => { const eq = EQ_BANDS.map(() => 0); engine.loadEQ(eq); set({ eq }); get().persist(); },

  persist: () => {
    const { tracks, volume, shuffle, repeat, liked, skinId, vizOverride, scanlines, playlists, watchedFolders, eq, sortBy } = get();
    window.api.saveState({ tracks, volume, shuffle, repeat, liked, skinId, vizOverride, scanlines, playlists, watchedFolders, eq, sortBy });
  }
}));

// engine -> store wiring
engine.onTime = (pos, dur) => useStore.setState({ positionMs: pos, durationMs: dur || useStore.getState().durationMs });
engine.onEnded = () => useStore.getState().next();

// rehydrate persisted state on boot
export async function boot() {
  const saved = await window.api.loadState();
  if (saved) {
    useStore.setState({
      tracks: saved.tracks || [],
      volume: saved.volume ?? 0.7, shuffle: !!saved.shuffle, repeat: saved.repeat || 'off',
      liked: saved.liked || {}, skinId: saved.skinId || 'neo-retro-premium',
      vizOverride: saved.vizOverride || '', scanlines: saved.scanlines ?? true,
      playlists: saved.playlists || [], watchedFolders: saved.watchedFolders || [],
      eq: (saved.eq && saved.eq.length === EQ_BANDS.length) ? saved.eq : EQ_BANDS.map(() => 0),
      sortBy: saved.sortBy || 'added'
    });
  }
  recomputeView();
  engine.setVolume(useStore.getState().volume);
  engine.loadEQ(useStore.getState().eq);
  applySkin(SKINS.find(x => x.id === useStore.getState().skinId) || SKINS[0]);

  // folder watching: re-arm watchers, do an initial reconcile, and react to live changes
  const wf = useStore.getState().watchedFolders;
  if (wf.length) { window.api.watchFolders(wf); useStore.getState().rescan(); }
  window.api.onFolderChanged(() => useStore.getState().rescan());
}
