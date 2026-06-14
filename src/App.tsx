// src/App.tsx — full UI: library sidebar + now-playing + controls + settings
import { useEffect, useState } from 'react';
import { useStore, boot } from './store';
import { SKINS } from './skins/skins';
import type { VizStyle } from './skins/skins';
import Visualizer from './components/Visualizer';

const fmt = (ms: number) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const VIZ: (VizStyle | '')[] = ['', 'soft', 'bars', 'scope', 'holo', 'needle', 'meter', 'circular', 'reflect', 'ocean', 'infinibar'];

export default function App() {
  const s = useStore();
  const [settings, setSettings] = useState(false);
  useEffect(() => { boot(); }, []);

  useEffect(() => { // keyboard shortcuts
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); s.toggle(); }
      if (e.code === 'ArrowRight') s.next();
      if (e.code === 'ArrowLeft') s.prev();
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [s]);

  // drag-and-drop import: drop files or folders anywhere on the window
  const [dragOver, setDragOver] = useState(false);
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const paths = Array.from(e.dataTransfer.files).map(f => (f as any).path as string).filter(Boolean);
    if (!paths.length) return;
    const audio = await window.api.expandPaths(paths);
    if (audio.length) s.importPaths(audio);
  };

  const cur = s.current >= 0 ? s.tracks[s.queue[s.current]] : null;
  const liked = cur ? !!s.liked[cur.path] : false;

  return (
    <div className={'app' + (dragOver ? ' dragover' : '')}
      onDragOver={e => { e.preventDefault(); if (!dragOver) setDragOver(true); }}
      onDragLeave={e => { if (e.currentTarget === e.target) setDragOver(false); }}
      onDrop={onDrop}>
      {/* sidebar / library */}
      <aside className="sidebar">
        <div className="brand">RETRO<span>WAVE</span></div>
        <div className="lib-actions">
          <button onClick={() => s.importFiles()}>+ Add files</button>
          <button onClick={() => s.importFolder()}>+ Add folder</button>
        </div>
        <div className="lib-label">Library · {s.tracks.length}</div>
        <div className="tracklist">
          {s.queue.map((ti, qi) => {
            const t = s.tracks[ti];
            return (
              <div key={t.path} className={'trow' + (qi === s.current ? ' on' : '')} onDoubleClick={() => s.playAt(qi)} onClick={() => s.playAt(qi)}>
                <div className="tart">{t.picture ? <img src={t.picture} alt="" /> : <span>♪</span>}</div>
                <div className="tinfo"><div className="tt">{t.title}</div><div className="ta">{t.artist}</div></div>
                <div className="td">{fmt(t.durationMs)}</div>
              </div>
            );
          })}
          {!s.tracks.length && <div className="empty">Add music to begin.<br />Use the buttons above, or drag &amp; drop files / folders here.</div>}
        </div>
        <button className="settings-btn" onClick={() => setSettings(v => !v)}>⚙ Settings</button>
      </aside>

      {/* now playing */}
      <main className="stage">
        <div className={'player' + (s.scanlines ? ' scan' : '')}>
          {SKINS.find(x => x.id === s.skinId)?.effects.sheen && <div className="sheen" />}
          <div className="art-wrap">
            <div className="art">{cur?.picture ? <img src={cur.picture} alt="" /> : <span className="glyph">◐</span>}</div>
          </div>
          <div className="np-title">{cur?.title || 'No track'}</div>
          <div className="np-artist">{cur?.artist || '—'}</div>

          <div className="viz-box"><Visualizer height={120} /></div>

          <div className="prog">
            <span className="led">{fmt(s.positionMs)}</span>
            <input type="range" min={0} max={s.durationMs || 0} value={s.positionMs}
              onChange={e => s.seek(Number(e.target.value))} className="seek" />
            <span className="led">{fmt(s.durationMs)}</span>
          </div>

          <div className="controls">
            <button className={'t3d sm' + (s.shuffle ? ' on' : '')} onClick={s.toggleShuffle} title="Shuffle">⇄</button>
            <button className="t3d" onClick={s.prev} title="Previous">⏮</button>
            <button className="play3d" onClick={s.toggle} title="Play/Pause">{s.isPlaying ? '❚❚' : '▶'}</button>
            <button className="t3d" onClick={s.next} title="Next">⏭</button>
            <button className={'t3d sm' + (s.repeat !== 'off' ? ' on' : '')} onClick={s.cycleRepeat} title={`Repeat: ${s.repeat}`}>
              {s.repeat === 'one' ? '🔂' : '🔁'}
            </button>
          </div>

          <div className="row2">
            <button className={'like' + (liked ? ' liked' : '')} onClick={s.toggleLike} title="Like">{liked ? '♥' : '♡'}</button>
            <div className="vol">
              <span className="vico">🔊</span>
              <input type="range" min={0} max={1} step={0.01} value={s.volume}
                onChange={e => s.setVolume(Number(e.target.value))} className="seek" />
            </div>
            <div className="rate">
              <select value={s.rate} onChange={e => s.setRate(Number(e.target.value))}>
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map(r => <option key={r} value={r}>{r}×</option>)}
              </select>
            </div>
          </div>
        </div>
      </main>

      {/* settings drawer */}
      {settings && (
        <div className="drawer">
          <div className="drawer-head">Settings<button onClick={() => setSettings(false)}>✕</button></div>
          <label className="field">Skin
            <select value={s.skinId} onChange={e => s.setSkin(e.target.value)}>
              {SKINS.map(sk => <option key={sk.id} value={sk.id}>{sk.name}</option>)}
            </select>
          </label>
          <label className="field">Visualizer
            <select value={s.vizOverride} onChange={e => s.setViz(e.target.value as VizStyle | '')}>
              {VIZ.map(v => <option key={v} value={v}>{v === '' ? 'Skin default' : v}</option>)}
            </select>
          </label>
          <label className="field row">
            <input type="checkbox" checked={s.scanlines} onChange={e => s.setScanlines(e.target.checked)} /> CRT scanlines
          </label>
          <p className="hint">Skins &amp; preferences are saved locally and restored on next launch.</p>
        </div>
      )}
    </div>
  );
}
