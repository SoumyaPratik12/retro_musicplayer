import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { parseBlob } from "music-metadata";
import { usePlayer, type Track } from "../store/usePlayer";
import { persist } from "../lib/persist";

interface RawTrack {
  path: string;
  file_name: string;
}

/** Open the native folder picker. Returns the chosen path or null. */
export async function pickFolder(): Promise<string | null> {
  const res = await open({ directory: true, multiple: false, title: "Choose your music folder" });
  return typeof res === "string" ? res : null;
}

/** Prompt for a folder, persist it, and load it. Shared by the welcome card + library. */
export async function openFolderInteractive(): Promise<void> {
  const path = await pickFolder();
  if (!path) return;
  persist.setFolder(path);
  await loadFolderIntoStore(path);
}

/** Recursively scan a folder (in Rust) for audio files. */
export async function scanFolder(path: string): Promise<Track[]> {
  const raw = await invoke<RawTrack[]>("scan_music_folder", { path });
  return raw.map((r) => ({ path: r.path, fileName: r.file_name }));
}

/** Scan a folder and load its tracks into the store, then enrich in background. */
export async function loadFolderIntoStore(path: string): Promise<void> {
  const store = usePlayer.getState();
  store.setScanning(true);
  store.setFolder(path);
  try {
    const found = await scanFolder(path);
    store.setTracks(found);
    store.setCurrentIndex(-1);
    void enrichAll();
  } catch (err) {
    console.error("Failed to scan folder", path, err);
    usePlayer.getState().setTracks([]);
  } finally {
    usePlayer.getState().setScanning(false);
  }
}

/** Read a track's raw bytes from disk via the Rust command. */
export async function readBytes(path: string): Promise<ArrayBuffer> {
  return invoke<ArrayBuffer>("read_audio_bytes", { path });
}

/** Strip extension + tidy a filename for use as a fallback title. */
export function prettyName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}

/**
 * Enrich a single track with tag metadata + embedded cover art, writing the
 * result back into the store. Safe to call repeatedly (no-op if enriched).
 */
export async function enrichTrack(index: number): Promise<void> {
  const { tracks } = usePlayer.getState();
  const track = tracks[index];
  if (!track || track.enriched) return;

  try {
    const bytes = await readBytes(track.path);
    const meta = await parseBlob(new Blob([bytes]));
    const pic = meta.common.picture?.[0];
    let artUrl: string | undefined;
    if (pic) {
      const data = pic.data instanceof Uint8Array ? pic.data : new Uint8Array(pic.data);
      artUrl = URL.createObjectURL(new Blob([data as BlobPart], { type: pic.format || "image/jpeg" }));
    }
    usePlayer.getState().patchTrack(index, {
      title: meta.common.title || prettyName(track.fileName),
      artist: meta.common.artist,
      album: meta.common.album,
      artUrl,
      enriched: true,
    });
  } catch {
    // Tag parse failed (unsupported container, etc.) — fall back to filename.
    usePlayer.getState().patchTrack(index, {
      title: prettyName(track.fileName),
      enriched: true,
    });
  }
}

/**
 * Lazily enrich the whole library in the background with bounded concurrency,
 * so a large folder doesn't fire thousands of simultaneous file reads.
 */
export async function enrichAll(concurrency = 4): Promise<void> {
  const total = usePlayer.getState().tracks.length;
  let cursor = 0;
  const worker = async () => {
    while (cursor < total) {
      const i = cursor++;
      // Bail out if the library changed under us (new folder picked).
      if (usePlayer.getState().tracks.length !== total) return;
      await enrichTrack(i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, worker));
}
