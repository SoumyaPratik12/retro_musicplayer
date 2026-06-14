// src/App.tsx — full UI: library sidebar + now-playing + controls + settings
import { useEffect, useState } from 'react';
import { useStore, boot } from './store';
import { SKINS } from './skins/skins';
import type { VizStyle } from './skins/skins';
import Visualizer from './components/Visualizer';

const fmt = (ms: number) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const VIZ: (VizStyle | '')[] = ['', 'soft', 'bars', 'scope', 'holo', 'needle', 'meter', 'circular', 'reflect', 'ocean', 'infinibar'];

// monochrome line icons (Lucide-style) so the UI reads clean instead of multicolor emoji
function Icon({ name, size = 22, filled = false }: { name: string; size?: number; filled?: boolean }) {
  const body: Record<string, JSX.Element> = {
    shuffle: <><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22" /><path d="m18 2 4 4-4 4" /><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" /><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" /><path d="m18 14 4 4-4 4" /></>,
    prev: <><polygon points="19 20 9 12 19 4 19 20" /><line x1="5" x2="5" y1="19" y2="5" /></>,
    next: <><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" x2="19" y1="5" y2="19" /></>,
    play: <polygon points="6 3 20 12 6 21 6 3" />,
    pause: <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>,
    repeat: <><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></>,
    'repeat-one': <><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /><path d="M11 10h1v4" /></>,
    heart: <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />,
    volume: <><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></>,
    share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" x2="15.42" y1="13.51" y2="17.49" /><line x1="15.41" x2="8.59" y1="6.51" y2="10.49" /></>,
    bluetooth: <path d="m7 7 10 10-5 5V2l5 5L7 17" />,
    list: <><line x1="3" x2="21" y1="6" y2="6" /><line x1="3" x2="15" y1="12" y2="12" /><line x1="3" x2="18" y1="18" y2="18" /></>
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {body[name]}
    </svg>
  );
}

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
          <div className="topbar">
            <span className="logo">RETROWAVE</span>
            <span className="dots"><b /><b /><b className="active" /></span>
          </div>
          <div className="art-wrap">
            <div className="art">{cur?.picture ? <img src={cur.picture} alt="" /> : <span className="glyph">◐</span>}</div>
          </div>
          <div className="np-title">{cur?.title || 'No track'}</div>
          <div className="np-artist">{cur?.artist || '—'}</div>

          <div className="viz-box"><Visualizer height={120} /></div>

          <div className="prog">
            <span className="led">{fmt(s.positionMs)}</span>
            <input type="range" min={0} max={s.durationMs || 0} value={s.positionMs}
              onChange={e => s.seek(Number(e.target.value))} className="seek"
              style={{ ['--fill' as any]: (s.durationMs ? (s.positionMs / s.durationMs) * 100 : 0) + '%' }} />
            <span className="led">{fmt(s.durationMs)}</span>
          </div>

          <div className="controls">
            <button className={'ctl' + (s.shuffle ? ' on' : '')} onClick={s.toggleShuffle} title="Shuffle"><Icon name="shuffle" /></button>
            <button className="ctl" onClick={s.prev} title="Previous"><Icon name="prev" /></button>
            <button className="play3d" onClick={s.toggle} title="Play/Pause"><Icon name={s.isPlaying ? 'pause' : 'play'} size={24} filled /></button>
            <button className="ctl" onClick={s.next} title="Next"><Icon name="next" /></button>
            <button className={'ctl' + (s.repeat !== 'off' ? ' on' : '')} onClick={s.cycleRepeat} title={`Repeat: ${s.repeat}`}>
              <Icon name={s.repeat === 'one' ? 'repeat-one' : 'repeat'} />
            </button>
          </div>

          <div className="volrow">
            <span className="vico"><Icon name="volume" size={18} /></span>
            <input type="range" min={0} max={1} step={0.01} value={s.volume}
              onChange={e => s.setVolume(Number(e.target.value))} className="seek"
              style={{ ['--fill' as any]: (s.volume * 100) + '%' }} />
            <span className="vnum">{Math.round(s.volume * 100)}</span>
          </div>

          <div className="actions">
            <button className={'like' + (liked ? ' liked' : '')} onClick={s.toggleLike} title="Like"><Icon name="heart" size={20} filled={liked} /></button>
            <button className="act" title="Share — coming soon" disabled><Icon name="share" size={18} /></button>
            <button className="act" title="Bluetooth — coming soon" disabled><Icon name="bluetooth" size={18} /></button>
            <button className="act menu" onClick={() => setSettings(v => !v)} title="Settings"><Icon name="list" size={20} /></button>
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
          <label className="field">Playback speed
            <select value={s.rate} onChange={e => s.setRate(Number(e.target.value))}>
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map(r => <option key={r} value={r}>{r}×</option>)}
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
