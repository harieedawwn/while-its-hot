import { describe, expect, it } from 'vitest';
import { BALANCE } from '../balance';
import { AnvilRule } from './anvil-rule';
import { baseOdds, heatBand, NO_MODS, type Outcome, oddsFor, rollOutcome } from './odds';
import { ForgeSession, moduleSlots } from './session';

const sum = (o: { tuyet: number; dat: number; giu: number; hong: number }) => o.tuyet + o.dat + o.giu + o.hong;
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const seq = (...v: number[]) => { let i = 0; return () => v[i++ % v.length]; };

describe('odds table (GDD §6)', () => {
  it('matches the four level rows', () => {
    expect(baseOdds(0)).toEqual({ tuyet: 12, dat: 55, giu: 18, hong: 15 });
    expect(baseOdds(4)).toEqual({ tuyet: 12, dat: 55, giu: 18, hong: 15 });
    expect(baseOdds(5)).toEqual({ tuyet: 6, dat: 38, giu: 20, hong: 36 });
    expect(baseOdds(12)).toEqual({ tuyet: 4, dat: 25, giu: 22, hong: 49 });
    expect(baseOdds(19)).toEqual({ tuyet: 2, dat: 16, giu: 22, hong: 60 });
  });
  it('heat bands', () => {
    expect([0.1, 0.3, 0.5, 0.9, 0.95].map(heatBand)).toEqual(['cold', 'dull', 'forging', 'forging', 'burning']);
  });
  it('heat moves 20 / 8 / 0 / 10 points to Hỏng', () => {
    const at = (heat: number) => oddsFor({ level: 0, target: 'blade', heat, timing: 'auto' }).hong;
    expect(at(0.1)).toBeCloseTo(35); expect(at(0.3)).toBeCloseTo(23); expect(at(0.7)).toBeCloseTo(15); expect(at(0.95)).toBeCloseTo(25);
  });
  it('perfect timing: 15 points Hỏng → Đạt/Tuyệt 2:1; a miss moves 15 to Hỏng', () => {
    const p = oddsFor({ level: 5, target: 'blade', heat: 0.7, timing: 'perfect' });
    expect(p.hong).toBeCloseTo(21); expect(p.dat).toBeCloseTo(48); expect(p.tuyet).toBeCloseTo(11);
    const m = oddsFor({ level: 5, target: 'blade', heat: 0.7, timing: 'miss' });
    expect(m.hong).toBeCloseTo(51); expect(sum(m)).toBeCloseTo(100);
  });
  it('perfect cannot move more than the Hỏng that is there', () => {
    const p = oddsFor({ level: 0, target: 'blade', heat: 0.7, timing: 'perfect' });
    expect(p.hong).toBeCloseTo(0); expect(sum(p)).toBeCloseTo(100);
  });
  it('armor looks up level × 2', () => {
    const a = oddsFor({ level: 3, target: 'armor', heat: 0.7, timing: 'auto' });
    expect(a).toEqual(baseOdds(6));
    expect(oddsFor({ level: 10, target: 'armor', heat: 0.7, timing: 'auto' })).toEqual(baseOdds(19));
  });
  it('passive, notoriety and mercy hooks', () => {
    const n = oddsFor({ level: 0, target: 'blade', heat: 0.7, timing: 'auto', mods: { ...NO_MODS, notoriety: 2 } });
    expect(n.dat).toBeCloseTo(43); expect(n.hong).toBeCloseTo(27);
    const m = oddsFor({ level: 5, target: 'blade', heat: 0.7, timing: 'auto', mods: { ...NO_MODS, mercy: 10 } });
    expect(m.hong).toBeCloseTo(26); expect(m.giu).toBeCloseTo(30);
  });
  it('every combination sums to 100 and never goes negative', () => {
    for (let lv = 0; lv <= 19; lv += 3) for (const heat of [0, 0.3, 0.7, 1]) for (const timing of ['perfect', 'miss', 'auto'] as const) {
      const o = oddsFor({ level: lv, target: 'blade', heat, timing, mods: { ...NO_MODS, notoriety: 3, mercy: 40 } });
      expect(sum(o)).toBeCloseTo(100);
      for (const v of [o.tuyet, o.dat, o.giu, o.hong]) expect(v).toBeGreaterThanOrEqual(-1e-9);
    }
  });
});

