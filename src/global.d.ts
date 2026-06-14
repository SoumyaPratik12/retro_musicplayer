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
      pickFolder: () => Promise<{ dir: string | null; files: string[] }>;
      expandPaths: (paths: string[]) => Promise<string[]>;
      watchFolders: (folders: string[]) => Promise<boolean>;
      onFolderChanged: (cb: (dir: string) => void) => void;
      readMeta: (filePath: string) => Promise<TrackMeta>;
      loadState: () => Promise<any | null>;
      saveState: (state: any) => Promise<boolean>;
      mediaUrl: (filePath: string) => string;
    };
  }
}
export {};
