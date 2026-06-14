# Writing a theme

A theme is a react-three-fiber scene that lives inside the app's shared `<Canvas>`. In v1 themes
are compiled in and registered in one array; this document describes that contract, which is also
the seam a future runtime/manifest loader will conform to.

## The contract

Every theme implements [`MusicTheme`](../src/themes/types.ts):

```ts
interface MusicTheme {
  id: string;          // stable, used for persistence + the registry key
  name: string;        // shown in the theme switcher
  description: string;
  accent: string;      // accent color for the switcher chip
  Scene: React.FC<ThemeSceneProps>;
}

interface ThemeSceneProps {
  analyser: AnalyserNode; // read per-frame for audio reactivity
}
```

Your `Scene` is mounted **inside** the canvas, so it returns three.js elements (meshes, lights,
groups) — not DOM. The host already provides the `<Canvas>`, a global **bloom** pass (emissive
materials glow), and a default camera you can drive.

## Reading audio (the important part)

Never push per-frame audio through React state. Instead, read the analyser inside `useFrame`:

```tsx
import { useFrame } from "@react-three/fiber";
import { sampleBands } from "../shared/analysis";

function Reactive({ analyser }: { analyser: AnalyserNode }) {
  const freq = useMemo(() => new Uint8Array(analyser.frequencyBinCount), [analyser]);
  useFrame((_, dt) => {
    const { bass, mid, treble, level } = sampleBands(analyser, freq);
    // drive scale / emissive / rotation here
  });
  return /* meshes */;
}
```

Helpers in [`src/themes/shared/analysis.ts`](../src/themes/shared/analysis.ts):

- `sampleBands(analyser, out)` → normalized `{ bass, mid, treble, level }` (0..1).
- `BeatDetector` → flags beats from bass energy (used for the Minecraft note particles).
- `damp(current, target, lambda, dt)` → frame-rate-independent smoothing, so reactions ease
  instead of snapping.

Read discrete player state (is it playing? which track?) directly from the store:

```ts
import { usePlayer } from "../store/usePlayer";
const playing = usePlayer.getState().isPlaying; // inside useFrame, no re-render
```

## Performance tips

- Use `InstancedMesh` for anything repeated (terrain blocks, equalizer bars, particles, rain) and
  mutate matrices in `useFrame` — see `minecraft/MinecraftScene.tsx` and `lofi/LofiScene.tsx`.
- Emit `emissive` + `toneMapped={false}` on things you want the bloom pass to make glow.
- Reuse a single `THREE.Object3D` "dummy" and `THREE.Color` for matrix/color writes.

## Registering

Add your scene to the array in [`src/themes/registry.ts`](../src/themes/registry.ts):

```ts
import MyScene from "./mytheme/MyScene";

export const THEMES: MusicTheme[] = [
  /* ...existing... */
  { id: "mytheme", name: "My Theme", description: "…", accent: "#ff7ad9", Scene: MyScene },
];
```

That's it — the theme appears in the switcher, and the host handles mounting, bloom, and feeding it
the live analyser. Switching themes remounts the scene with a clean slate while audio keeps playing
(the AudioEngine lives outside React).
