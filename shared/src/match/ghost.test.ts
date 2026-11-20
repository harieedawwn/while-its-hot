import { describe, expect, it } from 'vitest';
import { BALANCE } from '../balance';
import { framesOf } from '../combat/frames';
import { FLAG } from '../net/codec';
import type { MatchClientMsg } from '../net/match-msgs';
import { MatchAuthority, type Out } from './authority';
import { blankState } from './mplayer';
import { armorLoss, bladeLoss, ghostLanding, ringRadius, ringTickDmg } from './rules';

/** Ghost respawn, carry-over and the fire-ring tick (ROUND3 §2–3, phase 26). */
const seeded = (s = 11) => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
const W = framesOf('kiem', 'light', 0).w * 1000;
const G = BALANCE.match.ghost, R = BALANCE.match.ring;
const kinds = (o: Out[]) => o.map((x) => x.m.t);
const atk = (s: number, at: number): MatchClientMsg => ({ t: 'atk', s, kind: 'light', combo: 0, at });
const hit = (s: number, tg: number, at: number): MatchClientMsg => ({ t: 'hit', s, tg, zone: 'torso', dist: 1.5, p: [0, 1.2, -1], at, rt: at - 100 });

function setup(rules: Record<string, number> = {}) {
  const m = new MatchAuthority([1, 2], { truce: 0, ...rules }, seeded(), 0, true);
  m.tick(0);
  m.state(1, blankState([0, 0, 0], 0));
  m.state(2, blankState([0, 0, -1.5], Math.PI));
  return m;
}
/** Player 2 dies to a hit at match ms `t0`; returns t0. */
function kill2(m: MatchAuthority, t0 = 1000): number {
  m.players.get(2)!.hp = 1;
  m.msg(1, atk(1, t0), t0);
  m.msg(1, hit(1, 2, t0 + W + 20), t0 + W + 20);
  return t0 + W + 20;
}

describe('ghost', () => {
  it('rejects hits both ways, takes no ring damage, shows as a ghost in the snapshot', () => {
    const m = setup(), t0 = kill2(m), v = m.players.get(2)!;
    m.tick(t0 + G.deadS * 1000 + 50);
    expect(v.ghost).toBe(true);
    // a ghost may move (state accepted)…
    m.state(2, blankState([5, 0, 5], 0)); expect(v.st.x).toBe(5);
    m.state(2, blankState([0, 0, -1.5], Math.PI));
    // …cannot be hit
    m.msg(1, atk(2, 4000), 4000);
    expect(m.msg(1, hit(2, 2, 4000 + W + 20), 4000 + W + 20)[0].m).toMatchObject({ t: 'reject', why: 'target' });
    // …and cannot hit
    expect(m.msg(2, atk(1, 4100), 4100)).toEqual([]);
    expect(m.msg(2, hit(1, 1, 4100 + W + 20), 4100 + W + 20)[0].m).toMatchObject({ t: 'reject' });
    expect(m.players.get(1)!.hp).toBe(BALANCE.combat.hp);
    const f = m.snapshot(4000).players.find((p) => p.id === 2)!.state.flags;
    expect(f & FLAG.ghost).toBeTruthy(); expect(f & FLAG.dead).toBeFalsy();
  });
  it('a ghost outside the ring lands 2 m inside it; inside it stays put', () => {
    const m = setup(), t0 = 70000, { c, r } = m.flow.ringAt(t0);
    expect(r).toBeGreaterThan(0);
    const out = ghostLanding(c[0] + r + 9, c[1], c, r);
    expect(Math.hypot(out[0] - c[0], out[1] - c[1])).toBeCloseTo(r - G.landIn, 5);
    expect(ghostLanding(c[0] + 1, c[1] + 1, c, r)).toEqual([c[0] + 1, c[1] + 1]);
    // through the authority: die at 68 s, stand far outside the ring while a ghost, turn solid
    m.tick(68000);
    const d = 68000; m.players.get(2)!.hp = 1; m.msg(1, atk(1, d), d); m.msg(1, hit(1, 2, d + W + 20), d + W + 20);
    m.tick(d + W + 20 + G.deadS * 1000 + 50);
    const now = d + W + 20 + G.solidS * 1000 + 50, ring = m.flow.ringAt(now);
    m.state(2, blankState([ring.c[0] + ring.r + 6, 0, ring.c[1]], 0));
    const o = m.tick(now), sp = o.find((x) => x.m.t === 'spawn')!.m as { p: number[] };
    expect(Math.hypot(sp.p[0] - ring.c[0], sp.p[2] - ring.c[1])).toBeLessThan(ring.r - G.landIn + 0.01);
    expect(m.players.get(2)!.alive).toBe(true);
    // 0.5 s of protection, broken by attacking
    expect(m.players.get(2)!.spawnUntil).toBeGreaterThan(now);
    m.msg(2, atk(1, now + 10), now + 10);
    expect(m.players.get(2)!.spawnUntil).toBe(0);
  });
});

