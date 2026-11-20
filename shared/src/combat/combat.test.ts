import { describe, expect, it } from 'vitest';
import { BALANCE } from '../balance';
import { weaponById } from '../data/weapons';
import { armorFactor, damageOf, inFront, resolveHit, type DefenderView } from './damage';
import { Fighter, type FighterInput, NO_FIGHT } from './fighter';
import { attackShape, framesOf, totalS } from './frames';
import { bladeAt, bodyCapsules, segSegDist2, swingFrame, sweepHit, type V3 } from './sweep';

const C = BALANCE.combat;
const DT = 1 / 60;
const run = (f: Fighter, s: number, i: Partial<FighterInput> = {}, first: Partial<FighterInput> = {}) => {
  const ev: string[] = [];
  const n = Math.round(s / DT);
  for (let k = 0; k < n; k++) { f.tick(DT, { ...NO_FIGHT, ...i, ...(k === 0 ? first : {}) }); ev.push(...f.events.map((e) => e.k)); }
  return ev;
};
const tap = { attackPressed: true, attackHeld: true };

describe('frame data', () => {
  it('a light swing lasts exactly the family combo time (GDD §5)', () => {
    for (const fam of ['kiem', 'bua', 'dao', 'tay'] as const) {
      const fam2 = BALANCE.weapons.family[fam];
      for (let c = 0; c < fam2.comboHits; c++) expect(totalS(framesOf(fam, 'light', c))).toBeCloseTo(fam2.comboS, 6);
      expect(C.family[fam].light.length).toBe(fam2.comboHits);
      // every light windup is long enough for the tap/hold decision
      for (const l of C.family[fam].light as readonly { w: number }[]) expect(l.w).toBeGreaterThanOrEqual(C.tapS);
    }
  });
  it('shapes: slide +20%, heavy table values, passives fold in', () => {
    expect(attackShape(weaponById('kiem_tho'), 'slide', 0).dmg).toBeCloseTo(12 * 1.2);
    expect(attackShape(weaponById('bua_ren'), 'heavy', 0).dmg).toBe(40);
    expect(attackShape(weaponById('bua_ren'), 'heavy', 0).breaksBlock).toBe(true);
    expect(attackShape(weaponById('phoi'), 'light', 0).dmg).toBe(9);
    expect(attackShape(weaponById('kiem_thep'), 'light', 2).dmg).toBeCloseTo(12 * 1.2);
    expect(attackShape(weaponById('dao_gam'), 'heavy', 0).lungeM).toBe(3);
    expect(framesOf('tay', 'light', 0).hand).toBe('l');
    expect(framesOf('tay', 'light', 1).hand).toBe('r');
    expect(totalS(framesOf('bua', 'light', 0, 0.7))).toBeCloseTo(0.49, 6);
  });
});

