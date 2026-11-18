#!/usr/bin/env node
/* check_sfx.mjs — renders every sound in sfx.js offline (headless Chromium) and checks it.
 *   node check_sfx.mjs [path/to/sfx.js] [--out sfx-check] [--only gun_pistol,sword_clash]
 * Per sound: peak (must be <= 0 dBFS and audible), loudness (RMS of the active part), length to -60 dB,
 * NaN/silence detection. Writes <out>/<name>.wav for listening and <out>/spectrograms.png
 * (look at it: a gunshot should be a sharp full-band spike with a low tail, a sword ring should be
 * thin horizontal partial lines, UI sounds should be tiny and short).
 * Exit 1 on any failure; exit 2 if Playwright is missing.
 */
import { createRequire } from 'module';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i > -1 ? args[i + 1] : d; };
const lib = path.resolve(args[0] && !args[0].startsWith('--') ? args[0] : path.join(here, 'sfx.js'));
const out = path.resolve(opt('--out', 'sfx-check'));
const only = opt('--only', '');
fs.mkdirSync(out, { recursive: true });

async function loadPW() {
  try { return await import('playwright'); } catch (e) {}
  try { const r = createRequire(path.join(execSync('npm root -g').toString().trim(), 'x.js')); return r('playwright'); } catch (e) { return null; }
}
const pw = await loadPW();
if (!pw) { console.log('SKIPPED: Playwright not available (npm i -g playwright && npx playwright install chromium)'); process.exit(2); }
let browser;
for (const o of [{}, { channel: 'chrome' }, { executablePath: '/usr/bin/google-chrome' }]) { try { browser = await pw.chromium.launch(o); break; } catch (e) {} }
if (!browser) { console.log('SKIPPED: no Chromium'); process.exit(2); }
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
await page.setContent('<html><body style="margin:0;background:#0b0d10"></body></html>');
await page.addScriptTag({ content: fs.readFileSync(lib, 'utf8') });

