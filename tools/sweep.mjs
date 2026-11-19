#!/usr/bin/env node
/* sweep.mjs — phase-19 harness: every scene x every device, no images. Records __stats (calls/tris/programs),
 * console errors, time-to-ready, and a DOM fit check (elements outside the viewport, text clipped by its box,
 * overlapping buttons). Output: shots/sweep.json + a table on stdout. Starts the dev server if needed.
 *   node tools/sweep.mjs [--devices all|a,b] [--only substr] [--wait 700] [--port 5173]
 */
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i > -1 && args[i + 1] !== undefined ? args[i + 1] : d; };
const DEVICES = {
  old16x9: { w: 640, h: 360, touch: true }, phone20: { w: 800, h: 360, touch: true }, long21: { w: 840, h: 360, touch: true },
  phone195: { w: 780, h: 360, touch: true }, tablet43: { w: 1024, h: 768, touch: true }, desktop: { w: 1280, h: 720, touch: false },
};
const devArg = opt('--devices', 'all');
const devices = devArg === 'all' ? Object.keys(DEVICES) : devArg.split(',');
const only = opt('--only', '');
const waitMs = +opt('--wait', 700);
const port = +opt('--port', 5173);
const base = `http://127.0.0.1:${port}/`;

const SCENES = [
  'lookdev&t=3', 'arena&t=2', 'movement&touch=1', 'character', 'weapons', 'combat&touch=1', 'forge&touch=1&stance=1&placed=1',
  'forge&touch=1&pick=1&level=3', 'fx', 'audition', 'transition&t=0.15',
  'ui-menu&screen=title&t=1', 'ui-menu&screen=menu&t=1', 'ui-menu&screen=settings&t=1', 'ui-menu&screen=online&code=ABCD',
  'ui-settings&tab=gfx', 'ui-settings&tab=audio', 'ui-settings&tab=controls', 'ui-settings&tab=view', 'ui-settings&tab=profile',
  'ui-armory&sel=kiem_tho&t=1', 'ui-armory&sel=bua_ren&t=1',
  'hud&feed=1&touch=1', 'hud&score=1&touch=1', 'hud&pause=1&touch=1',
  'training&touch=1&t=1', 'net&cage=0&touch=1&settle=2500', 'net&touch=1&settle=2500',
  'net&cage=0&preview=result&settle=2500', 'net&cage=0&preview=end&settle=2500',
].filter((s) => s.includes(only));

const reachable = async (u) => { try { const r = await fetch(u, { signal: AbortSignal.timeout(1500) }); return r.status < 500; } catch { return false; } };
async function pwLoad() {
  try { return await import('playwright'); } catch {}
  return createRequire(path.join(execSync('npm root -g').toString().trim(), 'noop.js'))('playwright');
}
let server = null;
if (!(await reachable(base))) {
  server = spawn('npm', ['run', 'dev', '-w', 'client', '--', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  for (let i = 0; i < 150 && !(await reachable(base)); i++) await new Promise((r) => setTimeout(r, 400));
}
const pw = await pwLoad();
const browser = await pw.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });

/** Runs in the page. Returns fit problems. */
function fitCheck() {
  const W = innerWidth, H = innerHeight, out = [];
  const els = [...document.body.querySelectorAll('*')].filter((e) => !(e instanceof HTMLCanvasElement) && !(e instanceof SVGElement));
  const label = (e) => ((e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '')) || e.tagName.toLowerCase();
  const vis = (e) => {
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false;
    for (let p = e.parentElement; p; p = p.parentElement) { const c = getComputedStyle(p); if (c.display === 'none' || +c.opacity < 0.05) return false; }
    return true;
  };
  const btns = [];
  const scrolls = (e) => { for (let p = e.parentElement; p; p = p.parentElement) { const c = getComputedStyle(p); if (/(auto|scroll)/.test(c.overflowY + c.overflowX) && (p.scrollHeight > p.clientHeight || p.scrollWidth > p.clientWidth)) return true; } return false; };
  for (const e of els) {
    if (!vis(e)) continue;
    const r = e.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const hasText = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if ((hasText || e.matches('button,[role=button],input')) && !scrolls(e) && (r.left < -2 || r.top < -2 || r.right > W + 2 || r.bottom > H + 2))
      out.push(`outside ${label(e)} [${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}]`);
    if (hasText) {
      const cs = getComputedStyle(e);
      if ((e.scrollWidth > e.clientWidth + 2 && cs.overflowX !== 'visible') || (e.scrollHeight > e.clientHeight + 2 && cs.overflowY !== 'visible' && cs.overflowY !== 'auto' && cs.overflowY !== 'scroll'))
        out.push(`clipped ${label(e)} ${e.scrollWidth}x${e.scrollHeight} in ${e.clientWidth}x${e.clientHeight} "${e.textContent.trim().slice(0, 24)}"`);
    }
    if (e.matches('button,[role=button]')) btns.push({ e, r });
  }
  for (let i = 0; i < btns.length; i++) for (let j = i + 1; j < btns.length; j++) {
    const a = btns[i], b = btns[j];
    if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
    const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    if (w > 6 && h > 6) out.push(`overlap ${label(a.e)} x ${label(b.e)} ${Math.round(w)}x${Math.round(h)}`);
  }
  return out.slice(0, 12);
}

const rows = [];
for (const sc of SCENES) for (const id of devices) {
  const d = DEVICES[id];
  const ctx = await browser.newContext({ viewport: { width: d.w, height: d.h }, hasTouch: d.touch, isMobile: d.touch });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error' && !/WebSocket|ERR_CONNECTION|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text().slice(0, 160)); });
  const t0 = Date.now();
  let ready = false, stats = null, fit = [];
  try {
    await page.goto(`${base}?scene=${sc}&nogate=1&shot=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 40000 });
    ready = true;
    await page.waitForTimeout(waitMs);
    stats = await page.evaluate(() => window.__stats ?? null);
    fit = await page.evaluate(fitCheck);
  } catch (e) { errors.push('harness: ' + e.message.split('\n')[0]); }
  rows.push({ scene: sc, dev: id, ready, readyMs: Date.now() - t0, stats, errors, fit });
  const bad = !ready || errors.length || fit.length;
  console.log(`${bad ? 'BAD ' : 'ok  '} ${sc.padEnd(40)} ${id.padEnd(9)} ${stats ? `calls=${stats.calls} tris=${stats.tris} prog=${stats.programs}` : ''}${errors.length ? '\n     ' + errors.join('\n     ') : ''}${fit.length ? '\n     fit: ' + fit.join('\n          ') : ''}`);
  await ctx.close();
}
fs.writeFileSync(path.join(root, 'shots', 'sweep.json'), JSON.stringify(rows, null, 1));
await browser.close();
if (server) server.kill('SIGTERM');
const nb = rows.filter((r) => !r.ready || r.errors.length || r.fit.length).length;
console.log(`\n${rows.length} runs, ${nb} flagged`);
process.exit(0);