describe('fighter', () => {
  it('tap chains the light combo at the family rhythm and wraps', () => {
    const f = new Fighter(weaponById('kiem_tho'));
    const combos: number[] = [];
    for (let i = 0; i < 4; i++) { run(f, 0.4, { attackHeld: false }, { attackPressed: true }); combos.push(f.combo); }
    expect(combos).toEqual([0, 1, 2, 0]);
  });
  it('hammer chains 2 hits; a late press restarts the chain', () => {
    const f = new Fighter(weaponById('bua_ren'));
    run(f, 0.7, {}, { attackPressed: true });
    run(f, 0.7, {}, { attackPressed: true });
    expect(f.combo).toBe(1);
    run(f, 0.7 + C.comboGapS + 0.1);
    run(f, 0.1, {}, { attackPressed: true });
    expect(f.combo).toBe(0);
  });
  it('the active window opens after the windup and sweeps u 0→1', () => {
    const f = new Fighter(weaponById('kiem_tho'));
    let first = -1, last = 0, t = 0;
    f.tick(DT, { ...NO_FIGHT, attackPressed: true });
    for (let k = 0; k < 40; k++) {
      t += DT; f.tick(DT, NO_FIGHT);
      if (f.sweep && first < 0) first = t;
      if (f.sweep) last = f.sweep.u1;
    }
    expect(first).toBeGreaterThan(0.11 - 2 * DT); expect(first).toBeLessThan(0.11 + 2 * DT);
    expect(last).toBe(1);
  });
  it('hold charges a heavy; early release waits for the minimum, max auto-releases', () => {
    const f = new Fighter(weaponById('kiem_tho'));
    const ev = run(f, 0.2, { attackHeld: true }, tap);
    expect(ev).toContain('charge');
    expect(f.phase).toBe('charge');
    run(f, 0.1, { attackHeld: false });
    expect(f.phase).toBe('charge');
    run(f, 0.2, { attackHeld: false });
    expect(f.kind).toBe('heavy');
    expect(f.chargeS).toBeGreaterThanOrEqual(C.heavy.minS - 1e-9);
    const g = new Fighter(weaponById('kiem_tho'));
    run(g, 1.1, { attackHeld: true }, tap);
    expect(g.kind).toBe('heavy');
    expect(g.chargeS).toBeLessThanOrEqual(C.heavy.maxS + DT);
  });
  it('slide attack within the window is a slide kind with a 2 m lunge', () => {
    const f = new Fighter(weaponById('kiem_tho'));
    f.tick(DT, { ...NO_FIGHT, attackPressed: true, sinceSlide: 0.2 });
    expect(f.kind).toBe('slide');
    expect(f.events.find((e) => e.k === 'lunge')).toMatchObject({ m: C.slideAtk.lungeM });
    const g = new Fighter(weaponById('kiem_tho'));
    g.tick(DT, { ...NO_FIGHT, attackPressed: true, sinceSlide: 0.3 });
    expect(g.kind).toBe('light');
  });
  it('parry window then block while held; tap parry recovers to idle', () => {
    const f = new Fighter(weaponById('kiem_tho'));
    run(f, 0.1, { parryHeld: true }, { parryPressed: true });
    expect(f.parrying).toBe(true);
    run(f, 0.1, { parryHeld: true });
    expect(f.blocking).toBe(true);
    expect(f.speedMul).toBeCloseTo(1 - C.block.slow);
    const g = new Fighter(weaponById('kiem_tho'));
    run(g, 0.2, {}, { parryPressed: true });
    expect(g.phase).toBe('parry_recover');
    run(g, C.parry.recoverS);
    expect(g.phase).toBe('idle');
    // kiem_ban_rong widens the window
    expect(new Fighter(weaponById('kiem_ban_rong')).parryWindowS).toBeCloseTo(C.parry.windowS + 0.03);
  });
  it('a parry press during a charge feints into a parry', () => {
    const f = new Fighter(weaponById('bua_ren'));
    run(f, 0.3, { attackHeld: true }, tap);
    const ev = run(f, DT, { attackHeld: true }, { parryPressed: true });
    expect(ev).toContain('feint');
    expect(f.parrying).toBe(true);
  });
  it('stagger blocks actions until it ends', () => {
    const f = new Fighter(weaponById('kiem_tho'));
    f.stagger(0.6);
    run(f, 0.5, {}, { attackPressed: true });
    expect(f.phase).toBe('stagger');
    run(f, 0.15);
    expect(f.phase).toBe('idle');
  });
});