const results = await page.evaluate(async (only) => {
  const names = only ? only.split(',') : SFX.names;
  const res = [];
  const footSurfaces = ['stone', 'grass', 'wood', 'gravel', 'metal'];
  const jobs = [];
  for (const n of names) {
    if (n === 'footstep') footSurfaces.forEach(s => jobs.push({ id: 'footstep_' + s, name: n, o: { surface: s } }));
    else jobs.push({ id: n, name: n, o: {} });
  }
  function wav(buf) {
    const ch = buf.numberOfChannels, len = buf.length, sr = buf.sampleRate, b = new DataView(new ArrayBuffer(44 + len * ch * 2));
    const ws = (o, s) => [...s].forEach((c, i) => b.setUint8(o + i, c.charCodeAt(0)));
    ws(0, 'RIFF'); b.setUint32(4, 36 + len * ch * 2, true); ws(8, 'WAVEfmt '); b.setUint32(16, 16, true); b.setUint16(20, 1, true);
    b.setUint16(22, ch, true); b.setUint32(24, sr, true); b.setUint32(28, sr * ch * 2, true); b.setUint16(32, ch * 2, true); b.setUint16(34, 16, true);
    ws(36, 'data'); b.setUint32(40, len * ch * 2, true);
    const data = [...Array(ch)].map((_, c) => buf.getChannelData(c));
    let o = 44; for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, data[c][i])); b.setInt16(o, v * 32767, true); o += 2; }
    let s = ''; const u = new Uint8Array(b.buffer); for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768));
    return btoa(s);
  }
  function spectro(buf) {   // simple STFT image
    const d = buf.getChannelData(0), sr = buf.sampleRate, N = 1024, hop = 256, cols = Math.min(300, Math.floor((d.length - N) / hop)), rows = 128;
    const c = document.createElement('canvas'); c.width = cols; c.height = rows; const x = c.getContext('2d'); const img = x.createImageData(cols, rows);
    const re = new Float32Array(N), im = new Float32Array(N);
    for (let col = 0; col < cols; col++) {
      for (let i = 0; i < N; i++) { re[i] = d[col * hop + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / N)); im[i] = 0; }
      for (let i = 1, j = 0; i < N; i++) { let bit = N >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; } }
      for (let len = 2; len <= N; len <<= 1) { const a = -2 * Math.PI / len; for (let i = 0; i < N; i += len) for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(a * k), wi = Math.sin(a * k), xr = re[i + k + len / 2] * wr - im[i + k + len / 2] * wi, xi = re[i + k + len / 2] * wi + im[i + k + len / 2] * wr;
        re[i + k + len / 2] = re[i + k] - xr; im[i + k + len / 2] = im[i + k] - xi; re[i + k] += xr; im[i + k] += xi; } }
      for (let r = 0; r < rows; r++) {   // log-frequency rows 40 Hz .. 20 kHz
        const f = 40 * Math.pow(500, r / (rows - 1)), bin = Math.min(N / 2 - 1, Math.round(f / sr * N));
        const db = 20 * Math.log10(Math.hypot(re[bin], im[bin]) / N + 1e-9), v = Math.max(0, Math.min(1, (db + 100) / 80));
        const p = ((rows - 1 - r) * cols + col) * 4; img.data[p] = 255 * Math.min(1, v * 1.6); img.data[p + 1] = 255 * Math.max(0, v * 1.6 - 0.6); img.data[p + 2] = 90 * v + 30; img.data[p + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0); return c.toDataURL();
  }
  for (const j of jobs) {
    const seconds = /explosion/.test(j.name) ? 4.5 : /gun_|reward|door|clash|metal|notify/.test(j.name) ? 3 : 2.2;
    const buf = await SFX.renderOffline(j.name, j.o, seconds);
    let peak = 0, nan = false, last = 0;
    const L = buf.getChannelData(0), Rr = buf.getChannelData(1);
    for (let i = 0; i < buf.length; i++) { const v = Math.max(Math.abs(L[i]), Math.abs(Rr[i])); if (Number.isNaN(v)) { nan = true; break; } if (v > peak) peak = v; }
    const thr = peak * 0.0032; /* -50 dB below peak */ for (let i = buf.length - 1; i >= 0; i--) if (Math.abs(L[i]) > thr) { last = i; break; }
    let sum = 0, cnt = 0; const thrA = peak * 0.05; for (let i = 0; i <= last; i++) if (Math.abs(L[i]) > thrA) { sum += L[i] * L[i]; cnt++; }
    res.push({ id: j.id, peakDb: 20 * Math.log10(peak + 1e-12), rmsDb: 10 * Math.log10(sum / Math.max(1, cnt) + 1e-12), len: last / buf.sampleRate, tailCut: last > buf.length - buf.sampleRate * 0.02, nan, wav: wav(buf), img: spectro(buf) });
  }
  return res;
}, only);

const html = results.map(r => `<figure><img src="${r.img}"><figcaption>${r.id} · ${r.len.toFixed(2)}s · pk ${r.peakDb.toFixed(1)} dB</figcaption></figure>`).join('');
await page.setContent(`<body style="margin:0;background:#0b0d10;color:#ddd;font:12px system-ui"><div style="display:grid;grid-template-columns:repeat(5,300px);gap:10px;padding:10px">${html}</div><style>figure{margin:0}img{width:300px;height:128px;image-rendering:pixelated;display:block}</style></body>`);
await page.screenshot({ path: path.join(out, 'spectrograms.png'), fullPage: true });
await browser.close();

let fails = 0;
console.log('sound                 peak dB  loud dB  length');
for (const r of results) {
  fs.writeFileSync(path.join(out, r.id + '.wav'), Buffer.from(r.wav, 'base64'));
  const bad = [];
  if (r.nan) bad.push('NaN in output');
  if (r.peakDb > 0.01) bad.push('clips');
  if (r.peakDb < -45) bad.push('nearly silent');
  if (r.rmsDb < -48) bad.push('too quiet to hear');
  if (r.tailCut) bad.push('still sounding at render end');
  if (bad.length) fails++;
  console.log(`${(bad.length ? 'FAIL ' : 'ok   ') + r.id.padEnd(20)} ${r.peakDb.toFixed(1).padStart(6)}  ${r.rmsDb.toFixed(1).padStart(7)}  ${r.len.toFixed(2)}s ${bad.join(', ')}`);
}
console.log(`\n${fails ? fails + ' sound(s) failed' : 'all sounds OK'} — WAVs and spectrograms.png in ${out}`);
process.exit(fails ? 1 : 0);
