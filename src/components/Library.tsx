import { useState } from "react";
import { usePlayer } from "../store/usePlayer";
import { openFolderInteractive, prettyName } from "../library/scan";
import { playIndex, setVolume } from "../audio/controls";

export default function Library() {
  const tracks = usePlayer((s) => s.tracks);
  const currentIndex = usePlayer((s) => s.currentIndex);
  const folder = usePlayer((s) => s.folder);
  const scanning = usePlayer((s) => s.scanning);
  const volume = usePlayer((s) => s.volume);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button className="lib-fab" title="Playlist & settings" onClick={() => setOpen(true)}>
        ≡
      </button>
    );
  }

  const folderName = folder ? folder.split("/").pop() || folder : null;

  return (
    <aside className="library">
      <div className="library-head">
        <span className="lib-label">PLAYLIST</span>
        <div className="lib-head-actions">
          <button className="btn" onClick={() => openFolderInteractive()}>
            {folder ? "Change" : "Open folder"}
          </button>
          <button className="lib-toggle" title="Hide" onClick={() => setOpen(false)}>
            ×
          </button>
        </div>
      </div>

      <div className="lib-volume">
        <span className="vol-icon">{volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
        />
      </div>

      {folderName && (
        <div className="folder-name" title={folder ?? undefined}>
          📁 {folderName} · {tracks.length}
        </div>
      )}
      {scanning && <div className="scanning">Scanning…</div>}

      <ul className="tracklist">
        {tracks.map((t, i) => (
          <li
            key={t.path}
            className={`track ${i === currentIndex ? "active" : ""}`}
            onClick={() => playIndex(i)}
            title={t.path}
          >
            <span className="track-index">{i === currentIndex ? "▸" : i + 1}</span>
            <span className="track-meta">
              <span className="track-title">{t.title || prettyName(t.fileName)}</span>
              {t.artist && <span className="track-artist">{t.artist}</span>}
            </span>
          </li>
        ))}
        {!tracks.length && !scanning && (
          <li className="empty">No tracks — open a folder to begin.</li>
        )}
      </ul>
    </aside>
  );
}
