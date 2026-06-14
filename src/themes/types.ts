import type { FC } from "react";

/**
 * Props every theme scene receives. Scenes also read discrete player state
 * (track, isPlaying, ...) directly from the zustand store, and per-frame audio
 * from `analyser` inside their own useFrame loops — never through React state.
 */
export interface ThemeSceneProps {
  analyser: AnalyserNode;
}

/**
 * A swappable visual theme. v1 ships these compiled in via the registry; this
 * is the seam a future runtime/manifest loader conforms to so community themes
 * become "drop in a folder + register".
 */
export interface MusicTheme {
  id: string;
  name: string;
  description: string;
  /** Accent color used by the surrounding chrome (controls, switcher). */
  accent: string;
  /** The react-three-fiber scene, mounted inside the shared <Canvas>. */
  Scene: FC<ThemeSceneProps>;
}
