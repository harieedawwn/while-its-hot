// Forge balance sim: node tools/forge-sim.mjs [--n 3000] [--secs 120] [--armor] [--nofrenzy]
// Plays the real ForgeSession (ROUND3 §1) with scripted smiths. A smith sees where the zone is `react` s after it jumped, waits
// for the marker to reach its centre and presses with gaussian timing noise `sigma` s. "blind" taps 7 times a second.
// Prints: Nhập thần from +10 (the ROUND3 targets), then level by time for normal forging (blade, armor).
import { build } from 'esbuild';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(tmpdir(), 'wih-forgesim.mjs');
await build({ stdin: { contents: "export { ForgeSession, BALANCE, phaseAt } from './shared/src/index.ts';", resolveDir: root, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error' });
const { ForgeSession, BALANCE, phaseAt } = await import(pathToFileURL(out).href);
const a = process.argv.slice(2), opt = (k, d) => { const i = a.indexOf('--' + k); return i < 0 ? d : +a[i + 1]; };
const N = opt('n', 3000), SECS = opt('secs', 120), NOFRENZY = a.includes('--nofrenzy');
let seed = 12345; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());

/** Smith models. react = s to notice a new zone, sigma = timing noise (s), gap = min s between presses. */
const SMITHS = {
  blind: { blind: true },
  careless: { react: 0.35, sigma: 0.16, gap: 0.2 },
  semi: { react: 0.28, sigma: 0.10, gap: 0.18 },
  solid: { react: 0.2, sigma: 0.07, gap: 0.15 },
  expert: { react: 0.07, sigma: 0.04, gap: 0.12 },
};

function play(m, { level = 0, armor = false, secs, frenzyOnly = false }) {
  const s = new ForgeSession(rand); s.heat = 0.7; s.caps = null; if (armor) { s.target = 'armor'; s.armor = level; } else s.blades[0] = { family: 'kiem', level, best: level };
  if (frenzyOnly) { s.frenzyMeter = BALANCE.forge.frenzy.full; }
  const dt = 0.01, end = secs; let t = 0, press = null, lastPress = -9, zoneSeen = -1, zk = -1, lastLap = s.ring.lap, strikes = 0, vo = 0, lens = 0;
  const lv = () => (armor ? s.armor : s.blade.level);
  const start = lv();
  if (frenzyOnly) { s.setTime(0); s.activateFrenzy(0); }
  while (t < end) {
    s.setTime(t);
    const heating = !s.frenzy && s.heat < 0.62;
    s.tick(dt, heating);
    if (s.pendingPick !== null) s.pickFamily('kiem');
    if (!frenzyOnly && !NOFRENZY && s.frenzyMeter >= BALANCE.forge.frenzy.full && !s.frenzy && !m.blind) s.activateFrenzy(t);
    const ready = s.heat >= 0.5 || s.frenzy;
    if (m.blind) {
      if (ready && t - lastPress >= 1 / 7) { const r = s.strike(t); lastPress = t; strikes++; if (r.outcome === 'vo') vo++; if (r.outcome === 'len') lens++; }
    } else {
      if (s.zoneK !== zk || s.ring.lap !== lastLap) { zk = s.zoneK; lastLap = s.ring.lap; zoneSeen = t + (zk === 0 && t === 0 ? 0 : m.react); press = null; }
      if (press === null && ready && t >= zoneSeen && t - lastPress >= m.gap) {
        const d = ((s.zoneC - phaseAt(s.ring, t)) % 1 + 1) % 1;
        press = Math.max(t, t + d * s.ring.lap + gauss() * m.sigma);
      }
      if (press !== null && t >= press) {
        const r = s.strike(t); press = null; lastPress = t; strikes++; if (r.outcome === 'vo') vo++; if (r.outcome === 'len') lens++;
        if (r.outcome === 'vo' || r.outcome === 'giu' || true) zoneSeen = t + (r.timing === 'hit' ? m.react : 0);
      }
    }
    t += dt;
  }
  return { gain: lv() - start, level: lv(), strikes, vo, lens };
}
const CHECK = [15, 30, 45, 90, 150];
const pct = (v, q) => v[Math.floor(q * (v.length - 1))];
const stat = (rs, k) => { const v = rs.map((r) => r[k]).sort((x, y) => x - y); return `${pct(v, 0.1)}/${pct(v, 0.5)}/${pct(v, 0.9)}`; };

console.log('== Nhập thần from +10 (4 s, meter full): level gained, mean · p10/p50/p90 · share ≥ +7 ==');
for (const [name, m] of Object.entries(SMITHS)) {
  const rs = Array.from({ length: N }, () => play(m, { level: 10, secs: BALANCE.forge.frenzy.durS - 0.001, frenzyOnly: true }));
  const mean = rs.reduce((x, r) => x + r.gain, 0) / N, hi = rs.filter((r) => r.gain >= 7).length / N;
  console.log(`  ${name.padEnd(9)} mean ${mean.toFixed(2).padStart(6)} · ${stat(rs, 'gain')} · ≥+7 ${(hi * 100).toFixed(0)}% · taps ${(rs.reduce((x, r) => x + r.strikes, 0) / N).toFixed(1)}`);
}
for (const armor of a.includes('--armor') ? [true] : [false, true]) {
  console.log(`\n== normal forging, ${armor ? 'ARMOR (0..10)' : 'BLADE (0..' + BALANCE.weapons.maxLevel + ')'} · level p10/p50/p90 after ${CHECK.join('/')} s at the anvil, from +0 ==`);
  for (const [name, m] of Object.entries(SMITHS)) {
    const cps = CHECK.map((c) => { const rs = Array.from({ length: Math.min(N, 800) }, () => play(m, { armor, secs: c })); return `${c}s ${stat(rs, 'level')}`; });
    console.log(`  ${name.padEnd(9)} ${cps.join(' · ')}`);
  }
}

// Rounds to the top form: ANVIL s at the anvil per round (rest = fighting), then carry loss 2 per round (BALANCE.match.carry.bladeLoss x1 death).
if (!a.includes('--armor')) {
  const ANVIL = opt('anvil', 60), top = BALANCE.weapons.maxLevel, loss = BALANCE.match.carry.bladeLoss;
  console.log(`\n== rounds to the top form (+${top}) · ${ANVIL} s at the anvil per round, carry loss ${loss}/round · p10/p50/p90 (>12 = not reached) ==`);
  for (const [name, m] of Object.entries(SMITHS)) {
    const rs = Array.from({ length: Math.min(N, 300) }, () => { let lv = 0; for (let r = 1; r <= 12; r++) { lv = play(m, { level: lv, secs: ANVIL }).level; if (lv >= top) return { r }; lv = Math.max(0, lv - loss); } return { r: 13 }; });
    console.log(`  ${name.padEnd(9)} ${stat(rs, 'r')}`);
  }
}
