#!/usr/bin/env node
/* weapon-atlas.mjs — compose client/public/tex/weapon.png (128×128) from the baked world textures, so a whole
 * weapon is one mesh, one material, one draw call (TECH: remote player ≤ 3 calls).
 *
 *   node tools/weapon-atlas.mjs [--sheet]
 *
 * Quadrants (image space), UV rects in client/src/weapons/wkit.ts `QUAD`:
 *   top-left  bright — ground steel: procedural grinding streaks along the blade + scratches
 *   top-right forged — hammer scale: procedural speckle + pits (the +3 forms and raw stock)
 *   bot-left  wood   — procedural end-to-end grain with one knot
 *   bot-right leather — wrap leather as is
 * --sheet also writes shots/weapon-atlas.png upscaled ×4 nearest for review.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tex = (n) => path.join(root, 'client/public/tex', `${n}.png`);

async function quad(src, { region, grey = false, lin = [1, 0], tint = [1, 1, 1], colors = 24 }) {
  let img = sharp(tex(src)).extract(region).resize(64, 64, { kernel: 'nearest' });
  if (grey) img = img.greyscale().toColourspace('srgb');
  const buf = await img.linear(lin[0], lin[1]).recomb([[tint[0], 0, 0], [0, tint[1], 0], [0, 0, tint[2]]])
    .removeAlpha().png({ palette: true, colors, dither: 0 }).toBuffer();
  return sharp(buf).removeAlpha().raw().toBuffer();
}

// tiny deterministic rng + value noise for the procedural quadrants
let seed = 7;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const smooth1 = (n, k) => { const a = Array.from({ length: n }, rnd); return a.map((_, i) => { let s = 0; for (let j = -k; j <= k; j++) s += a[(i + j + n) % n]; return s / (2 * k + 1); }); };
/** 64×64 RGB from a per-pixel function (wraps cleanly: column/row noise is periodic). */
function proc(fn) {
  const b = Buffer.alloc(64 * 64 * 3);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const [r, g, bl] = fn(x, y);
    const i = (y * 64 + x) * 3; b[i] = Math.max(0, Math.min(255, r)); b[i + 1] = Math.max(0, Math.min(255, g)); b[i + 2] = Math.max(0, Math.min(255, bl));
  }
  return b;
}
// bright: ground steel — long grinding streaks (column noise, slowly varying down the row) + a few scratches
const colA = smooth1(64, 1), colB = smooth1(64, 3), rowA = smooth1(64, 6);
const scratches = Array.from({ length: 9 }, () => ({ x: rnd() * 64, y: rnd() * 64, len: 6 + rnd() * 18, dx: (rnd() - 0.5) * 0.5 }));
const bright = proc((x, y) => {
  let v = 168 + (colA[x] - 0.5) * 34 + (colB[x] - 0.5) * 30 + (rowA[y] - 0.5) * 16;
  for (const s of scratches) { const t = y - s.y; if (t >= 0 && t < s.len && Math.abs(x - (s.x + t * s.dx)) < 0.6) v += 34; }
  v = Math.round(v / 8) * 8;
  return [v * 0.95, v * 0.98, v];
});
// wood: end-to-end grain, a darker late-wood line every few columns, one small knot
const grain = smooth1(64, 1), band = smooth1(64, 4);
const wood = proc((x, y) => {
  const kx = x - 40, ky = y - 20, knot = Math.exp(-(kx * kx * 0.5 + ky * ky * 0.08));
  const w = Math.sin((x + knot * 6) * 1.3 + band[y] * 3) * 0.5 + 0.5;
  let v = 0.62 + (grain[x] - 0.5) * 0.35 - w * 0.16 - knot * 0.35 + (band[x] - 0.5) * 0.2;
  v = Math.round(v * 14) / 14;
  return [190 * v, 152 * v, 120 * v];
});
// forged: hammer scale — fine speckle, small dark pits, faint hammer facets (soft diagonal bands)
const fRow = smooth1(64, 2), fCol = smooth1(64, 2);
const forged = proc((x, y) => {
  let v = 132 + (rnd() - 0.5) * 30 + (fRow[(x + y) & 63] - 0.5) * 26 + (fCol[(x * 2 + y * 3) & 63] - 0.5) * 22;
  const r = rnd();
  if (r < 0.06) v -= 55; else if (r < 0.1) v -= 28;
  v = Math.round(v / 8) * 8;
  return [v * 1.0, v * 0.97, v * 0.93];
});
const parts = [
  [0, 0, bright],
  [64, 0, forged],
  [0, 64, wood],
  [64, 64, await quad('leather', { region: { left: 0, top: 0, width: 64, height: 64 }, lin: [0.95, 6] })],
];
const out = Buffer.alloc(128 * 128 * 3);
for (const [ox, oy, buf] of parts) {
  for (let y = 0; y < 64; y++) buf.copy(out, ((oy + y) * 128 + ox) * 3, y * 64 * 3, (y + 1) * 64 * 3);
}
await sharp(out, { raw: { width: 128, height: 128, channels: 3 } }).png({ palette: true, colors: 64, dither: 0 }).toFile(tex('weapon'));
console.log('wrote client/public/tex/weapon.png');
if (process.argv.includes('--sheet')) {
  fs.mkdirSync(path.join(root, 'shots'), { recursive: true });
  await sharp(tex('weapon')).resize(512, 512, { kernel: 'nearest' }).toFile(path.join(root, 'shots/weapon-atlas.png'));
}
