#!/usr/bin/env node
/* aobake.mjs — bake the static vertex AO for the foundry and the menu smithy into client/public/ao/*.bin.
 * Re-run after changing any static geometry in world/foundry/* or world/smithy.ts (the game warns in dev when a file is
 * stale and falls back to computing at load, which is slow on phones).   node tools/aobake.mjs [--port 5173]
 */
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const port = +(args[args.indexOf('--port') + 1] || 5173);
const base = `http://127.0.0.1:${port}/`;
const reachable = async () => { try { return (await fetch(base, { signal: AbortSignal.timeout(1500) })).status < 500; } catch { return false; } };
let server = null;
if (!(await reachable())) {
  server = spawn('npm', ['run', 'dev', '-w', 'client', '--', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  for (let i = 0; i < 150 && !(await reachable()); i++) await new Promise((r) => setTimeout(r, 400));
}
let pw;
try { pw = await import('playwright'); } catch { pw = createRequire(path.join(execSync('npm root -g').toString().trim(), 'noop.js'))('playwright'); }
const browser = await pw.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const out = path.join(root, 'client', 'public', 'ao');
fs.mkdirSync(out, { recursive: true });
let fail = false;
for (const [scene, key] of [['arena', 'foundry'], ['ui-menu', 'smithy']]) {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  await page.goto(`${base}?scene=${scene}&aobake=1&nogate=1&shot=1&t=1`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  const b64 = await page.evaluate((k) => window.__aoBake?.[k] ?? null, key);
  if (!b64) { console.error(`no bake produced for ${key}`); fail = true; } else {
    const buf = Buffer.from(b64, 'base64');
    fs.writeFileSync(path.join(out, `${key}.bin`), buf);
    console.log(`${key}.bin  ${buf.length} bytes`);
  }
  await page.close();
}
await browser.close();
if (server) server.kill('SIGTERM');
process.exit(fail ? 1 : 0);
