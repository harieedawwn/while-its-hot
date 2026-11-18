#!/usr/bin/env node
/* texbake.mjs — turn CC0 photo textures (Poly Haven) into small, crunchy, palette-reduced PNGs.
 *
 *   node tools/texbake.mjs [name ...] [--force] [--sheet]
 *
 * Downloads the 1k diffuse (+ AO where it helps) into tex-src/ (git-ignored, cached), multiplies AO in,
 * downsizes with tiling preserved (repeat-extend → resize → crop), grades (levels, saturation, tint),
 * reduces to N colors with no dither, writes client/public/tex/<name>.png. --sheet writes
 * shots/tex-sheet.png (every texture tiled 2×2, upscaled ×3 nearest) for review.
 * All sources are CC0 (polyhaven.com/license). Credits are listed in client/public/tex/CREDITS.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'tex-src');
const outDir = path.join(root, 'client/public/tex');

/* Grade: lo/hi = input levels (0..255), gamma > 1 darkens mids, sat = saturation ×, tint = multiply RGB,
 * ao = AO strength (0 none), colors = palette size, sharpen = unsharp sigma after resize. */
const TEX = [
  // hero: brick — warm, mortar pushed dark so courses read at 450p
  { name: 'brick', id: 'red_brick_03', size: 128, ao: 1.4, lo: 18, hi: 215, gamma: 1.15, sat: 0.85, tint: [1.0, 0.86, 0.76], colors: 40, sharpen: 0.6 },
  // hero: grated floor (1 m tile) — bar grating drawn over the rust photo (bearing bars + cross rods, black holes)
  { name: 'grate', id: 'rusty_metal_04', size: 128, ao: 1.0, lo: 10, hi: 215, gamma: 1.0, sat: 0.75, tint: [1.0, 0.92, 0.84], colors: 32, sharpen: 0.4, grate: true },
  // hero: anvil steel — cold, low saturation, strong scratches
  { name: 'steel', id: 'metal_plate_02', size: 128, ao: 0.7, lo: 10, hi: 165, gamma: 0.9, sat: 0.2, tint: [0.88, 0.93, 1.0], colors: 32, sharpen: 0.8 },
  { name: 'rust', id: 'rusty_metal_04', size: 128, ao: 1.0, lo: 15, hi: 225, gamma: 1.05, sat: 0.9, tint: [1.0, 0.9, 0.82], colors: 36, sharpen: 0.5 },
  { name: 'concrete', id: 'dirty_concrete', size: 128, ao: 1.0, lo: 25, hi: 220, gamma: 1.1, sat: 0.5, tint: [1.0, 0.95, 0.9], colors: 28, sharpen: 0.5 },
  { name: 'wood', id: 'brown_planks_03', size: 128, ao: 1.2, lo: 15, hi: 215, gamma: 1.1, sat: 0.8, tint: [1.0, 0.9, 0.8], colors: 32, sharpen: 0.5 },
  { name: 'leather', id: 'fabric_leather_02', size: 64, ao: 1.0, lo: 10, hi: 150, gamma: 1.1, sat: 0.85, tint: [1.0, 0.88, 0.78], colors: 24, sharpen: 0.6 },
  { name: 'cloth', id: 'denim_fabric', size: 64, ao: 0.6, lo: 30, hi: 210, gamma: 1.0, sat: 0.15, tint: [1.0, 0.92, 0.8], colors: 24, sharpen: 0.4 },
  { name: 'slag', id: 'dry_ground_rocks', size: 128, ao: 1.4, lo: 15, hi: 190, gamma: 1.25, sat: 0.45, tint: [1.0, 0.9, 0.84], colors: 32, sharpen: 0.6 },
  { name: 'coal', id: 'gray_rocks', size: 64, ao: 1.8, lo: 30, hi: 250, gamma: 1.9, sat: 0.1, tint: [0.62, 0.6, 0.6], colors: 24, sharpen: 0.6 },
];

const args = process.argv.slice(2);
const force = args.includes('--force');
const sheet = args.includes('--sheet');
const tryIds = args.includes('--try') ? args[args.indexOf('--try') + 1].split(',') : null;
const only = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--try');