describe('distributions', () => {
  const cases: [string, number, number, 'perfect' | 'miss' | 'auto'][] = [
    ['lvl0 forging heat', 0, 0.7, 'auto'], ['lvl7 cold miss', 7, 0.1, 'miss'], ['lvl12 perfect', 12, 0.7, 'perfect'], ['lvl17 burning', 17, 0.97, 'auto'],
  ];
  for (const [name, lv, heat, timing] of cases) {
    it(`10k rolls within ±2% of the odds: ${name}`, () => {
      const o = oddsFor({ level: lv, target: 'blade', heat, timing }), r = rng(lv * 7 + 3);
      const n = 10000, got: Record<Outcome, number> = { tuyet: 0, dat: 0, giu: 0, hong: 0 };
      for (let i = 0; i < n; i++) got[rollOutcome(o, r())]++;
      for (const k of ['tuyet', 'dat', 'giu', 'hong'] as const) expect(Math.abs((got[k] / n) * 100 - o[k])).toBeLessThan(2);
    });
  }
  it('rollOutcome boundaries', () => {
    const o = { tuyet: 15, dat: 60, giu: 15, hong: 10 };
    expect([0, 0.149, 0.15, 0.749, 0.75, 0.899, 0.9, 0.999].map((r) => rollOutcome(o, r))).toEqual(['tuyet', 'tuyet', 'dat', 'dat', 'giu', 'giu', 'hong', 'hong']);
  });
});

