#!/usr/bin/env node
/* leak.mjs — phase-19: cycle scenes through the Director and watch GPU resource counts + JS heap.
 *   node tools/leak.mjs [--cycles 4] [--port 5173] [--scenes a,b,c]
 * Each scene is entered with `app.load()` (no wipe), left for ~1 s, then the next one. After every full cycle we
 * force a GC and print geometries / textures / programs / heap MB. A leak shows as a count that keeps climbing
 * from cycle 2 on. Exit 1 if cycle N is more than 5% heavier than cycle 2 (heap) or any GPU count grew.
 */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i > -1 && args[i + 1] !== undefined ? args[i + 1] : d; };
const cycles = +opt('--cycles', 4);
const port = +opt('--port', 5173);
const scenes = opt('--scenes', 'ui-menu,arena,combat,forge,training,net,ui-armory,fx').split(',');
let pw;
try { pw = await import('playwright'); } catch { pw = createRequire(path.join(execSync('npm root -g').toString().trim(), 'noop.js'))('playwright'); }
const browser = await pw.chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--expose-gc', '--enable-precise-memory-info'],
});
const ctx = await browser.newContext({ viewport: { width: 800, height: 360 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));
await page.goto(`http://127.0.0.1:${port}/?scene=ui-menu&nogate=1&shot=1&touch=1`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 40000 });

const snap = async () => {
  await page.evaluate(() => { window.gc?.(); });
  await page.waitForTimeout(250);
  return page.evaluate(() => ({ ...window.__stats, heap: Math.round(performance.memory.usedJSHeapSize / 1048576), dom: document.getElementsByTagName('*').length }));
};
const rows = [];
for (let c = 1; c <= cycles; c++) {
  for (const s of scenes) {
    const extra = s === 'net' ? { cage: '0', bots: '2' } : {};
    try {
      await page.evaluate(async ([n, e]) => { await window.__app.load(n, e); }, [s, extra]);
      await page.waitForTimeout(900);
    } catch (e) { errors.push(`${s}: ${e.message.split('\n')[0]}`); }
  }
  await page.evaluate(async () => { await window.__app.load('ui-menu', { screen: 'menu' }); });
  await page.waitForTimeout(800);
  const m = await snap();
  rows.push(m);
  console.log(`cycle ${c}: geos=${m.geos} textures=${m.textures} programs=${m.programs} heap=${m.heap}MB dom=${m.dom}`);
}
let bad = false;
if (rows.length >= 3) {
  const a = rows[1], z = rows[rows.length - 1];
  if (z.geos > a.geos || z.textures > a.textures || z.programs > a.programs) { bad = true; console.log('LEAK: GPU resource counts grew'); }
  if (z.heap > a.heap * 1.05 + 2) { bad = true; console.log(`LEAK: heap ${a.heap} -> ${z.heap} MB`); }
  if (z.dom > a.dom + 20) { bad = true; console.log(`LEAK: DOM nodes ${a.dom} -> ${z.dom}`); }
}
if (errors.length) { bad = true; console.log('errors:\n  ' + errors.slice(0, 8).join('\n  ')); }
console.log(bad ? 'FAIL' : 'ok');
await browser.close();
process.exit(bad ? 1 : 0);