async function fetchTo(url, file) {
  if (!force && fs.existsSync(file)) return;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}
async function source(id) {
  const meta = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json();
  const diff = meta.Diffuse?.['1k']?.jpg?.url;
  if (!diff) throw new Error(`no 1k diffuse for ${id}`);
  const ao = meta.AO?.['1k']?.jpg?.url ?? null;
  const d = path.join(srcDir, `${id}_diff.jpg`), a = path.join(srcDir, `${id}_ao.jpg`);
  await fetchTo(diff, d);
  if (ao) await fetchTo(ao, a);
  return { diff: d, ao: ao ? a : null };
}

/** Raw RGB float pipeline on a small buffer: easy to reason about, no surprises from library defaults. */
function grade(px, aoPx, t) {
  const out = Buffer.alloc(px.length);
  for (let i = 0, j = 0; i < px.length; i += 3, j++) {
    let r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255;
    if (aoPx && t.ao) { const k = Math.pow(aoPx[j] / 255, t.ao); r *= k; g *= k; b *= k; }
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    r = l + (r - l) * t.sat; g = l + (g - l) * t.sat; b = l + (b - l) * t.sat;
    const lv = (v) => Math.pow(Math.min(1, Math.max(0, (v * 255 - t.lo) / (t.hi - t.lo))), t.gamma);
    out[i] = Math.round(255 * Math.min(1, lv(r) * t.tint[0]));
    out[i + 1] = Math.round(255 * Math.min(1, lv(g) * t.tint[1]));
    out[i + 2] = Math.round(255 * Math.min(1, lv(b) * t.tint[2]));
  }
  return out;
}

/** Bar grating, 128 px = 1 m: bearing bars every 8 px (2 px: lit edge, dark edge), cross rods every 32 px,
 * holes near-black with a faint warm floor below. The photo supplies the rust on the metal. */
function grate(px, n) {
  const out = Buffer.alloc(px.length);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = (y * n + x) * 3, bx = x % 8, ry = y % 32;
    let k;
    if (bx === 0) k = 1.1; else if (bx === 1) k = 0.7; // bearing bar
    else if (ry === 0) k = 0.8; else if (ry === 1) k = 0.3; // cross rod + shadow
    else k = -1;
    if (k < 0) { const d = (x * 7 + y * 13) % 5 === 0 ? 1.3 : 1; out[i] = 40 * d; out[i + 1] = 24 * d; out[i + 2] = 16 * d; continue; }
    for (let c = 0; c < 3; c++) out[i + c] = Math.min(255, Math.round(px[i + c] * k));
  }
  return out;
}

/** Downsize keeping the texture tileable: pad by wrapping, resize, cut the center. */
async function smallTile(file, size, channels) {
  const meta = await sharp(file).metadata();
  const pad = Math.round(meta.width / 8);
  const scale = size / meta.width, padS = Math.round(pad * scale);
  let img = sharp(file).extend({ top: pad, bottom: pad, left: pad, right: pad, extendWith: 'repeat' })
    .resize(size + padS * 2, size + padS * 2, { kernel: 'lanczos3' });
  img = sharp(await img.toBuffer()).extract({ left: padS, top: padS, width: size, height: size });
  if (channels === 1) img = img.greyscale();
  return img.removeAlpha().raw().toBuffer();
}

async function bake(t, dir = outDir) {
  const src = await source(t.id);
  const px = await smallTile(src.diff, t.size, 3);
  const ao = src.ao ? await smallTile(src.ao, t.size, 1) : null;
  let graded = grade(px, ao, t);
  if (t.grate) graded = grate(graded, t.size);
  const file = path.join(dir, `${t.name}.png`);
  const sharp1 = await sharp(graded, { raw: { width: t.size, height: t.size, channels: 3 } })
    .sharpen({ sigma: t.sharpen }).raw().toBuffer();
  const q = medianCut(sharp1, t.colors);
  // sharp's palette writer caps 17–255 colors at 4-bit, so the palette is ours and the PNG is truecolor.
  await sharp(q, { raw: { width: t.size, height: t.size, channels: 3 } }).png({ compressionLevel: 9 }).toFile(file);
  const colors = new Set();
  for (let i = 0; i < q.length; i += 3) colors.add((q[i] << 16) | (q[i + 1] << 8) | q[i + 2]);
  console.log(`${t.name.padEnd(9)} ${t.size}px ${String(colors.size).padStart(2)} colors  ← ${t.id}`);
}

