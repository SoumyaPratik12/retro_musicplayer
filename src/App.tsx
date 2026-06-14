import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./App.css";
import ThemeHost from "./components/ThemeHost";
import Library from "./components/Library";
import ThemeSwitcher from "./components/ThemeSwitcher";
import Welcome from "./components/Welcome";
import { usePlayer } from "./store/usePlayer";
import { initPlaybackBridge, togglePlay, next, prev } from "./audio/controls";
import { loadFolderIntoStore } from "./library/scan";
import { persist } from "./lib/persist";

function App() {
  // One-time startup: restore persisted theme/volume/folder + wire the engine.
  useEffect(() => {
    const savedTheme = persist.getTheme();
    if (savedTheme) usePlayer.getState().setTheme(savedTheme);

    const teardown = initPlaybackBridge();

    const savedFolder = persist.getFolder();
    if (savedFolder) void loadFolderIntoStore(savedFolder);

    return teardown;
  }, []);

  // Keyboard shortcuts (ignored while typing in inputs).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        void togglePlay();
      } else if (e.code === "ArrowRight" && e.metaKey) {
        void next();
      } else if (e.code === "ArrowLeft" && e.metaKey) {
        void prev();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app">
      <ThemeHost />

      {/* Always visible when empty so first-run users can open a folder. */}
      <Welcome />

      {/* Minimal hover-revealed chrome. Playback lives in the 3D scene. */}
      <div className="chrome">
        <div className="top-right">
          <ThemeSwitcher />
          <button className="win-btn" title="Minimize" onClick={() => getCurrentWindow().minimize()}>
            –
          </button>
          <button className="win-btn close" title="Close" onClick={() => getCurrentWindow().close()}>
            ×
          </button>
        </div>

        <Library />
      </div>
    </div>
  );
}

export default App;