/** A session whose rolls are scripted: zone is the first value, then one roll per strike. */
function session(...rolls: number[]) {
  const s = new ForgeSession(seq(0.5, ...rolls));
  s.heat = 0.7; s.ring = 0.5; // marker on the zone
  return s;
}
describe('ForgeSession', () => {
  it('Tuyệt +2, Đạt +1, Giữ 0, Hỏng −1; remembers the highest level', () => {
    const s = session(0.0, 0.0, 0.0, 0.0, 0.0);
    s.blade.level = 5; s.blade.best = 5; s.blade.family = 'kiem';
    expect(s.strike('auto').delta).toBe(2); expect(s.blade.level).toBe(7);
    s.cooldown = 0; s.blade.level = 7;
    const hong = new ForgeSession(seq(0.5, 0.999)); hong.heat = 0.7; hong.blade.level = 8; hong.blade.best = 8;
    expect(hong.strike('auto').outcome).toBe('hong'); expect(hong.blade.level).toBe(7); expect(hong.blade.best).toBe(8);
  });
  it('Hỏng at level 0 breaks the blade; armor never breaks; frenzy turns Hỏng into Giữ', () => {
    const s = new ForgeSession(seq(0.5, 0.999)); s.heat = 0.7;
    s.blades[0] = { family: 'bua', level: 0, best: 9 };
    const r = s.strike('auto');
    expect(r.broke).toBe(true); expect(s.blade).toEqual({ family: null, level: 0, best: 0 });
    const a = new ForgeSession(seq(0.5, 0.999)); a.heat = 0.7; a.target = 'armor';
    expect(a.strike('auto').broke).toBe(false); expect(a.armor).toBe(0);
    const f = new ForgeSession(seq(0.5, 0.999)); f.heat = 0.7; f.frenzyT = 3;
    expect(f.strike('auto').outcome).toBe('giu');
  });
  it('+3 opens the family pick, blocks strikes until chosen, then the form changes', () => {
    const s = session(0.0);
    s.blade.level = 2; s.blade.best = 2;
    const r = s.strike('auto');
    expect(r.pick).toBe(true); expect(s.pendingPick).toBe(0); expect(s.canStrike).toBe(false);
    expect(s.form.id).toBe('phoi');
    expect(s.pickFamily('bua')?.id).toBe('bua_ren'); expect(s.pendingPick).toBeNull();
    expect(s.lastFamily).toBe('bua');
  });
  it('form swaps on milestones and never goes back', () => {
    const s = session(0.0, 0.0);
    s.blades[0] = { family: 'kiem', level: 5, best: 5 };
    const r = s.strike('auto');
    expect(r.evolved?.id).toBe('kiem_thep'); expect(s.level).toBe(7);
    s.blade.level = 4; // fell back, form stays
    expect(s.form.id).toBe('kiem_thep');
  });
  it('training cap refuses gains with no level change', () => {
    const s = session(0.0); s.caps = { kiem: 6, bua: 3, thuong: 3 };
    s.blades[0] = { family: 'kiem', level: 6, best: 6 };
    const r = s.strike('auto');
    expect(r.refused).toBe(true); expect(s.blade.level).toBe(6);
  });
  it('max level 20 for blades and 10 for armor', () => {
    const s = session(0.0, 0.0, 0.0, 0.0); s.blades[0] = { family: 'kiem', level: 20, best: 20 };
    expect(s.strike('auto').refused).toBe(true);
    s.cooldown = 0; s.target = 'armor'; s.armor = 10;
    expect(s.strike('auto').refused).toBe(true); expect(s.armor).toBe(10);
  });
  it('frenzy meter: +1 Đạt, +2 Tuyệt, full at 12, activation gives 3.5 s of 2× auto-strikes', () => {
    const s = new ForgeSession(rng(5)); s.heat = 0.7; s.blades[0] = { family: 'kiem', level: 3, best: 3 };
    s.frenzyMeter = 11;
    expect(s.activateFrenzy()).toBe(false);
    s.frenzyMeter = 12; expect(s.activateFrenzy()).toBe(true);
    expect(s.frenzyMeter).toBe(0);
    let n = 0;
    for (let t = 0; t < 4.5; t += 1 / 60) { s.heat = 0.7; n += s.tick(1 / 60, false).length; }
    expect(n).toBeGreaterThanOrEqual(13); expect(n).toBeLessThanOrEqual(15);
    expect(s.frenzy).toBe(false);
  });
  it('heat: +0.55/s held, −0.05/s decay, −0.12 per strike, cadence 0.5 s', () => {
    const s = new ForgeSession(rng(1));
    for (let i = 0; i < 60; i++) s.tick(1 / 60, true);
    expect(s.heat).toBeCloseTo(0.55, 2);
    for (let i = 0; i < 60; i++) s.tick(1 / 60, false);
    expect(s.heat).toBeCloseTo(0.5, 2);
    s.strike('miss'); expect(s.heat).toBeCloseTo(0.38, 2); expect(s.canStrike).toBe(false);
    for (let i = 0; i < 31; i++) s.tick(1 / 60, false);
    expect(s.canStrike).toBe(true);
    s.onHitOut(); expect(s.heat).toBeLessThan(0.2);
  });
  it('ring timing: perfect only inside the 18% zone', () => {
    const s = session(); s.zoneC = 0.5;
    s.ring = 0.5 + 0.089; expect(s.timingNow()).toBe('perfect');
    s.ring = 0.5 + 0.092; expect(s.timingNow()).toBe('miss');
    s.zoneC = 0.02; s.ring = 0.97; expect(s.timingNow()).toBe('perfect'); // wraps
  });
  it('two blade slots swap; module slots open at armor +3 and +7', () => {
    const s = session(); s.blade.level = 4; s.swapSlot(); expect(s.blade.level).toBe(0); s.swapSlot(); expect(s.blade.level).toBe(4);
    expect([0, 2, 3, 6, 7, 10].map(moduleSlots)).toEqual([0, 0, 1, 1, 2, 2]);
    expect(s.equip('khien_tay')).toBe(false); s.armor = 3; expect(s.equip('khien_tay')).toBe(true); expect(s.equip('no_vai')).toBe(false);
  });
});

describe('AnvilRule', () => {
  it('place 0.6 s, lift 0.6 s, then a 5 s cooldown', () => {
    const a = new AnvilRule();
    expect(a.place()).toBe(true); expect(a.usable).toBe(false);
    expect(a.tick(0.5)).toBeNull(); expect(a.tick(0.11)).toBe('placed'); expect(a.usable).toBe(true);
    expect(a.lift()).toBe(true); expect(a.tick(0.61)).toBe('carried');
    expect(a.place()).toBe(false);
    a.tick(BALANCE.forge.anvil.cooldownS - 0.1); expect(a.canPlace).toBe(false);
    a.tick(0.2); expect(a.canPlace).toBe(true);
  });
  it('Đe nhẹ places and lifts instantly with no cooldown', () => {
    const a = new AnvilRule(); a.instant = true;
    a.place(); expect(a.usable).toBe(true); a.lift(); expect(a.canPlace).toBe(true);
  });
});
