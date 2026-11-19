// Download the CC0 source packs listed in sources.json into audio-src/<id>/ (git-ignored) and extract them.
// Usage: node tools/audio/fetch.mjs [id…]        (no ids = all; already present = skipped)
// .7z needs `7z`/`7za` or python `py7zr`; .zip needs `unzip`.
import { readFileSync, mkdirSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const out = join(root, 'audio-src');
const { sources } = JSON.parse(readFileSync(join(here, 'sources.json'), 'utf8'));
const want = new Set(process.argv.slice(2));

function has(cmd) { try { execFileSync(cmd, ['--help'], { stdio: 'ignore' }); return true; } catch { return false; } }
function extract(file, dir) {
  if (/\.zip$/i.test(file)) execFileSync('unzip', ['-q', '-o', file, '-d', dir]);
  else if (/\.7z$/i.test(file)) {
    const z = ['7z', '7za', '7zr'].find(has);
    if (z) execFileSync(z, ['x', '-y', `-o${dir}`, file], { stdio: 'ignore' });
    else execFileSync('python3', ['-I', '-c', 'import sys,py7zr; py7zr.SevenZipFile(sys.argv[1]).extractall(sys.argv[2])', file, dir]);
  }
}
let fail = 0;
for (const s of sources) {
  if (want.size && !want.has(s.id)) continue;
  if (s.license !== 'CC0') { console.log(`skip ${s.id}: license ${s.license}`); continue; }
  const dir = join(out, s.id);
  const urls = s.urls ?? (s.url ? [s.url] : []);
  if (!urls.length) { console.log(`manual ${s.id}: put files in ${dir}`); continue; }
  if (existsSync(dir) && readdirSync(dir).length) { console.log(`have ${s.id}`); continue; }
  mkdirSync(dir, { recursive: true });
  try {
    for (const url of urls) {
      const res = await fetch(url, { headers: { 'user-agent': 'while-its-hot-audio-fetch/1' } });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      const file = join(dir, decodeURIComponent(basename(new URL(url).pathname)));
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      extract(file, dir);
    }
    console.log(`ok   ${s.id}`);
  } catch (e) { fail++; console.log(`FAIL ${s.id}: ${e.message}`); }
}
process.exit(fail ? 1 : 0);
