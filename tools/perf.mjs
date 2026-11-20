#!/usr/bin/env node
/* perf.mjs — phase-31 frame-time split. Loads a busy scene (default: 6-player net fight with bots + effects),
 * throttles the CPU (CDP), samples window.__stats for N seconds and prints fps, p50/p95 frame gap, the JS update /
 * render-submit split, GC (heap sawtooth) and draw calls. Software GL in headless Chromium makes absolute GPU time
 * meaningless: compare runs, and read updMs + renMs (CPU only) against the 16.6 ms budget.
 *   node tools/perf.mjs [--scene "net&cage=0&bots=5&touch=1&settle=2500"] [--throttle 4] [--secs 10] [--port 5173]
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i > -1 && args[i + 1] !== undefined ? args[i + 1] : d; };
const scene = opt('--scene', 'net&cage=0&bots=5&touch=1&settle=2500');
const throttle = +opt('--throttle', 4), secs = +opt('--secs', 10), port = +opt('--port', 5173);
const base = `http://127.0.0.1:${port}/`;

async function up() { try { return (await fetch(base, { signal: AbortSignal.timeout(1500) })).status < 500; } catch { return false; } }
let server = null;
if (!(await up())) {
  server = spawn('npx', ['vite', '--port', String(port), '--host', '127.0.0.1', '--strictPort'], { cwd: path.join(root, 'client'), stdio: 'ignore' });
  for (let i = 0; i < 40 && !(await up()); i++) await new Promise((r) => setTimeout(r, 500));
}
let pw;
try { pw = await import('playwright'); } catch { pw = createRequire(import.meta.url)(path.join(process.env.NODE_PATH ?? '/usr/lib/node_modules', 'playwright')); }
const browser = await pw.chromium.launch({ args: ['--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 360 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${base}?scene=${scene}&nogate=1`);
await page.waitForFunction(() => window.__ready, null, { timeout: 90000 });
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
await page.waitForTimeout(1500);
const prof = args.includes('--profile');
if (prof) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start'); }
const alloc = args.includes('--alloc');
if (alloc) { await cdp.send('HeapProfiler.enable'); await cdp.send('HeapProfiler.startSampling', { samplingInterval: 4096, includeObjectsCollectedByMinorGC: true, includeObjectsCollectedByMajorGC: true }); }
const res = await page.evaluate((ms) => new Promise((done) => {
  const gaps = [], upd = [], ren = [], heap = [], calls = [];
  let last = performance.now(); const end = last + ms;
  const tick = (now) => {
    gaps.push(now - last); last = now;
    const s = window.__stats; if (s) { upd.push(s.updMs); ren.push(s.renMs); calls.push(s.calls); }
    const m = performance.memory; if (m) heap.push(m.usedJSHeapSize);
    if (now < end) requestAnimationFrame(tick); else done({ gaps, upd, ren, heap, calls });
  };
  requestAnimationFrame(tick);
}), secs * 1000);
if (prof) {
  const { profile } = await cdp.send('Profiler.stop');
  const self = new Map(), dt = profile.timeDeltas; const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  profile.samples.forEach((id, i) => { const n = byId.get(id), f = n.callFrame; const k = `${f.functionName || '(anon)'} ${f.url.split('/').slice(-2).join('/')}:${f.lineNumber}`; self.set(k, (self.get(k) ?? 0) + (dt[i] ?? 0)); });
  const tot = [...self.values()].reduce((a, b) => a + b, 0);
  console.log('--- top self time (% of sampled main-thread time)');
  [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 22).forEach(([k, v]) => console.log(`${(100 * v / tot).toFixed(1).padStart(5)}%  ${k}`));
}
if (alloc) {
  const { profile } = await cdp.send('HeapProfiler.stopSampling');
  const self = new Map(); const walk = (n) => { const f = n.callFrame; const k = `${f.functionName || '(anon)'} ${f.url.split('/').slice(-2).join('/')}:${f.lineNumber}`; self.set(k, (self.get(k) ?? 0) + n.selfSize); n.children.forEach(walk); };
  walk(profile.head);
  const tot = [...self.values()].reduce((a, b) => a + b, 0);
  console.log(`--- top allocators (sampled, live+freed) total ${(tot / 1048576).toFixed(1)} MB`);
  [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16).forEach(([k, v]) => console.log(`${(100 * v / tot).toFixed(1).padStart(5)}%  ${k}`));
}
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))] ?? 0; };
const avg = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
let drops = 0; for (let i = 1; i < res.heap.length; i++) if (res.heap[i] < res.heap[i - 1] - 262144) drops++;
const fps = 1000 / avg(res.gaps);
console.log(`scene=${scene} throttle=x${throttle} ${secs}s frames=${res.gaps.length}`);
console.log(`fps ${fps.toFixed(1)}  gap p50 ${q(res.gaps, .5).toFixed(1)} p95 ${q(res.gaps, .95).toFixed(1)} max ${Math.max(...res.gaps).toFixed(1)} ms`);
console.log(`JS update ${avg(res.upd).toFixed(2)} ms (p95 ${q(res.upd, .95).toFixed(2)})  render-submit ${avg(res.ren).toFixed(2)} ms (p95 ${q(res.ren, .95).toFixed(2)})`);
console.log(`GC: ${drops} heap drops >256 KB in ${secs}s, heap ${(Math.min(...res.heap) / 1048576).toFixed(0)}-${(Math.max(...res.heap) / 1048576).toFixed(0)} MB  draw calls ${avg(res.calls).toFixed(0)}`);
if (errors.length) console.log('errors:', errors.slice(0, 3));
await browser.close(); server?.kill();
