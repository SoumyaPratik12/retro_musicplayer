// src/skins/skins.ts — the token-driven skin engine (format:1)
export type VizStyle =
  | 'soft' | 'bars' | 'scope' | 'holo' | 'needle' | 'meter'
  | 'circular' | 'reflect' | 'ocean' | 'infinibar';

export interface Skin {
  id: string;
  name: string;
  visualizer: VizStyle;
  effects: { scanlines: number; sheen: boolean; woodFrame: boolean; hudCorners: boolean };
  vars: Record<string, string>; // CSS custom properties
}

const T3D_D = '0 1px 2px rgba(0,0,0,.6)', T3D_L = '0 1px 2px rgba(0,0,0,.22)';
const GR_D = 'inset 0 2px 4px rgba(0,0,0,.55)', GR_L = 'inset 0 2px 4px rgba(0,0,0,.18)';

export const SKINS: Skin[] = [
  { id: 'neo-retro-premium', name: 'Neo-Retro Premium', visualizer: 'soft',
    effects: { scanlines: 0, sheen: false, woodFrame: false, hudCorners: false },
    vars: { '--panel': '#0e0f14', '--art-bg': 'linear-gradient(145deg,#1c2030,#10131c)', '--text': '#eceef4', '--text-dim': '#8b8f9c', '--accent': '#4dd8ff', '--accent2': '#9aa0ad', '--title-color': '#f3f4f8', '--edge': 'rgba(255,255,255,.08)', '--edge2': 'rgba(255,255,255,.14)', '--track': 'rgba(255,255,255,.08)', '--radius': '16', '--scan': '0', '--sheen': 'none', '--font-brand': "'Inter'", '--font-title': "'Inter'", '--title-weight': '600', '--font-led': "'Share Tech Mono'", '--shadow': '0 22px 50px -24px rgba(0,0,0,.7)', '--art-shadow': 'none', '--glow': 'none', '--dot-glow': '0 0 8px var(--accent)', '--play-ink': '#05222b', '--t3d': T3D_D, '--groove': GR_D, '--like-bg': 'rgba(255,255,255,.05)', '--like-color': '#ff5d7a' } },
  { id: 'neon-night', name: 'Neon Night', visualizer: 'bars',
    effects: { scanlines: 0.15, sheen: false, woodFrame: false, hudCorners: false },
    vars: { '--panel': '#0a0a14', '--art-bg': '#0e0e1c', '--text': '#e8e8ff', '--text-dim': '#7a7ab0', '--accent': '#ff2bd6', '--accent2': '#27f5ff', '--title-color': '#27f5ff', '--edge': 'rgba(255,43,214,.24)', '--edge2': 'rgba(255,43,214,.3)', '--track': 'rgba(255,255,255,.08)', '--radius': '8', '--scan': '0.15', '--sheen': 'none', '--font-brand': "'VT323'", '--font-title': "'VT323'", '--title-weight': '400', '--font-led': "'VT323'", '--shadow': '0 0 54px -14px rgba(255,43,214,.5)', '--art-shadow': 'inset 0 0 30px -8px rgba(255,43,214,.4)', '--glow': '0 0 8px var(--accent2),0 0 18px var(--accent2)', '--dot-glow': '0 0 10px var(--accent)', '--play-ink': '#1a0316', '--t3d': T3D_D, '--groove': GR_D, '--like-bg': 'rgba(255,255,255,.05)', '--like-color': '#ff2bd6' } },
  { id: 'chrome-2001', name: 'Chrome 2001', visualizer: 'bars',
    effects: { scanlines: 0.04, sheen: false, woodFrame: false, hudCorners: false },
    vars: { '--panel': 'linear-gradient(160deg,#e9ecf1,#c2c8d2 48%,#dfe3ea)', '--art-bg': 'linear-gradient(180deg,#0d1b2a,#16263b)', '--text': '#2a2f3a', '--text-dim': '#6c7280', '--accent': '#2f7fff', '--accent2': '#1e5fd0', '--title-color': '#1f2733', '--edge': 'rgba(120,130,150,.45)', '--edge2': 'rgba(120,130,150,.6)', '--track': 'rgba(0,0,0,.14)', '--radius': '14', '--scan': '0.04', '--sheen': 'none', '--font-brand': "'Inter'", '--font-title': "'Inter'", '--title-weight': '600', '--font-led': "'Share Tech Mono'", '--shadow': '0 18px 44px -20px rgba(20,30,50,.6)', '--art-shadow': 'inset 0 2px 12px -4px rgba(0,0,0,.6)', '--glow': 'none', '--dot-glow': '0 0 8px var(--accent)', '--play-ink': '#021022', '--t3d': T3D_L, '--groove': GR_L, '--like-bg': 'rgba(0,0,0,.05)', '--like-color': '#e0245e' } },
  { id: 'terminal', name: 'Terminal', visualizer: 'scope',
    effects: { scanlines: 0.30, sheen: false, woodFrame: false, hudCorners: false },
    vars: { '--panel': '#020402', '--art-bg': '#001000', '--text': '#33ff77', '--text-dim': '#1f9e4c', '--accent': '#33ff77', '--accent2': '#48ff86', '--title-color': '#48ff86', '--edge': 'rgba(51,255,119,.25)', '--edge2': 'rgba(51,255,119,.4)', '--track': 'rgba(51,255,119,.12)', '--radius': '5', '--scan': '0.3', '--sheen': 'none', '--font-brand': "'Share Tech Mono'", '--font-title': "'Share Tech Mono'", '--title-weight': '400', '--font-led': "'Share Tech Mono'", '--shadow': '0 0 54px -16px rgba(51,255,119,.4)', '--art-shadow': 'inset 0 0 40px -10px rgba(51,255,119,.3)', '--glow': '0 0 6px var(--accent),0 0 12px var(--accent)', '--dot-glow': '0 0 10px var(--accent)', '--play-ink': '#042b12', '--t3d': T3D_D, '--groove': GR_D, '--like-bg': 'rgba(255,255,255,.05)', '--like-color': '#33ff77' } },
  { id: 'cyber-future', name: 'Cyber Future', visualizer: 'holo',
    effects: { scanlines: 0.06, sheen: true, woodFrame: false, hudCorners: true },
    vars: { '--panel': 'linear-gradient(160deg,#0a0a1a,#070712)', '--art-bg': 'linear-gradient(145deg,#0d1430,#0a0a1f)', '--text': '#dfe6ff', '--text-dim': '#7d8ad6', '--accent': '#00e5ff', '--accent2': '#c44dff', '--title-color': '#00e5ff', '--edge': 'rgba(0,229,255,.32)', '--edge2': 'rgba(196,77,255,.4)', '--track': 'rgba(122,92,255,.18)', '--radius': '12', '--scan': '0.06', '--sheen': 'linear-gradient(120deg,transparent 30%,rgba(0,229,255,.1),rgba(196,77,255,.1),transparent 70%)', '--font-brand': "'Orbitron'", '--font-title': "'Orbitron'", '--title-weight': '500', '--font-led': "'Share Tech Mono'", '--shadow': '0 0 60px -16px rgba(0,229,255,.5)', '--art-shadow': 'inset 0 0 40px -10px rgba(0,229,255,.4)', '--glow': '0 0 10px var(--accent),0 0 22px var(--accent2)', '--dot-glow': '0 0 12px var(--accent)', '--play-ink': '#032027', '--t3d': T3D_D, '--groove': GR_D, '--like-bg': 'rgba(255,255,255,.05)', '--like-color': '#ff4ecd' } },
  { id: 'minimal-professional', name: 'Minimal Professional', visualizer: 'soft',
    effects: { scanlines: 0, sheen: false, woodFrame: false, hudCorners: false },
    vars: { '--panel': '#f7f7f4', '--art-bg': 'linear-gradient(145deg,#e9e9e5,#d8d8d2)', '--text': '#1a1a1e', '--text-dim': '#9a9aa2', '--accent': '#4b4fce', '--accent2': '#3a3a40', '--title-color': '#15151a', '--edge': 'rgba(0,0,0,.1)', '--edge2': 'rgba(0,0,0,.16)', '--track': 'rgba(0,0,0,.1)', '--radius': '16', '--scan': '0', '--sheen': 'none', '--font-brand': "'Inter'", '--font-title': "'Fraunces'", '--title-weight': '500', '--font-led': "'Share Tech Mono'", '--shadow': '0 18px 44px -22px rgba(0,0,0,.25)', '--art-shadow': 'none', '--glow': 'none', '--dot-glow': 'none', '--play-ink': '#ffffff', '--t3d': T3D_L, '--groove': GR_L, '--like-bg': 'rgba(0,0,0,.05)', '--like-color': '#e0245e' } },
  { id: 'luxury-hi-fi', name: 'Luxury Hi-Fi', visualizer: 'needle',
    effects: { scanlines: 0.05, sheen: false, woodFrame: true, hudCorners: false },
    vars: { '--panel': 'linear-gradient(180deg,#101013,#08080a)', '--art-bg': 'linear-gradient(180deg,#0d0d10,#050506)', '--text': '#ece3cf', '--text-dim': '#8a7f63', '--accent': '#c9a86a', '--accent2': '#e8d6a8', '--title-color': '#ece3cf', '--edge': 'rgba(201,168,106,.28)', '--edge2': 'rgba(201,168,106,.4)', '--track': 'rgba(201,168,106,.15)', '--radius': '6', '--scan': '0.05', '--sheen': 'none', '--font-brand': "'Fraunces'", '--font-title': "'Inter'", '--title-weight': '500', '--font-led': "'Share Tech Mono'", '--shadow': '0 26px 56px -24px rgba(0,0,0,.85)', '--art-shadow': 'inset 0 2px 20px -6px rgba(0,0,0,.9)', '--glow': '0 0 8px rgba(201,168,106,.5)', '--dot-glow': '0 0 8px var(--accent)', '--play-ink': '#2a2010', '--t3d': T3D_D, '--groove': GR_D, '--like-bg': 'rgba(255,255,255,.05)', '--like-color': '#e8b34a' } }
];

export function applySkin(skin: Skin) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(skin.vars)) root.style.setProperty(k, v);
  root.style.setProperty('--woodFrame', skin.effects.woodFrame ? '1' : '0');
}
