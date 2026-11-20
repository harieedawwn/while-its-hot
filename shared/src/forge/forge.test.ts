import { describe, expect, it } from 'vitest';
import { BALANCE } from '../balance';
import { AnvilRule } from './anvil-rule';
import { frenzyZone, heatBand, heatZoneMul, NO_MODS, pLen, zoneFrac } from './odds';
import { hash01, phaseAt, ringDist, zoneAfter } from './ring';
import { ForgeSession, moduleSlots } from './session';
import { applyForgeSync, forgeSync } from './sync';

const F = BALANCE.forge;
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** A session at forging heat with the zone parked at 0.5 (marker 0.5 at t = 0.75 s: phase = t / 1.5). */
function session(rand: () => number = rng(7), level = 0): ForgeSession {
  const s = new ForgeSession(rand, 1234); s.heat = 0.7; s.zoneC = 0.5; s.blades[0] = { family: 'kiem', level, best: level }; return s;
}
const T_HIT = 0.75, T_MISS = 0.0;
/** Park the zone under the marker at time t (a perfect timing), return t. */
const hit = (s: ForgeSession, t: number): number => { s.zoneC = phaseAt(s.ring, t); return t; };

describe('curves (ROUND3 §1)', () => {
  it('p(L) 0.75 at +0 falling linearly to 0.38 at +44; zone 0.22 → 0.10', () => {
    expect(pLen(0)).toBeCloseTo(0.75); expect(pLen(44)).toBeCloseTo(0.38); expect(pLen(22)).toBeCloseTo(0.565);
    expect(zoneFrac(0)).toBeCloseTo(0.22); expect(zoneFrac(44)).toBeCloseTo(0.10);
    expect(BALANCE.weapons.maxLevel).toBe(51);
  });
  it('heat bands: forging = full zone, dull ×0.8, cold or burning ×0.6', () => {
    expect([0.1, 0.3, 0.5, 0.9, 0.95].map(heatBand)).toEqual(['cold', 'dull', 'forging', 'forging', 'burning']);
    expect([0.1, 0.3, 0.7, 0.95].map(heatZoneMul)).toEqual([0.6, 0.8, 1, 0.6]);
  });
  it('armor stretches 0..10 over the same curves', () => {
    expect(pLen(0, 'armor')).toBeCloseTo(0.75); expect(pLen(10, 'armor')).toBeCloseTo(0.38);
  });
  it('frenzy zone: half the ring until 2.4 s, then shrinks linearly to 0.12 at 4 s', () => {
    expect(frenzyZone(0)).toBe(0.5); expect(frenzyZone(2.4)).toBe(0.5);
    expect(frenzyZone(3.2)).toBeCloseTo(0.31); expect(frenzyZone(4)).toBeCloseTo(0.12);
  });
});

describe('the ring is a function of the clock', () => {
  it('marker: one lap per 1.5 s, wraps, same answer for any caller', () => {
    const b = { p0: 0, t0: 0, lap: F.ring.lapS };
    expect(phaseAt(b, 0.75)).toBeCloseTo(0.5); expect(phaseAt(b, 1.5)).toBeCloseTo(0, 6); expect(phaseAt(b, 2.25)).toBeCloseTo(0.5);
    expect(ringDist(0.02, 0.97)).toBeCloseTo(0.05);
  });
  it('the zone sequence is seeded: same seed, same zones', () => {
    expect([0, 1, 2, 3].map((k) => hash01(9, k))).toEqual([0, 1, 2, 3].map((k) => hash01(9, k)));
    expect(hash01(9, 0)).not.toBe(hash01(10, 0));
  });
  it('after a Trúng the zone is gapMin–gapMax ahead of the marker (at least half + clear) and never under it', () => {
    for (let seed = 1; seed < 400; seed++) for (const half of [0.05, 0.11, 0.25]) {
      const m = hash01(seed, 7), c = zoneAfter(m, half, seed, seed % 13), gap = (c - m + 1) % 1;
      expect(gap).toBeGreaterThanOrEqual(F.ring.gapMin - 1e-9); expect(gap).toBeLessThanOrEqual(Math.max(F.ring.gapMax, half + F.ring.clear) + 1e-9);
      expect(ringDist(m, c)).toBeGreaterThan(half);
    }
  });
});

