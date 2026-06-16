import type { MusicTheme } from "./types";
import MinecraftScene from "./minecraft/MinecraftScene";
import LofiScene from "./lofi/LofiScene";
import CyberpunkScene from "./cyberpunk/CyberpunkScene";
import VaporwaveScene from "./vaporwave/VaporwaveScene";

/**
 * Built-in themes. To add a theme: create a folder with a Scene component and
 * append an entry here. This array is the single registration point a future
 * runtime/manifest loader would extend.
 */
export const THEMES: MusicTheme[] = [
  {
    id: "minecraft",
    name: "Overworld",
    description: "An open voxel biome — day/night, water, a beating jukebox.",
    accent: "#5fae45",
    Scene: MinecraftScene,
  },
  {
    id: "lofi",
    name: "Lo-Fi Room",
    description: "A rainy-window study desk with a spinning record and warm lamp.",
    accent: "#c98bff",
    Scene: LofiScene,
  },
  {
    id: "cyberpunk",
    name: "Neon City",
    description: "A dark neon skyline whose towers pulse to the music.",
    accent: "#00f2ff",
    Scene: CyberpunkScene,
  },
  {
    id: "vaporwave",
    name: "Vaporwave",
    description: "A striped retro sun, an endless neon grid, and a pulsing orb.",
    accent: "#ff6ac1",
    Scene: VaporwaveScene,
  },
];

export const THEME_BY_ID: Record<string, MusicTheme> = Object.fromEntries(
  THEMES.map((t) => [t.id, t]),
);

export function getTheme(id: string): MusicTheme {
  return THEME_BY_ID[id] ?? THEMES[0];
}
