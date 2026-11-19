import * as THREE from 'three';
import { HEAT_HEX } from '../../render/heat';
import * as P from '../../render/geo/procgeo';

/** 4 flame frames side by side (FW × FH each), heat-ramp colors, hard alpha. Pixels only, nearest sampled. */
export const FLAME_FRAMES = 4;
const FW = 24, FH = 48;

export function flameAtlas(seed = 5): THREE.DataTexture {
  const rnd = P.rng(seed), L = 16, lat = Float32Array.from({ length: L * L }, () => rnd());
  const at = (x: number, y: number) => lat[(((y % L) + L) % L) * L + (((x % L) + L) % L)];
  const noise = (x: number, y: number) => {
    const x0 = Math.floor(x), y0 = Math.floor(y), tx = x - x0, ty = y - y0;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx, b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
    return a + (b - a) * sy;
  };
  const W = FW * FLAME_FRAMES, data = new Uint8Array(W * FH * 4);
  const rgb = HEAT_HEX.map((h) => { const k = parseInt(h.slice(1), 16); return [(k >> 16) & 255, (k >> 8) & 255, k & 255]; });
  for (let f = 0; f < FLAME_FRAMES; f++) for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const v = y / (FH - 1), u = x / (FW - 1);
    // the flame body rises: noise scrolls upward by a quarter period per frame, sideways lick grows with height
    const rise = v * 3 - f * 0.75;
    const lick = (noise(rise, f * 0.7 + 3) - 0.5) * 0.5 * v;
    const dx = u - 0.5 - lick;
    const width = 0.46 * Math.pow(1 - v, 0.65) * (0.75 + 0.5 * noise(u * 3 + f * 2, rise * 1.5));
    const n2 = noise(u * 5 + 11, v * 6 - f * 1.5);
    const inside = Math.abs(dx) < width || (v > 0.55 && n2 > 0.78 && Math.abs(dx) < 0.22);
    const i = (y * W + f * FW + x) * 4; // DataTexture row 0 = uv v 0 (the flame foot)
    if (!inside) continue;
    // hot core low and in the middle, cooler toward the edges and the tips
    const core = 1 - Math.abs(dx) / Math.max(0.05, width);
    const h = 0.18 + core * 0.45 - v * 0.42 + (n2 - 0.5) * 0.2;
    const step = Math.max(3, Math.min(7, 3 + Math.floor(h * 6)));
    data.set([...rgb[step], 255], i);
  }
  const t = new THREE.DataTexture(data, W, FH);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}