describe('strike outcomes', () => {
  it('Trượt is always Vỡ −2 (clamped at 0): the blade is never destroyed', () => {
    const s = session(() => 0.0, 5);
    const r = s.strike(T_MISS); expect(r.timing).toBe('miss'); expect(r.outcome).toBe('vo'); expect(r.delta).toBe(-2); expect(s.blade.level).toBe(3);
    s.strike(T_MISS + 3); expect(s.blade.level).toBe(1);
    s.strike(T_MISS + 6); expect(s.blade.level).toBe(0); expect(s.blade.family).toBe('kiem');
    expect(s.strike(T_MISS + 9).delta).toBe(0); expect(s.blade.level).toBe(0);
  });
  it('Trúng is Lên +1 with chance p(L), otherwise Giữ', () => {
    const lo = session(() => 0.0, 4), hi = session(() => 0.99, 4);
    expect(lo.strike(hit(lo, T_HIT)).outcome).toBe('len'); expect(lo.blade.level).toBe(5);
    const g = hi.strike(hit(hi, T_HIT)); expect(g.outcome).toBe('giu'); expect(g.delta).toBe(0); expect(hi.blade.level).toBe(4);
  });
  it('the best level is remembered; the form never goes backwards', () => {
    const s = session(() => 0.0, 6); s.blades[0].best = 6; s.strike(T_MISS); s.strike(T_MISS + 3);
    expect(s.blade.level).toBe(2); expect(s.blade.best).toBe(6); expect(s.form.minLevel).toBeLessThanOrEqual(6);
  });
  it('strikes cost heat (0.12) except in Nhập thần; a pending family pick blocks them', () => {
    const s = session(); s.strike(T_MISS); expect(s.heat).toBeCloseTo(0.58, 6);
    s.pendingPick = 0; expect(s.canStrike).toBe(false);
  });
  it('the zone jumps only after a Trúng, a miss leaves it', () => {
    const s = session(rng(3), 4);
    s.strike(T_MISS); expect(s.zoneC).toBe(0.5);
    s.zoneC = phaseAt(s.ring, T_HIT + 3); const c2 = s.zoneC; s.strike(T_HIT + 3); expect(s.zoneC).not.toBe(c2);
    expect(s.zoneK).toBe(1);
  });
  it('max level 51 for blades and 10 for armor refuse a Lên', () => {
    const s = session(() => 0.0, 51); expect(s.strike(hit(s, T_HIT)).refused).toBe(true); expect(s.blade.level).toBe(51);
    const a = session(() => 0.0); a.target = 'armor'; a.armor = 10; expect(a.strike(hit(a, T_HIT)).refused).toBe(true); expect(a.armor).toBe(10);
  });
  it('family cap (training) refuses a Lên over the unlocked level', () => {
    const s = session(() => 0.0, 6); s.caps = { kiem: 6, bua: 3, dao: 3, tay: 3 } as never;
    expect(s.strike(hit(s, T_HIT)).refused).toBe(true);
  });
  it('a blank reaching +3 asks for a family and evolves', () => {
    const s = new ForgeSession(() => 0.0, 5); s.heat = 0.7; s.zoneC = 0.5; s.blades[0] = { family: null, level: 2, best: 2 };
    const r = s.strike(hit(s, T_HIT)); expect(r.pick).toBe(true); expect(s.pendingPick).toBe(0);
    expect(s.pickFamily('bua')?.family).toBe('bua'); expect(s.pendingPick).toBeNull();
  });
});