describe('fire ring ticks', () => {
  it('outside the ring: one tick every 0.5 s, dps × 0.5 each, and the sum matches', () => {
    const m = setup({ ring: 1 });
    const c = m.flow.ringAt(65000).c, p = m.players.get(1)!;
    m.tick(65000); // ring is up from 60 s; first tick after the move-in
    m.state(1, blankState([c[0] + 60, 0, c[1]], 0));
    const hp0 = p.hp; let ticks = 0, dmg = 0, t = 65000;
    for (let i = 0; i < 100; i++) { // 5 s at 20 Hz
      t += 50;
      const o = m.tick(t);
      for (const x of o) if (x.m.t === 'rtick') ticks++;
      dmg = hp0 - p.hp;
    }
    expect(ticks).toBe(10);
    const s = (t - 0) / 1000;
    expect(dmg).toBeGreaterThan(ringTickDmg(65) * 9.9);
    expect(dmg).toBeLessThan(ringTickDmg(s) * 10.1);
    expect(ringTickDmg(60)).toBeCloseTo(R.dps * R.tickS, 9);
  });
  it('inside the ring there is no tick; the radius never exceeds maxR', () => {
    const m = setup({ ring: 1 }), c = m.flow.ringAt(65000).c;
    m.tick(65000); m.state(1, blankState([c[0], 0, c[1]], 0));
    let n = 0; for (let t = 65050; t < 70000; t += 50) n += kinds(m.tick(t)).filter((k) => k === 'rtick').length;
    expect(n).toBe(0);
    expect(ringRadius(65, 1)).toBeLessThanOrEqual(R.maxR);
  });
});

describe('carry-over', () => {
  it('five rounds of loss: blades 2k, armor k, never below 0', () => {
    expect([1, 2, 3, 4, 5].map(bladeLoss)).toEqual([2, 4, 6, 8, 10]);
    expect([1, 2, 3, 4, 5].map(armorLoss)).toEqual([1, 2, 3, 4, 5]);
    const m = setup(), f = m.players.get(1)!.forge;
    f.blades[0] = { family: 'kiem', level: 30, best: 31 }; f.armor = 12;
    const seen: number[] = [];
    for (let k = 1; k <= 5; k++) { const r = f.carryLoss(bladeLoss(k), armorLoss(k)); seen.push(r.blades[0][1]); }
    expect(seen).toEqual([28, 24, 18, 10, 0]);
    expect(f.armor).toBe(0); expect(f.blades[0].best).toBe(0); expect(f.blades[0].family).toBe('kiem');
  });
  it('a round that ends by time keeps blades and armor, minus 2k / k, and reports it', () => {
    const m = setup({ rounds: 5 }), p = m.players.get(1)!;
    p.forge.blades[0] = { family: 'bua', level: 12, best: 12 }; p.forge.armor = 6;
    p.rKills = 1; p.kills = 1; // a winner exists
    const o = m.tick(181000);
    expect(m.flow.ph).toBe('result');
    expect(p.forge.blades[0].level).toBe(10); expect(p.forge.armor).toBe(5);
    const c = o.find((x) => x.m.t === 'carry')!.m as { rows: { id: number; blades: { from: number; to: number; family: string }[]; armor: number[] }[] };
    expect(c.rows.find((r) => r.id === 1)).toMatchObject({ blades: [{ family: 'bua', from: 12, to: 10 }], armor: [6, 5] });
    // next round: the cage keeps them
    m.tick(181000 + BALANCE.match.resultS * 1000 + 100);
    expect(m.flow.ph).toBe('cage'); expect(p.forge.blades[0]).toMatchObject({ family: 'bua', level: 10 }); expect(p.forge.armor).toBe(5);
  });
  it('round 2 costs 4 levels, and the pedestal holds one blank per free hand + 1', () => {
    const m = setup({ rounds: 5 }), p = m.players.get(1)!;
    p.forge.blades[0] = { family: 'kiem', level: 20, best: 20 };
    p.rKills = 1; m.tick(181000); m.tick(181000 + BALANCE.match.resultS * 1000 + 100); // round 2 cage
    p.rKills = 1; m.tick(300000); // cage 10 s → fight
    const lvl = p.forge.blades[0].level;
    m.tick(300000 + 181000);
    expect(p.forge.blades[0].level).toBe(Math.max(0, lvl - 4));
  });
  it('the pedestal holds one blank per player with a free hand, +1', () => {
    const n = new MatchAuthority([1, 2, 3], { truce: 0 }, seeded(), 0, false);
    n.players.get(1)!.forge.carried = 2;
    n.tick(0); n.tick(BALANCE.match.cageS * 1000 + 100);
    expect(n.flow.ph).toBe('fight'); expect(n.pickups.list.length).toBe(2 + 1);
  });
});