describe('damage', () => {
  const def = (o: Partial<DefenderView> = {}): DefenderView => ({ x: 0, z: 0, yaw: 0, parrying: false, blocking: false, immune: false, stamina: 3, armorLevel: 0, ...o });
  const atk = (shape = attackShape(weaponById('kiem_tho'), 'light', 0)) => ({ x: 0, z: -2, shape, family: 'kiem' as const, weaponLevel: 3 });
  const K = 1 + 0.045 * 3;
  it('formula: base × scale(family, L) × armor × taken', () => {
    expect(armorFactor(10)).toBeCloseTo(0.7); expect(armorFactor(20)).toBeCloseTo(0.7);
    expect(damageOf(attackShape(weaponById('kiem_tho'), 'light', 0), 'kiem', 3, 4)).toBeCloseTo(12 * K * 0.88);
    expect(damageOf(attackShape(weaponById('kiem_tho'), 'light', 0), 'kiem', 3, 0, 1.1)).toBeCloseTo(12 * K * 1.1);
    const tay = resolveHit(atk(), def({ taken: 1.1 }));
    if (tay.r === 'hit') expect(tay.dmg).toBeCloseTo(12 * K * 1.1);
  });
  it('front checks', () => {
    expect(inFront({ x: 0, z: 0, yaw: 0 }, 0, -1, 80)).toBe(true);
    expect(inFront({ x: 0, z: 0, yaw: 0 }, 0, 1, 80)).toBe(false);
  });
  it('parry, block, guard break, pierce, i-frames', () => {
    expect(resolveHit(atk(), def({ immune: true })).r).toBe('immune');
    expect(resolveHit(atk(), def({ parrying: true }))).toMatchObject({ r: 'parried', attackerStaggerS: 0.6, parrierStamina: 1 });
    const b = resolveHit(atk(), def({ blocking: true }));
    expect(b).toMatchObject({ r: 'blocked', staminaCost: 1 });
    if (b.r === 'blocked') expect(b.dmg).toBeCloseTo(12 * K * 0.3);
    expect(resolveHit(atk(), def({ blocking: true, stamina: 0.5 })).r).toBe('guardbreak');
    expect(resolveHit(atk(attackShape(weaponById('bua_ren'), 'heavy', 0)), def({ blocking: true })).r).toBe('guardbreak');
    expect(resolveHit(atk(attackShape(weaponById('truong_kiem'), 'heavy', 0)), def({ blocking: true })).r).toBe('pierced');
    // block from behind does nothing
    expect(resolveHit({ ...atk(), z: 2 }, def({ blocking: true })).r).toBe('hit');
  });
});

describe('sweep', () => {
  const eye: V3 = [0, 1.62, 0];
  it('segment distance', () => {
    expect(segSegDist2([0, 0, 0], [1, 0, 0], [0.5, 1, 0], [0.5, 2, 0])).toBeCloseTo(1);
    expect(segSegDist2([0, 0, 0], [1, 0, 0], [0.5, -1, 0], [0.5, 1, 0])).toBeCloseTo(0);
  });
  it('a slash at reach hits a body in front, misses one behind and one out of reach', () => {
    const f = swingFrame(eye, 0, 0);
    const arc = framesOf('kiem', 'light', 0).arc;
    const hit = (z: number) => sweepHit(f, arc, 120, 2.3, 0, 1, bodyCapsules([0, 0, z], 1.8));
    expect(hit(-2)?.zone).toBe('torso');
    expect(hit(2)).toBeNull();
    expect(hit(-3.2)).toBeNull();
  });
  it('sub-steps catch a thin target the end poses straddle', () => {
    const f = swingFrame(eye, 0, 0);
    const arc = { kind: 'slash' as const, from: 80, to: -80, roll: 0 };
    // a fast 160° swing in one call: the capsule sits dead ahead, the endpoints are far to the sides
    expect(sweepHit(f, arc, 160, 2, 0, 1, [{ a: [0, 1.3, -1.8], b: [0, 1.7, -1.8], r: 0.08, zone: 'head' }])).not.toBeNull();
  });
  it('blade tip sits at reach along the look direction mid-thrust', () => {
    const f = swingFrame(eye, Math.PI / 2, 0);
    const b: V3 = [0, 0, 0], t: V3 = [0, 0, 0];
    bladeAt(f, { kind: 'thrust', from: 1, to: 1, roll: 0 }, 0, 3, 0.5, b, t);
    expect(t[0]).toBeCloseTo(-3); expect(t[2]).toBeCloseTo(0);
  });
  it('sliding bodies are shorter: a flat head-height slash passes over', () => {
    const f = swingFrame(eye, 0, 0);
    const arc = { kind: 'slash' as const, from: 50, to: -50, roll: -6 };
    expect(sweepHit(f, arc, 100, 3.2, 0, 1, bodyCapsules([0, 0, -2], 1.0))).toBeNull();
  });
});