describe('cards (mods)', () => {
  it('guardVo turns one Vỡ into Giữ; plus2Once makes one Lên +2; sureAfterVo guarantees a Lên after a Vỡ', () => {
    const s = session(() => 0.99, 5); s.mods = { ...NO_MODS, guardVo: 1 };
    expect(s.strike(T_MISS).outcome).toBe('giu'); expect(s.strike(T_MISS + 3).outcome).toBe('vo');
    const p = session(() => 0.0, 5); p.mods = { ...NO_MODS, plus2Once: 1 };
    expect(p.strike(hit(p, T_HIT)).delta).toBe(2); expect(p.strike(hit(p, T_HIT + 3)).delta).toBe(1);
    const q = session(() => 0.99, 5); q.mods = { ...NO_MODS, sureAfterVo: true };
    q.strike(T_MISS); expect(q.strike(hit(q, T_HIT + 3)).outcome).toBe('len');
  });
  it('notoriety lowers p(L); zoneMul widens the zone; costMul, heatMul and decayMul scale heat', () => {
    const s = session(() => 0.74, 0); s.mods = { ...NO_MODS, notoriety: 2 };
    expect(s.strike(hit(s, T_HIT)).outcome).toBe('giu'); // p = 0.75 − 0.08
    const z = session(); const w = z.zoneHalf; z.mods = { ...NO_MODS, zoneMul: 1.4 }; expect(z.zoneHalf).toBeCloseTo(w * 1.4);
    const c = session(); c.mods = { ...NO_MODS, costMul: 0.5 }; c.strike(T_MISS); expect(c.heat).toBeCloseTo(0.64, 6);
    const h = session(); h.heat = 0; h.mods = { ...NO_MODS, heatMul: 2 }; h.tick(1, true); expect(h.heat).toBeCloseTo(1);
  });
});

describe('Nhập thần', () => {
  const meterFull = (s: ForgeSession) => { s.frenzyMeter = F.frenzy.full - 1; s.frenzyMeter = F.frenzy.full; };
  it('meter +1 per Lên, full at 10; the eye starts 4 s on the fast lap with no jump of the marker', () => {
    const s = session(() => 0.0, 2); for (let i = 0; i < 9; i++) s.strike(hit(s, T_HIT + i * 1.5));
    expect(s.frenzyMeter).toBe(9); expect(s.activateFrenzy()).toBe(false);
    s.strike(hit(s, T_HIT + 20 * 1.5)); expect(s.frenzyMeter).toBe(10);
    const t = 50, before = phaseAt(s.ring, t); s.setTime(t);
    expect(s.activateFrenzy(t)).toBe(true); expect(s.frenzyMeter).toBe(0);
    expect(phaseAt(s.ring, t)).toBeCloseTo(before, 6);
    expect(phaseAt(s.ring, t + 0.9)).toBeCloseTo(before, 6); // one lap per 0.9 s now
    expect(s.frenzyT).toBeCloseTo(4); expect(s.immune).toBe(true);
  });
  it('the zone is half the ring, then shrinks to 0.12 at 4 s; the lap returns to normal at the end', () => {
    const s = session(); meterFull(s); s.setTime(10); s.activateFrenzy(10);
    expect(s.zoneHalfAt(10) * 2).toBeCloseTo(0.5); expect(s.zoneHalfAt(12.4) * 2).toBeCloseTo(0.5);
    expect(s.zoneHalfAt(13.2) * 2).toBeCloseTo(0.31, 2); expect(s.zoneHalfAt(13.99) * 2).toBeLessThan(0.13);
    const m = phaseAt(s.ring, 14); s.setTime(14.01);
    expect(s.frenzy).toBe(false); expect(s.ring.lap).toBe(F.ring.lapS); expect(phaseAt(s.ring, 14)).toBeCloseTo(m, 6);
  });
  it('Trúng → Lên with p − 0.10; Trượt → Vỡ 30% else Giữ; no heat cost, heat frozen', () => {
    const s = session(() => 0.70, 0); meterFull(s); s.setTime(10); s.activateFrenzy(10);
    const h = s.heat; s.tick(1, true); expect(s.heat).toBe(h);
    s.zoneC = phaseAt(s.ring, 10.1); // marker is in the zone
    const r = s.strike(10.1); expect(r.frenzy).toBe(true); expect(r.timing).toBe('hit');
    expect(r.outcome).toBe('giu'); // 0.70 ≥ 0.75 − 0.10 → no Lên (it would be Lên outside Nhập thần)
    expect(s.heat).toBe(h);
    s.zoneC = (phaseAt(s.ring, 10.5) + 0.5) % 1;
    const lo = new ForgeSession(() => 0.2, 1); lo.zoneC = 0.9; lo.setTime(0); lo.frenzyMeter = 10; lo.activateFrenzy(0); lo.zoneC = 0.9;
    expect(lo.strike(0.2).outcome).toBe('vo');
    const hi = new ForgeSession(() => 0.5, 1); hi.frenzyMeter = 10; hi.activateFrenzy(0); hi.zoneC = 0.9; expect(hi.strike(0.2).outcome).toBe('giu');
  });
  it('leaving the stance ends it early and restores the lap', () => {
    const s = session(); meterFull(s); s.activateFrenzy(5); s.endFrenzy(6);
    expect(s.frenzy).toBe(false); expect(s.ring.lap).toBe(F.ring.lapS);
  });
});

