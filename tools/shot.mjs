#!/usr/bin/env node
/* shot.mjs — capture a dev scene on several landscape device profiles for visual self-checks.
 *
 *   node tools/shot.mjs <scene> [--devices phones|all|old16x9,long21,...] [--q "cam=0,1.6,4,0,0&t=2"]
 *                       [--wait 600] [--timeout 25000] [--out shots] [--port 5173] [--url http://host:port/]
 *                       [--click "#selector"] [--dpr 1] [--no-contact]
 *
 * Opens <url>?scene=<scene>&nogate=1&shot=1&<q>, waits for window.__ready === true, waits --wait ms more,
 * then saves shots/<label>__<device>.png and shots/<label>__contact.png (all devices on one sheet), and merges
 * console errors + window.__stats into shots/report.json. If nothing answers on the port it starts the client
 * dev server itself (npm run dev -w client) and stops it afterwards.
 * Exit code: 0 ok, 1 page errors or scene never became ready, 2 setup problem (Playwright missing etc.).
 * Headless Chromium renders WebGL with SwiftShader (slow): judge fps on a phone, use __stats for budgets.
 */
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i > -1 && args[i + 1] !== undefined ? args[i + 1] : d; };
const flag = (n) => args.includes(n);
const sceneArg = args[0];
if (!sceneArg || sceneArg.startsWith('--')) {
  console.error('usage: node tools/shot.mjs <scene> [--devices phones|all|a,b] [--q "k=v&k=v"] [--click sel]');
  process.exit(2);
}

// Landscape CSS-pixel viewports. Real phones have DPR 2-3; screenshots default to DPR 1 to keep images small.
const DEVICES = {
  old16x9:  { w: 640,  h: 360, touch: true,  note: 'old 16:9 phone' },
  phone20:  { w: 800,  h: 360, touch: true,  note: '20:9 phone' },
  long21:   { w: 840,  h: 360, touch: true,  note: '21:9 long phone (Oppo/Xiaomi class)' },
  phone195: { w: 780,  h: 360, touch: true,  note: '19.5:9 phone' },
  tablet43: { w: 1024, h: 768, touch: true,  note: '4:3 tablet' },
  desktop:  { w: 1280, h: 720, touch: false, note: 'dev desktop' },
  icon:     { w: 1024, h: 1024, touch: false, note: 'app icon source (square, native res)', q: 'res=native' },
};
const PRESETS = { phones: ['old16x9', 'phone20', 'long21'], all: Object.keys(DEVICES) };
const devArg = opt('--devices', 'phones');
const devices = (PRESETS[devArg] || devArg.split(',')).filter((d) => {
  if (!DEVICES[d]) console.warn(`unknown device "${d}" (known: ${Object.keys(DEVICES).join(', ')})`);
  return !!DEVICES[d];
});

const port = +opt('--port', 5173);
const base = opt('--url', `http://127.0.0.1:${port}/`);
const extraQ = opt('--q', '');
const waitMs = +opt('--wait', 600);
const timeoutMs = +opt('--timeout', 25000);
const outDir = path.resolve(root, opt('--out', 'shots'));
const clickSel = opt('--click', null);
const dpr = +opt('--dpr', 1);
fs.mkdirSync(outDir, { recursive: true });

// "movement&touch=1" -> scene "movement", extra query "touch=1"
const [sceneName, ...sceneRest] = sceneArg.split('&');
const query = ['scene=' + encodeURIComponent(sceneName), 'nogate=1', 'shot=1', ...sceneRest, extraQ]
  .filter(Boolean).join('&');
const label = (sceneArg + (extraQ ? '&' + extraQ : '')).replace(/[^a-z0-9_=-]+/gi, '_').replace(/_+$/, '');

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  try {
    const req = createRequire(path.join(execSync('npm root -g').toString().trim(), 'noop.js'));
    return req('playwright');
  } catch { return null; }
}

async function reachable(url) {
  try { const r = await fetch(url, { signal: AbortSignal.timeout(1500) }); return r.status < 500; } catch { return false; }
}

