/** Tiny typed localStorage wrapper for the few things we persist across launches. */

const KEYS = {
  folder: "rp.folder",
  theme: "rp.theme",
  volume: "rp.volume",
} as const;

export const persist = {
  getFolder(): string | null {
    return localStorage.getItem(KEYS.folder);
  },
  setFolder(path: string | null) {
    if (path) localStorage.setItem(KEYS.folder, path);
    else localStorage.removeItem(KEYS.folder);
  },

  getTheme(): string | null {
    return localStorage.getItem(KEYS.theme);
  },
  setTheme(id: string) {
    localStorage.setItem(KEYS.theme, id);
  },

  getVolume(): number | null {
    const v = localStorage.getItem(KEYS.volume);
    return v == null ? null : Number(v);
  },
  setVolume(v: number) {
    localStorage.setItem(KEYS.volume, String(v));
  },
};
