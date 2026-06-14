// src/viz/draw.ts — visualizer renderers driven by REAL analyser data
import type { VizStyle } from '../skins/skins';

export interface Frame { fft: number[]; wave: number[]; energy: number; t: number; }

const needleState = { l: 0, r: 0 };

export function drawFrame(ctx: CanvasRenderingContext2D, w: number, h: number, style: VizStyle, f: Frame, ac: string, a2: string) {
  ctx.clearRect(0, 0, w, h);
  const small = h < 30;
  if (style === 'needle' && small) style = 'meter';
  if (small && (style === 'circular' || style === 'reflect')) style = 'bars';
  if (small && style === 'ocean') style = 'soft';
  const fft = f.fft, wave = f.wave, N = fft.length || 48;

  if (style === 'bars' || style === 'holo' || style === 'infinibar') {
    const holo = style === 'holo', infin = style === 'infinibar';
    const M = infin ? Math.max(20, Math.floor(w / 3)) : N;
    const bw = w / M;
    for (let i = 0; i < M; i++) {
      const v = (fft[i % N] || 0);
      if (holo) {
        const len = v * (h / 2 - 2), hue = (190 + i * 5 + f.t * 2) % 360;
        ctx.fillStyle = `hsl(${hue} 92% 62%)`; ctx.shadowBlur = small ? 3 : 8; ctx.shadowColor = ctx.fillStyle;
        ctx.fillRect(i * bw + 1, h / 2 - len, Math.max(1, bw - 2), len);
        ctx.fillRect(i * bw + 1, h / 2, Math.max(1, bw - 2), len);
      } else if (infin) {
        const len = v * (h - 2);
        ctx.fillStyle = ac; ctx.globalAlpha = .85; ctx.shadowBlur = small ? 0 : 4; ctx.shadowColor = ac;
        ctx.fillRect(i * bw + 0.5, (h - len) / 2, Math.max(1, bw - 1), len); ctx.globalAlpha = 1;
      } else {
        const len = v * (h - 3);
        ctx.fillStyle = i % 2 ? a2 : ac; ctx.globalAlpha = .85;
        ctx.fillRect(i * bw + 1, h - len, Math.max(1, bw - 2), len); ctx.globalAlpha = 1;
      }
    }
    ctx.shadowBlur = 0;
  } else if (style === 'scope') {
    ctx.lineWidth = small ? 1.2 : 2; ctx.strokeStyle = ac; ctx.shadowBlur = small ? 4 : 8; ctx.shadowColor = ac; ctx.beginPath();
    for (let x = 0; x < w; x++) { const i = Math.floor(x / w * wave.length); const y = h / 2 + (wave[i] || 0) * (h / 2 - 3); x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke(); ctx.shadowBlur = 0;
  } else if (style === 'soft') {
    ctx.lineWidth = small ? 1.2 : 2; ctx.strokeStyle = ac; ctx.globalAlpha = .9; ctx.beginPath();
    for (let x = 0; x < w; x++) { const i = Math.floor(x / w * wave.length); const y = h / 2 + (wave[i] || 0) * (h / 2 - 4) * .8; x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke(); ctx.globalAlpha = 1;
    if (!small) { ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke(); }
  } else if (style === 'meter') {
    const S = 20, g = 2, sw = (w - (S - 1) * g) / S, lit = Math.round(f.energy * S);
    for (let i = 0; i < S; i++) { const on = i < lit; ctx.fillStyle = on ? (i > S * .85 ? '#dfeeff' : ac) : 'rgba(120,140,170,.14)'; ctx.shadowBlur = on ? 5 : 0; ctx.shadowColor = ac; ctx.fillRect(i * (sw + g), 2, sw, h - 4); }
    ctx.shadowBlur = 0;
  } else if (style === 'circular') {
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * .24, M = Math.min(72, Math.max(36, Math.floor(w / 5)));
    for (let i = 0; i < M; i++) { const ang = i / M * Math.PI * 2; const len = (fft[i % N] || 0) * (Math.min(w, h) * .26);
      const x1 = cx + Math.cos(ang) * R, y1 = cy + Math.sin(ang) * R, x2 = cx + Math.cos(ang) * (R + len), y2 = cy + Math.sin(ang) * (R + len);
      ctx.strokeStyle = i % 2 ? a2 : ac; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.shadowBlur = 6; ctx.shadowColor = ac;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
    ctx.shadowBlur = 0; ctx.strokeStyle = ac; ctx.globalAlpha = .28; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R - 3, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
  } else if (style === 'reflect') {
    const M = N, bw = w / M, base = h * .62;
    for (let i = 0; i < M; i++) { const len = (fft[i] || 0) * (base - 2);
      ctx.fillStyle = ac; ctx.globalAlpha = .92; ctx.fillRect(i * bw + 1, base - len, Math.max(1, bw - 2), len);
      ctx.globalAlpha = .26; ctx.fillRect(i * bw + 1, base + 2, Math.max(1, bw - 2), len * .6); ctx.globalAlpha = 1; }
    ctx.strokeStyle = ac; ctx.globalAlpha = .22; ctx.beginPath(); ctx.moveTo(0, base); ctx.lineTo(w, base); ctx.stroke(); ctx.globalAlpha = 1;
  } else if (style === 'ocean') {
    for (let L = 0; L < 3; L++) { const amp = (f.energy * .8 + .1) * (h * .5 - 4) * (1 - L * .18); ctx.beginPath();
      for (let x = 0; x <= w; x += 4) { const y = h * .55 + Math.sin(x * .02 + f.t * .05 - L * 1.1) * amp * .5 + Math.sin(x * .011 - f.t * .03) * amp * .3; x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fillStyle = L % 2 ? a2 : ac; ctx.globalAlpha = .16 + L * .07; ctx.fill(); }
    ctx.globalAlpha = 1;
  }
}