async function ensureServer() {
  if (await reachable(base)) return null;
  if (opt('--url', null)) { console.error(`not reachable: ${base}`); process.exit(2); }
  console.log(`starting dev server on :${port} ...`);
  const child = spawn('npm', ['run', 'dev', '-w', 'client', '--', '--port', String(port), '--strictPort', '--host', '127.0.0.1'],
    { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
  let log = '';
  child.stdout.on('data', (d) => { log += d; });
  child.stderr.on('data', (d) => { log += d; });
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    if (await reachable(base)) return child;
    if (child.exitCode !== null) break;
    await new Promise((r) => setTimeout(r, 400));
  }
  console.error('dev server did not start:\n' + log.slice(-2000));
  child.kill();
  process.exit(2);
}

function stopServer(child) {
  if (!child) return;
  try {
    if (process.platform === 'win32') execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
    else child.kill('SIGTERM');
  } catch {}
}

const pw = await loadPlaywright();
if (!pw) {
  console.error('Playwright missing: npm i -D playwright && npx playwright install chromium');
  process.exit(2);
}
const server = await ensureServer();
const browser = await pw.chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});

const reportPath = path.join(outDir, 'report.json');
const report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : {};
const shots = [];
let failed = false;

for (const id of devices) {
  const d = DEVICES[id];
  const ctx = await browser.newContext({
    viewport: { width: d.w, height: d.h }, deviceScaleFactor: dpr, hasTouch: d.touch, isMobile: d.touch,
    userAgent: d.touch ? 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' : undefined,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });
  const url = base + (base.includes('?') ? '&' : '?') + query + (d.q ? '&' + d.q : '');
  const t0 = Date.now();
  let ready = false;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: timeoutMs });
    ready = true;
    if (clickSel) { await page.click(clickSel, { timeout: 5000 }); await page.waitForTimeout(300); }
    await page.waitForTimeout(waitMs);
  } catch (e) {
    errors.push('harness: ' + e.message.split('\n')[0]);
  }
  const file = path.join(outDir, `${label}__${id}.png`);
  await page.screenshot({ path: file });
  const stats = await page.evaluate(() => window.__stats ?? null).catch(() => null);
  report[`${label}__${id}`] = { url, ready, readyMs: Date.now() - t0, errors, stats, at: new Date().toISOString() };
  shots.push({ id, file, note: d.note, w: d.w, h: d.h, ok: ready && errors.length === 0 });
  if (!ready || errors.length) failed = true;
  console.log(`${ready && !errors.length ? 'ok  ' : 'FAIL'} ${id.padEnd(9)} ${path.relative(root, file)}` +
    (stats ? `  calls=${stats.calls ?? '?'} tris=${stats.tris ?? '?'}` : '') +
    (errors.length ? `\n     ${errors.slice(0, 5).join('\n     ')}` : ''));
  await ctx.close();
}

if (!flag('--no-contact') && shots.length > 1) {
  const cells = shots.map((s) => {
    const b64 = fs.readFileSync(s.file).toString('base64');
    return `<figure><img src="data:image/png;base64,${b64}"><figcaption>${s.ok ? '' : 'FAIL · '}${s.id} · ${s.w}×${s.h} · ${s.note}</figcaption></figure>`;
  }).join('');
  const html = `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;padding:12px;background:#111;color:#ddd;font:13px system-ui;display:grid;grid-template-columns:1fr 1fr;gap:12px;width:1376px}
    figure{margin:0}img{width:100%;display:block;outline:1px solid #444}figcaption{padding:4px 0}</style>
    <h3 style="grid-column:1/-1;margin:0">${label}</h3>${cells}`;
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 400 } });
  const page = await ctx.newPage();
  await page.setContent(html);
  const contact = path.join(outDir, `${label}__contact.png`);
  await page.screenshot({ path: contact, fullPage: true });
  console.log(`contact sheet: ${path.relative(root, contact)}`);
  await ctx.close();
}

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
await browser.close();
stopServer(server);
process.exit(failed ? 1 : 0);