describe('client and server agree (±tol)', () => {
  it('a Trúng the client shows is a Trúng on the server; the server forgives up to strikeTolS', () => {
    const tol = BALANCE.net.auth.strikeTolS;
    const server = session(rng(5), 6), client = session(rng(5), 6);
    for (let i = 0; i < 300; i++) {
      const at = 1 + i * 0.37 + (i % 7) * 0.011;
      const c = client.predict(at);
      const sv = server.verdict(at, tol);
      if (c === 'hit') expect(sv).toBe('hit');
      server.strike(at, tol);
      // the client re-syncs when the verdicts differ (its zone was not advanced); then both are on the same zone again
      applyForgeSync(client, forgeSync(server), { heat: true, ring: true });
      expect(client.zoneC).toBe(server.zoneC);
    }
  });
  it('predict() moves the zone exactly where the server will, from the same timestamp', () => {
    const a = session(rng(2), 6), b = session(rng(2), 6);
    a.predict(T_HIT); b.strike(T_HIT, 0);
    expect(a.zoneC).toBeCloseTo(b.zoneC, 10); expect(a.zoneK).toBe(b.zoneK);
  });
  it('sync carries the ring, zone, seed and Nhập thần window', () => {
    const a = session(); a.frenzyMeter = 10; a.activateFrenzy(3); a.strike(3.1);
    const b = new ForgeSession(rng(1), 5); applyForgeSync(b, forgeSync(a), { heat: true, ring: true });
    expect(b.ring).toEqual(a.ring); expect([b.zoneC, b.zoneK, b.seed, b.frenzyStart, b.frenzyEnd]).toEqual([a.zoneC, a.zoneK, a.seed, a.frenzyStart, a.frenzyEnd]);
  });
});

describe('heat, swap, modules', () => {
  it('heat: +0.55/s held, −0.05/s decay', () => {
    const s = new ForgeSession(rng(1));
    for (let i = 0; i < 60; i++) s.tick(1 / 60, true);
    expect(s.heat).toBeCloseTo(0.55, 2);
    for (let i = 0; i < 60; i++) s.tick(1 / 60, false);
    expect(s.heat).toBeCloseTo(0.5, 2);
    s.onHitOut(); expect(s.heat).toBeLessThan(0.35);
  });
  it('Đổi: refused with an empty other slot, takes 0.3 s, a picked blank fills the empty slot', () => {
    const s = session(); s.carried = 1;
    expect(s.filled(s.slot)).toBe(true); expect(s.filled(1 - s.slot)).toBe(false);
    expect(s.swapSlot()).toBe(false); expect(s.slot).toBe(0);
    s.carried = 2; expect(s.filled(1)).toBe(true);
    expect(s.swapSlot()).toBe(true); expect(s.slot).toBe(1);
    expect(s.swapSlot()).toBe(false);
    expect(s.swapSlot(true)).toBe(true);
    s.tick(F.swapS - 0.05, false); expect(s.swapT).toBeGreaterThan(0);
    s.tick(0.06, false); expect(s.swapT).toBe(0);
  });
  it('two blade slots swap; module slots open at armor +3 and +7', () => {
    const s = session(); s.blade.level = 4; s.swapSlot(); expect(s.blade.level).toBe(0); s.tick(F.swapS + 0.01, false); s.swapSlot(); expect(s.blade.level).toBe(4);
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
