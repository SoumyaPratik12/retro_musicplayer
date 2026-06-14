// src/components/Visualizer.tsx
import { useEffect, useRef } from 'react';
import { engine } from '../audio/engine';
import { drawFrame } from '../viz/draw';
import { SKINS } from '../skins/skins';
import type { VizStyle } from '../skins/skins';
import { useStore } from '../store';

export default function Visualizer({ height = 120 }: { height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const skinId = useStore(s => s.skinId);
  const vizOverride = useStore(s => s.vizOverride);

  useEffect(() => {
    const cv = ref.current!; const ctx = cv.getContext('2d')!;
    let raf = 0, t = 0, alive = true;
    const size = () => { const r = cv.getBoundingClientRect(); cv.width = r.width * devicePixelRatio; cv.height = r.height * devicePixelRatio; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(devicePixelRatio, devicePixelRatio); };
    size(); window.addEventListener('resize', size);
    const css = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    const loop = () => {
      if (!alive) return;
      const skin = SKINS.find(s => s.id === useStore.getState().skinId) || SKINS[0];
      const style: VizStyle = (useStore.getState().vizOverride || skin.visualizer) as VizStyle;
      const w = cv.width / devicePixelRatio, h = cv.height / devicePixelRatio;
      drawFrame(ctx, w, h, style, engine.getFrame(t), css('--accent'), css('--accent2'));
      t++; raf = requestAnimationFrame(loop);
    };
    loop();
    return () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', size); };
  }, [skinId, vizOverride]);

  return <canvas ref={ref} style={{ width: '100%', height, display: 'block' }} />;
}
