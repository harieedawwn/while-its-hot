// Forge balance sim: node tools/forge-sim.mjs [--n 4000] [--secs 120] [--blade|--armor]
// Plays ForgeSession with a scripted smith (heats to the band, strikes with perfect-timing probability p, uses frenzy).
// Prints EV per level band, level reached after N seconds, and time to milestone levels, for 3 skill levels.
import { build } from 'esbuild';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(tmpdir(), 'wih-forgesim.mjs');
await build({ stdin: { contents: "export { ForgeSession, oddsFor, BALANCE } from './shared/src/index.ts';", resolveDir: root, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const { ForgeSession, oddsFor, BALANCE } = await import(pathToFileURL(out).href);
const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf('--' + k); return i < 0 ? d : +a[i + 1]; };
const N = opt('n', 4000), SECS = opt('secs', 120);
let seed = 12345; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/** One smith forging a blade for `secs`; returns {level trace, time at levels, breaks}. */
function run(p, secs, armor) {
  const s = new ForgeSession(rand); if (armor) s.target = 'armor';
  s.caps = null; const dt = 0.02, at = {}, cp = {}; let t = 0, breaks = 0, strikes = 0, nextStrike = 0;
  while (t < secs) {
    if (s.pendingPick !== null) s.pickFamily('kiem');
    const heating = s.heat < 0.62;
    const res = s.tick(dt, heating && !s.frenzy);
    for (const r of res) { strikes++; if (r.broke) breaks++; }
    if (s.frenzyMeter >= BALANCE.forge.frenzy.full && !s.frenzy && !a.includes("--nofrenzy") && rand() < 0.9) s.activateFrenzy();
    if (!s.frenzy && !heating && s.canStrike && t >= nextStrike && s.heat >= 0.5) {
      // a smith with accuracy p lands the marker in the zone with probability p
      const r = s.strike(rand() < p ? 'perfect' : 'miss'); strikes++; if (r.broke) breaks++;
      nextStrike = t + BALANCE.forge.strike.cadenceS + 0.15;
    }
    t += dt;
    const lv = armor ? s.armor : s.blade.best;
    for (const c of CHECK) if (cp[c] === undefined && t >= c) cp[c] = armor ? s.armor : s.blade.level;
    if (at[lv] === undefined) at[lv] = t;
  }
  return { cp, level: armor ? s.armor : s.blade.level, best: armor ? s.armor : s.blade.best, at, breaks, strikes };
}

const CHECK = [30, 60, 120];
const pct = (v, q) => v[Math.floor(q * (v.length - 1))];
for (const armor of a.includes('--armor') ? [true] : [false, true]) {
  console.log(`\n== ${armor ? 'ARMOR (0..10)' : 'BLADE (0..20)'} ==`);
  console.log('EV (levels per strike) at forging heat, by level, perfect / miss:');
  const row = [];
  for (const l of armor ? [0, 2, 4, 6, 8, 9] : [0, 4, 7, 12, 17, 19]) {
    const ev = (t) => { const o = oddsFor({ level: l, target: armor ? 'armor' : 'blade', heat: 0.7, timing: t }); return (2 * o.tuyet + o.dat - o.hong) / 100; };
    const br = oddsFor({ level: 0, target: 'blade', heat: 0.7, timing: 'miss' }).hong;
    row.push(`L${l}: ${ev('perfect').toFixed(2)} / ${ev('miss').toFixed(2)}`);
    if (l === 0 && !armor) row.push(`(Gãy at L0 on a miss: ${br.toFixed(0)}%)`);
  }
  console.log('  ' + row.join(' | '));
  for (const p of [0.35, 0.6, 0.85]) {
    const rs = Array.from({ length: N }, () => run(p, SECS, armor));
    const lv = rs.map((r) => r.best).sort((x, y) => x - y);
    const cps = CHECK.map((c) => { const v = rs.map((r) => r.cp[c] ?? r.level).sort((x, y) => x - y); return `${c}s ${pct(v, 0.1)}/${pct(v, 0.5)}/${pct(v, 0.9)}`; }).join(' · ');
    const ms = (L) => { const ts = rs.map((r) => r.at[L]).filter((x) => x !== undefined).sort((x, y) => x - y); return ts.length ? `${pct(ts, 0.5).toFixed(0)}s (${Math.round((100 * ts.length) / N)}% reach)` : '-'; };
    const goals = armor ? [3, 5, 8, 10] : [3, 6, 10, 14, 18];
    console.log(`skill ${Math.round(p * 100)}%: after ${SECS}s best level p10/p50/p90 = ${pct(lv, 0.1)}/${pct(lv, 0.5)}/${pct(lv, 0.9)} · Gãy/run ${(rs.reduce((x, r) => x + r.breaks, 0) / N).toFixed(2)} · strikes ${Math.round(rs.reduce((x, r) => x + r.strikes, 0) / N)}`);
    console.log('   current level p10/p50/p90 at ' + cps);
    console.log('   median time to: ' + goals.map((L) => `+${L} ${ms(L)}`).join(' · '));
  }
}
