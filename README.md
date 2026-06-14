# RetroWave Player — Desktop MVP

A retro-futuristic **local-file** music player (Electron + React + TypeScript), built so a
streaming layer can drop in later without touching the UI. Windows-first.

## Run it

```bash
npm install      # install dependencies
npm run dev      # launches Vite + an Electron window (live)
```

Then click **+ Add files** or **+ Add folder** in the sidebar and press play.

## Build a Windows installer

```bash
npm run dist     # outputs release/RetroWave-Player-Setup-0.1.0.exe
```

## Keyboard shortcuts
- **Space** — play / pause
- **→ / ←** — next / previous

## What works
- Real local-file playback (mp3, m4a/aac, flac, wav, ogg, opus) via HTML5 audio + Web Audio.
- **Real** FFT/waveform visualizers (10 styles) driven by the `AnalyserNode` — they react to
  the actual audio, not fake data.
- 7 token-driven skins; switch skin, visualizer, and CRT scanlines in **Settings**.
- Seek, volume, next/prev, shuffle, repeat (off/all/one), playback speed, like.
- Album art + tags read from files; library and preferences persist locally and restore on launch.

## Architecture (why it's "streaming-ready")
```
UI (React)  ──▶  store.ts (Zustand, single source of truth)
                     │ calls
                     ▼
              audio/source.ts  ── AudioSource interface
                     │
            LocalAudioSource (now)  │  Spotify/YTM adapters (later)
                     │
              audio/engine.ts  ── <audio> ▶ AnalyserNode ▶ gain ▶ output
```
`AudioSource` is the swappable seam. Today it's `LocalAudioSource`; after the streaming
feasibility spikes (Widevine playback + loopback capture), a `SpotifyAudioSource` implements
the **same** interface and the UI/store above never change.

## Project layout
```
electron/main.js       Electron main: window, media:// protocol, file dialogs, metadata, persistence
electron/preload.js    safe IPC bridge (window.api)
src/audio/engine.ts    Web Audio graph + real FFT/waveform frames
src/audio/source.ts    AudioSource interface + LocalAudioSource (the streaming seam)
src/skins/skins.ts     the 7 skins as tokens + applySkin()
src/viz/draw.ts        all 10 visualizer renderers (real analyser data)
src/store.ts           Zustand store: playback, queue, library, prefs
src/components/Visualizer.tsx
src/App.tsx            full UI (library, player, controls, settings)
```

## Notes / limits
- Not a signed installer — `npm run dist` produces an unsigned `.exe` (Windows SmartScreen may warn).
- Drag-and-drop import isn't wired yet; use the Add buttons (easy follow-up).
- This is the local MVP; streaming requires the castLabs Electron + Widevine work described in the v2.0 build plan.
```
