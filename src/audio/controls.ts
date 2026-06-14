import { engine } from "./AudioEngine";
import { usePlayer } from "../store/usePlayer";
import { enrichTrack, readBytes } from "../library/scan";
import { persist } from "../lib/persist";

/** Token to guard against out-of-order loads when the user skips quickly. */
let loadToken = 0;

/** Load track at `index` and start playing it. */
export async function playIndex(index: number): Promise<void> {
  const { tracks } = usePlayer.getState();
  if (index < 0 || index >= tracks.length) return;

  const token = ++loadToken;
  usePlayer.getState().setCurrentIndex(index);
  usePlayer.getState().setPlaying(false);
  usePlayer.getState().setPosition(0);

  // Make sure title/artist/art are available for the now-playing display.
  void enrichTrack(index);

  try {
    const bytes = await readBytes(tracks[index].path);
    if (token !== loadToken) return; // superseded by a newer load
    await engine.loadBytes(bytes);
    if (token !== loadToken) return;
    usePlayer.getState().setDuration(engine.duration);
    await engine.play();
    if (token !== loadToken) return;
    usePlayer.getState().setPlaying(true);
  } catch (err) {
    console.error("Failed to play track", tracks[index]?.path, err);
    usePlayer.getState().setPlaying(false);
  }
}

export async function togglePlay(): Promise<void> {
  const { currentIndex, isPlaying, tracks } = usePlayer.getState();
  if (currentIndex < 0) {
    if (tracks.length) await playIndex(0);
    return;
  }
  if (isPlaying) {
    engine.pause();
    usePlayer.getState().setPlaying(false);
  } else {
    await engine.play();
    usePlayer.getState().setPlaying(engine.playing);
  }
}

export async function next(auto = false): Promise<void> {
  const { currentIndex, tracks, repeat } = usePlayer.getState();
  if (!tracks.length) return;

  if (auto && repeat === "one") {
    await playIndex(currentIndex);
    return;
  }
  const atEnd = currentIndex >= tracks.length - 1;
  if (atEnd && auto && repeat === "off") {
    // Reached the end of the queue with no repeat — stop.
    engine.pause();
    usePlayer.getState().setPlaying(false);
    return;
  }
  const nextIndex = atEnd ? 0 : currentIndex + 1;
  await playIndex(nextIndex);
}

export async function prev(): Promise<void> {
  const { currentIndex, tracks } = usePlayer.getState();
  if (!tracks.length) return;
  // Restart current track if we're more than 3s in; otherwise go back.
  if (engine.position > 3) {
    engine.seek(0);
    usePlayer.getState().setPosition(0);
    return;
  }
  const prevIndex = currentIndex <= 0 ? tracks.length - 1 : currentIndex - 1;
  await playIndex(prevIndex);
}

export function seek(t: number): void {
  engine.seek(t);
  usePlayer.getState().setPosition(t);
  usePlayer.getState().setPlaying(engine.playing);
}

export function setVolume(v: number): void {
  engine.setVolume(v);
  usePlayer.getState().setVolume(v);
  persist.setVolume(v);
}

/** Wire engine -> store side effects. Call once at app startup. */
export function initPlaybackBridge(): () => void {
  engine.onended = () => {
    void next(true);
  };

  // Apply persisted volume.
  const v = persist.getVolume();
  const initial = v == null ? usePlayer.getState().volume : v;
  engine.setVolume(initial);
  usePlayer.getState().setVolume(initial);

  // Poll playback position into the store (cheap, ~4x/sec) for the scrubber.
  const id = window.setInterval(() => {
    if (engine.playing) usePlayer.getState().setPosition(engine.position);
  }, 250);

  return () => window.clearInterval(id);
}
