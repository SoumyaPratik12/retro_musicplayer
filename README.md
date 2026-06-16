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
  deliberate choice: macOS WKWebView has a long-standing bug where an `<audio>`
  element feeding an `AnalyserNode` produces *frozen* FFT data, so we avoid media elements entirely.
  (On Windows, Tauri uses WebView2/Chromium, which has no such bug — the buffer-source path works
  there too, so the same code runs everywhere.) Scenes read the analyser inside their render loop —
  zero IPC per frame.
- **Rust handles disk.** Two commands: `scan_music_folder` (recursive walk) and `read_audio_bytes`
  (raw bytes, no base64). That's it — no audio decoding in Rust (yet).

## Supported formats (v1)

Decoding uses the platform WebView's `decodeAudioData`, so support depends on the OS:

- **Windows (WebView2 / Chromium):** **MP3, M4A/AAC, WAV, FLAC, and OGG Vorbis/Opus** all decode.
- **macOS (WKWebView):** **MP3, M4A/AAC/ALAC, WAV, AIFF, and FLAC** decode reliably;
  **OGG Vorbis/Opus may not** — files still appear in the library but may fail to play.

The planned v2 Rust audio engine (symphonia + cpal + rustfft) will make format support
identical across platforms, alongside gapless playback and streaming.

## Prerequisites

- Node + [pnpm](https://pnpm.io)
- Rust toolchain (`rustup`)

Plus the platform-specific Tauri prerequisites:

- **Windows:** the [WebView2 runtime](https://developer.microsoft.com/microsoft-edge/webview2/)
  (preinstalled on Windows 11 and current Windows 10) and the **Microsoft C++ Build Tools**
  (MSVC) — install the *"Desktop development with C++"* workload from the Visual Studio Build
  Tools so the Rust MSVC linker can run.
- **macOS, one-time:** accept the Xcode command-line license so the Rust linker can run:
  ```sh
  sudo xcodebuild -license
  ```

See the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/) for the full,
up-to-date list.

## Develop & build

```sh
pnpm install
pnpm tauri dev      # run the app (hot-reloads the UI)
pnpm tauri build    # produce a distributable bundle
```

## Keyboard shortcuts

The modifier is **Ctrl** on Windows/Linux and **⌘** on macOS.

| Key                       | Action          |
| ------------------------- | --------------- |
| `Space`                   | Play / Pause    |
| `Ctrl + →`  (`⌘ + →`)     | Next track      |
| `Ctrl + ←`  (`⌘ + ←`)     | Previous track  |

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
