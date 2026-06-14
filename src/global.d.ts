// src/global.d.ts
export interface TrackMeta {
  path: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  picture: string | null;
}

declare global {
  interface Window {
    api: {
      pickFiles: () => Promise<string[]>;
      pickFolder: () => Promise<string[]>;
      expandPaths: (paths: string[]) => Promise<string[]>;
      readMeta: (filePath: string) => Promise<TrackMeta>;
      loadState: () => Promise<any | null>;
      saveState: (state: any) => Promise<boolean>;
      mediaUrl: (filePath: string) => string;
    };
  }
}
export {};
