import { usePlayer } from "../store/usePlayer";
import { openFolderInteractive } from "../library/scan";

/**
 * First-run call-to-action. Shown centered whenever the library is empty so the
 * "open a folder" action is impossible to miss against the 3D scene.
 */
export default function Welcome() {
  const tracks = usePlayer((s) => s.tracks);
  const scanning = usePlayer((s) => s.scanning);
  const folder = usePlayer((s) => s.folder);

  if (scanning || tracks.length > 0) return null;

  const emptyFolder = folder != null; // a folder was picked but had no audio

  return (
    <div className="welcome">
      <div className="welcome-card">
        <div className="welcome-mark">◆</div>
        <h1>RetroPlayer</h1>
        <p>
          {emptyFolder
            ? "No audio files found in that folder. Try another one."
            : "Your music, inside a living 3D scene. Pick a folder to begin."}
        </p>
        <button className="welcome-btn" onClick={() => openFolderInteractive()}>
          🎵 Open music folder
        </button>
        <span className="welcome-hint">
          Plays MP3, M4A/AAC, WAV, AIFF and FLAC · Space = play/pause
        </span>
      </div>
    </div>
  );
}
