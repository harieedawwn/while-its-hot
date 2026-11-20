import { describe, expect, it } from 'vitest';
import { BALANCE } from '../balance';
import type { Family } from '../data/weapons';
import { MatchAuthority, type Out } from './authority';

const rng = () => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
const D = BALANCE.effects.dao;

/** Two fighters 1.5 m apart; p1 (at the origin facing −Z) holds `family` at `level`; p2 faces `p2yaw`. */
function duel(family: Family, level: number, p2yaw: number) {
  const a = new MatchAuthority([1, 2], { truce: 0 }, rng(), 0, true);
  const p1 = a.players.get(1)!, p2 = a.players.get(2)!;
  p1.forge.blades[0] = { family, level, best: level };
  Object.assign(p1.st, { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 });
  Object.assign(p2.st, { x: 0, y: 0, z: -1.5, yaw: p2yaw });
  a.tick(5000);
  return { a, p1, p2 };
}
const swingHit = (a: MatchAuthority, kind: 'light' | 'heavy', combo = 0): Out[] => {
  const now = 5000;
  a.msg(1, { t: 'atk', s: 1, kind, combo, at: now }, now);
  return a.msg(1, { t: 'hit', s: 1, tg: 2, zone: 'torso', dist: 1.4, p: [0, 1, -1.5], at: now + 150, rt: now }, now + 150);
};
const dmgOf = (out: Out[]) => (out.find((o) => o.m.t === 'dmg')!.m as { dmg: number }).dmg;

describe('dao and tay effects on the server (phase 29)', () => {
  it('a backstab (victim facing away) hits harder than a front hit', () => {
    const back = dmgOf(swingHit(duel('dao', 9, 0).a, 'light'));
    const front = dmgOf(swingHit(duel('dao', 9, Math.PI).a, 'light'));
    expect(back / front).toBeCloseTo(D.backMul, 5);
  });

  it('a kill with Dao bóng makes the killer invisible (status to everyone)', () => {
    const { a, p2 } = duel('dao', 21, Math.PI);
    p2.hp = 1;
    const out = swingHit(a, 'light');
    expect(out.some((o) => o.m.t === 'kill' && o.m.tg === 2)).toBe(true);
    expect(out.some((o) => o.m.t === 'status' && o.m.k === 'invis' && o.m.tg === 1 && o.m.s === D.invis.s)).toBe(true);
  });

  it('Dao rạch không gian: heavy swing cuts the foe on the line and sends the owner a tp', () => {
    const { a, p2 } = duel('dao', 45, Math.PI);
    const out: Out[] = [];
    out.push(...a.msg(1, { t: 'atk', s: 1, kind: 'heavy', combo: 0, at: 5000 }, 5000));
    for (let now = 5050; now <= 5400; now += 50) out.push(...a.tick(now));
    const tp = out.find((o) => o.m.t === 'tp');
    expect(tp?.to).toBe(1);
    expect((tp!.m as { p: number[] }).p[2]).toBeCloseTo(-D.rift.range, 5);
    expect(p2.hp).toBe(BALANCE.combat.hp - D.rift.dmg);
  });

  it('Găng xích heals a hurt owner on a landed hit (heal message with the new hp)', () => {
    const { a, p1 } = duel('tay', 9, Math.PI);
    p1.hp = 50;
    const out = swingHit(a, 'light');
    expect(out.find((o) => o.m.t === 'heal')?.m).toMatchObject({ t: 'heal', hp: 51 });
    expect(p1.hp).toBe(51);
  });
});
