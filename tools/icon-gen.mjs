#!/usr/bin/env node
/**
 * Android icon + splash from tools/icon-src.png (a `node tools/shot.mjs icon --devices icon` capture).
 *   node tools/icon-gen.mjs [src.png]
 * Writes adaptive foreground / monochrome / legacy launcher mipmaps and the splash drawables in android/.
 * Background layer is the solid soot color (BG) which is also the scene's clear color, so the art melts into it.
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const res = path.join(root, 'android/app/src/main/res');
const src = process.argv[2] ?? path.join(root, 'tools/icon-src.png');
const BG = { r: 5, g: 3, b: 2 };
const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const write = (rel, buf) => { const f = path.join(res, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, buf); };

// Art scaled to fill the 66 % safe circle of the 108 dp layer (corners of the square fall outside it, but they are soot black).
const ART = 0.74;
const art = async (size) => {
  const a = Math.round(size * ART);
  const buf = await sharp(src).resize(a, a, { kernel: 'lanczos3' }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: { ...BG, alpha: 1 } } })
    .composite([{ input: buf, left: Math.round((size - a) / 2), top: Math.round((size - a) / 2) }]).png().toBuffer();
};
const fgAlpha = async (size) => { // foreground over transparent: art with the soot keyed out by luminance
  const img = await sharp(await art(size)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = img;
  for (let i = 0; i < data.length; i += 4) {
    const l = Math.max(data[i], data[i + 1], data[i + 2]);
    data[i + 3] = Math.min(255, Math.round(l * 255 / 26)); // fully opaque above ~10 % brightness, black stays clear
  }
  return sharp(data, { raw: info }).png().toBuffer();
};
const mono = async (size) => { // themed icon: opaque where the art is lit at all
  const { data, info } = await sharp(await art(size)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const l = Math.max(data[i], data[i + 1], data[i + 2]);
    data[i] = data[i + 1] = data[i + 2] = 255; data[i + 3] = l > 16 ? 255 : 0;
  }
  return sharp(data, { raw: info }).png().toBuffer();
};

for (const [d, k] of Object.entries(DENS)) {
  const layer = Math.round(108 * k), leg = Math.round(48 * k);
  write(`mipmap-${d}/ic_launcher_foreground.png`, await fgAlpha(layer));
  write(`mipmap-${d}/ic_launcher_monochrome.png`, await mono(layer));
  // legacy: the art cropped to the 72 dp inner window, plain square and round
  const full = await art(layer);
  const win = Math.round(layer * 72 / 108), off = Math.round((layer - win) / 2);
  const sq = await sharp(full).extract({ left: off, top: off, width: win, height: win }).resize(leg, leg).png().toBuffer();
  const mask = (r) => Buffer.from(`<svg width="${leg}" height="${leg}"><rect width="${leg}" height="${leg}" rx="${r}" fill="#fff"/></svg>`);
  write(`mipmap-${d}/ic_launcher.png`, await sharp(sq).composite([{ input: mask(leg * 0.18), blend: 'dest-in' }]).png().toBuffer());
  write(`mipmap-${d}/ic_launcher_round.png`, await sharp(sq).composite([{ input: mask(leg / 2), blend: 'dest-in' }]).png().toBuffer());
}
write('values/ic_launcher_background.xml', '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#050302</color>\n</resources>\n');
const xml = (extra) => `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>\n</adaptive-icon>\n`;
write('mipmap-anydpi-v26/ic_launcher.xml', xml());
write('mipmap-anydpi-v26/ic_launcher_round.xml', xml());

// Splash: soot black, the art centered at ~46 % of the short side (black window background matches exactly).
const splash = async (w, h) => {
  const a = Math.round(Math.min(w, h) * 0.62);
  const buf = await sharp(src).resize(a, a, { kernel: 'lanczos3' }).png().toBuffer();
  return sharp({ create: { width: w, height: h, channels: 3, background: BG } })
    .composite([{ input: buf, left: Math.round((w - a) / 2), top: Math.round((h - a) / 2) }]).png({ compressionLevel: 9 }).toBuffer();
};
for (const f of fs.readdirSync(res).filter((n) => /^drawable(-(land|port)-\w+)?$/.test(n))) {
  const p = path.join(res, f, 'splash.png');
  if (!fs.existsSync(p)) continue;
  const m = sharp(p); const { width, height } = await m.metadata();
  write(`${f}/splash.png`, await splash(width, height));
}
console.log('icon + splash written');
