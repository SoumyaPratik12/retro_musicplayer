import type { MusicTheme } from "./types";
import MinecraftScene from "./minecraft/MinecraftScene";
import LofiScene from "./lofi/LofiScene";

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
];

export const THEME_BY_ID: Record<string, MusicTheme> = Object.fromEntries(
  THEMES.map((t) => [t.id, t]),
);

export function getTheme(id: string): MusicTheme {
  return THEME_BY_ID[id] ?? THEMES[0];
}
