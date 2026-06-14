/** Generates a compact floating voxel island for the desktop-widget look. */

import * as THREE from "three";

function hash2(x: number, z: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function smoothNoise(x: number, z: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi);
  const b = hash2(xi + 1, zi);
  const c = hash2(xi, zi + 1);
  const d = hash2(xi + 1, zi + 1);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, u), THREE.MathUtils.lerp(c, d, u), v);
}

export interface Block {
  x: number;
  y: number;
  z: number;
  color: THREE.Color;
}

export interface IslandData {
  blocks: Block[];
  /** Grass-topped cells suitable for trees/props, with their surface height. */
  surface: { x: number; z: number; y: number }[];
  /** Surface height at the island center (where the jukebox sits). */
  centerTop: number;
}

const PALETTE = {
  grass: new THREE.Color("#5fae45"),
  grassDark: new THREE.Color("#4c8f38"),
  dirt: new THREE.Color("#7a5230"),
  rock: new THREE.Color("#74727b"),
  rockDark: new THREE.Color("#565560"),
};

export const ISLAND_RADIUS = 6;

/**
 * Build a rounded floating island centered on the origin: a bumpy grass top
 * with dirt just beneath and a stone underside that tapers to a point so it
 * reads as "floating" against the transparent desktop.
 */
export function buildIsland(): IslandData {
  const blocks: Block[] = [];
  const surface: IslandData["surface"] = [];
  const R = ISLAND_RADIUS;
  let centerTop = 0;

  for (let gx = -R; gx <= R; gx++) {
    for (let gz = -R; gz <= R; gz++) {
      const d = Math.hypot(gx, gz);
      // Irregular edge via noise.
      const edge = R * (0.82 + 0.18 * smoothNoise(gx * 0.45 + 12, gz * 0.45 + 7));
      if (d > edge) continue;

      const top = Math.round(smoothNoise(gx * 0.3, gz * 0.3) * 2); // 0..2 bumps
      const t = 1 - d / edge; // 1 at center, 0 at rim
      const depth = Math.max(1, Math.round(1 + t * t * 6)); // rounded underside

      for (let y = top; y > top - depth; y--) {
        let color: THREE.Color;
        if (y === top) {
          color = (hash2(gx, gz) > 0.5 ? PALETTE.grass : PALETTE.grassDark).clone();
        } else if (y >= top - 2) {
          color = PALETTE.dirt.clone();
        } else {
          color = (hash2(gz, gx) > 0.5 ? PALETTE.rock : PALETTE.rockDark).clone();
        }
        color.multiplyScalar(0.9 + hash2(gx + y, gz - y) * 0.18);
        blocks.push({ x: gx, y, z: gz, color });
      }

      surface.push({ x: gx, z: gz, y: top });
      if (gx === 0 && gz === 0) centerTop = top;
    }
  }

  return { blocks, surface, centerTop };
}