/** Median-cut palette (split the box with the widest channel range at its median), no dither. */
function medianCut(px, n) {
  const all = [];
  for (let i = 0; i < px.length; i += 3) all.push(i);
  let boxes = [all];
  const range = (b) => {
    let best = -1, ch = 0;
    for (let c = 0; c < 3; c++) {
      let lo = 255, hi = 0;
      for (const i of b) { const v = px[i + c]; if (v < lo) lo = v; if (v > hi) hi = v; }
      if (hi - lo > best) { best = hi - lo; ch = c; }
    }
    return { best, ch };
  };
  while (boxes.length < n) {
    let bi = -1, br = 0, bc = 0;
    boxes.forEach((b, k) => { if (b.length < 2) return; const r = range(b); const s = r.best * Math.sqrt(b.length); if (s > br) { br = s; bi = k; bc = r.ch; } });
    if (bi < 0) break;
    const b = boxes[bi].sort((x, y) => px[x + bc] - px[y + bc]);
    boxes.splice(bi, 1, b.slice(0, b.length >> 1), b.slice(b.length >> 1));
  }
  const out = Buffer.alloc(px.length);
  for (const b of boxes) {
    const m = [0, 0, 0];
    for (const i of b) for (let c = 0; c < 3; c++) m[c] += px[i + c];
    for (const i of b) for (let c = 0; c < 3; c++) out[i + c] = Math.round(m[c] / b.length);
  }
  return out;
}

async function contactSheet(list = TEX, dir = outDir, name = 'tex-sheet') {
  const cell = 128 * 2 * 2, gap = 8, cols = 5, rows = Math.ceil(list.length / cols);
  const comps = [];
  for (let k = 0; k < list.length; k++) {
    const TEXk = list[k], f = path.join(dir, `${TEXk.name}.png`);
    if (!fs.existsSync(f)) continue;
    const s = TEXk.size;
    const tile = await sharp(f).extend({ right: s, bottom: s, extendWith: 'repeat' }).png().toBuffer();
    const big = await sharp(tile).resize(cell, cell, { kernel: 'nearest' }).png().toBuffer();
    comps.push({ input: big, left: (k % cols) * (cell + gap), top: Math.floor(k / cols) * (cell + gap) });
  }
  const out = path.join(root, `shots/${name}.png`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp({ create: { width: cols * (cell + gap), height: rows * (cell + gap), channels: 3, background: '#000' } })
    .composite(comps).png().toFile(out);
  console.log('sheet →', path.relative(root, out));
}

fs.mkdirSync(srcDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });
if (tryIds) { // --try id,id: neutral grade into tex-src/try/, sheet at shots/tex-try.png — for picking sources
  const dir = path.join(srcDir, 'try'); fs.mkdirSync(dir, { recursive: true });
  const list = tryIds.map((id) => ({ name: id, id, size: 128, ao: 1, lo: 15, hi: 230, gamma: 1.1, sat: 0.8, tint: [1, 1, 1], colors: 32, sharpen: 0.5 }));
  for (const t of list) await bake(t, dir);
  await contactSheet(list, dir, 'tex-try');
  process.exit(0);
}
for (const t of TEX) if (!only.length || only.includes(t.name)) await bake(t);
fs.writeFileSync(path.join(outDir, 'CREDITS.md'), '# Texture sources (all CC0, polyhaven.com)\n\n' +
  TEX.map((t) => `- \`${t.name}.png\` ← [${t.id}](https://polyhaven.com/a/${t.id})`).join('\n') + '\n');
if (sheet) await contactSheet();
