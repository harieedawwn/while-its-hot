import { describe, expect, it } from 'vitest';
import { BALANCE } from '../balance';
import { decodeSnapshot, encodeSnapshot } from '../net/codec';
import { MatchAuthority, type Out } from './authority';

const rng = () => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };

/** The online path of a form effect: atk → server EffectWorld → snapshot entity + edmg/status messages. */
describe('form effects on the server (phase 28)', () => {
  it('a heavy swing with Song nhận flies a slash that is in the snapshot and hits for edmg', () => {
    const a = new MatchAuthority([1, 2], { truce: 0 }, rng(), 0, true);
    const p1 = a.players.get(1)!, p2 = a.players.get(2)!;
    p1.forge.blades[0] = { family: 'kiem', level: 21, best: 21 };
    Object.assign(p1.st, { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 });
    Object.assign(p2.st, { x: 0, y: 0, z: -4, yaw: 0 });
    let now = 5000;
    const out: Out[] = [...a.tick(now)];
    out.push(...a.msg(1, { t: 'atk', s: 1, kind: 'heavy', combo: 0, at: now }, now));
    let sawEnt = false;
    for (let i = 0; i < 20; i++) {
      now += 50;
      out.push(...a.tick(now));
      const snap = decodeSnapshot(encodeSnapshot(a.snapshot(now)))!;
      if (snap.ents!.some((e) => e.k === 'slash' && e.o === 1)) sawEnt = true;
    }
    expect(sawEnt).toBe(true);
    const hit = out.find((o) => o.m.t === 'edmg');
    expect(hit?.m).toMatchObject({ t: 'edmg', tg: 2, by: 1, dmg: BALANCE.effects.slash.dmg });
    expect(p2.hp).toBe(BALANCE.combat.hp - BALANCE.effects.slash.dmg);
  });

  it('a 3rd light with Kiếm băng freezes the target through a status message', () => {
    const a = new MatchAuthority([1, 2], { truce: 0 }, rng(), 0, true);
    const p1 = a.players.get(1)!, p2 = a.players.get(2)!;
    p1.forge.blades[0] = { family: 'kiem', level: 37, best: 37 };
    Object.assign(p1.st, { x: 0, y: 0, z: 0, yaw: 0 });
    Object.assign(p2.st, { x: 0, y: 0, z: -1.5, yaw: Math.PI });
    const now = 5000;
    a.tick(now);
    a.msg(1, { t: 'atk', s: 1, kind: 'light', combo: 2, at: now }, now);
    const out = a.msg(1, { t: 'hit', s: 1, tg: 2, zone: 'torso', dist: 1.5, p: [0, 1, -1.5], at: now + 150, rt: now }, now + 150);
    expect(out.some((o) => o.m.t === 'status' && o.m.k === 'freeze' && o.m.tg === 2)).toBe(true);
  });
});
