import { create } from "zustand";

export interface Track {
  path: string;
  fileName: string;
  title?: string;
  artist?: string;
  album?: string;
  /** Object URL for embedded cover art, if any. */
  artUrl?: string;
  /** True once metadata enrichment has run for this track. */
  enriched?: boolean;
}

export type RepeatMode = "off" | "all" | "one";

interface PlayerState {
  folder: string | null;
  tracks: Track[];
  currentIndex: number;
  isPlaying: boolean;
  /** Current playback position (seconds), polled while playing. */
  position: number;
  duration: number;
  volume: number;
  themeId: string;
  scanning: boolean;
  repeat: RepeatMode;

  setFolder: (folder: string | null) => void;
  setTracks: (tracks: Track[]) => void;
  patchTrack: (index: number, patch: Partial<Track>) => void;
  setCurrentIndex: (i: number) => void;
  setPlaying: (p: boolean) => void;
  setPosition: (s: number) => void;
  setDuration: (s: number) => void;
  setVolume: (v: number) => void;
  setTheme: (id: string) => void;
  setScanning: (s: boolean) => void;
  cycleRepeat: () => void;
}

export const usePlayer = create<PlayerState>((set) => ({
  folder: null,
  tracks: [],
  currentIndex: -1,
  isPlaying: false,
  position: 0,
  duration: 0,
  volume: 0.8,
  themeId: "minecraft",
  scanning: false,
  repeat: "all",

  setFolder: (folder) => set({ folder }),
  setTracks: (tracks) => set({ tracks }),
  patchTrack: (index, patch) =>
    set((s) => {
      if (index < 0 || index >= s.tracks.length) return s;
      const tracks = s.tracks.slice();
      tracks[index] = { ...tracks[index], ...patch };
      return { tracks };
    }),
  setCurrentIndex: (currentIndex) => set({ currentIndex }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setPosition: (position) => set({ position }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  setTheme: (themeId) => set({ themeId }),
  setScanning: (scanning) => set({ scanning }),
  cycleRepeat: () =>
    set((s) => ({ repeat: s.repeat === "off" ? "all" : s.repeat === "all" ? "one" : "off" })),
}));

/** Convenience selector for the currently selected track (or null). */
export function currentTrack(): Track | null {
  const { tracks, currentIndex } = usePlayer.getState();
  return currentIndex >= 0 ? tracks[currentIndex] ?? null : null;
}
