# RetroPlayer

A desktop music player whose UI *is* a 3D scene — the spiritual successor to Winamp skins.
Point it at a folder of music and your tracks play inside an immersive, audio-reactive world.
Pitched as a focus/productivity tool: an ambient environment that also happens to play your music.

Built with **Tauri 2** (Rust shell) + **React 19** + **react-three-fiber** (Three.js).

## Themes

Two built-in themes, swappable live from the top-right switcher:

- **Overworld** — an open voxel biome (day/night cycle, water, trees) with a beating jukebox,
  a glowing rainbow note-block equalizer, and music notes that pop on every beat.
- **Lo-Fi Room** — a rainy-window study desk with a spinning record, a warm flickering lamp,
  drifting dust, and a desk visualizer that dances to the track.

Adding your own theme is a folder + one registry line — see [`docs/THEMES.md`](docs/THEMES.md).

## How it works

- **Audio + FFT live in the frontend.** Files are decoded with the Web Audio API
  (`decodeAudioData`) and played through an `AudioBufferSourceNode` → `AnalyserNode`. This is a
  deliberate choice: macOS WKWebView (what Tauri uses) has a long-standing bug where an `<audio>`
  element feeding an `AnalyserNode` produces *frozen* FFT data, so we avoid media elements entirely.
  Scenes read the analyser inside their render loop — zero IPC per frame.
- **Rust handles disk.** Two commands: `scan_music_folder` (recursive walk) and `read_audio_bytes`
  (raw bytes, no base64). That's it — no audio decoding in Rust (yet).

## Supported formats (v1)

Decoding uses the platform WebView's `decodeAudioData`. On macOS this reliably covers
**MP3, M4A/AAC/ALAC, WAV, AIFF, and FLAC**. **OGG Vorbis/Opus may not decode** in WKWebView —
files still appear in the library but may fail to play. This is the main thing the planned v2 Rust
audio engine (symphonia + cpal + rustfft) will fix, alongside gapless playback and streaming.

## Prerequisites

- Node + [pnpm](https://pnpm.io)
- Rust toolchain (`rustup`)
- **macOS only, one-time:** accept the Xcode command-line license so the Rust linker can run:
  ```sh
  sudo xcodebuild -license
  ```

## Develop & build

```sh
pnpm install
pnpm tauri dev      # run the app (hot-reloads the UI)
pnpm tauri build    # produce a distributable bundle
```

## Keyboard shortcuts

| Key            | Action          |
| -------------- | --------------- |
| `Space`        | Play / Pause    |
| `⌘ + →`        | Next track      |
| `⌘ + ←`        | Previous track  |

## Project layout

```
src/
  audio/        AudioEngine (Web Audio + FFT), playback controls bridge
  library/      folder scan + tag/cover-art enrichment (music-metadata)
  store/        zustand player state
  themes/       MusicTheme contract, registry, shared audio hooks, the two scenes
  components/   ThemeHost (shared <Canvas> + bloom), Library, Transport, ThemeSwitcher
src-tauri/      Rust: scan_music_folder, read_audio_bytes
```

## Roadmap

- v2 Rust audio engine for universal formats, gapless, and streaming.
- Equalizer (deferred from v1).
- Runtime/manifest theme loading so community themes drop in without recompiling
  (the `MusicTheme` interface is already the seam for this).
