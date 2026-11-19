import { describe, expect, it } from 'vitest';
import { BALANCE } from '../balance';
import { framesOf } from '../combat/frames';
import type { MatchClientMsg } from '../net/match-msgs';
import { animCode, decodeAnim } from './anim-code';
import { MatchAuthority, parryOk, type Out } from './authority';
import { blankState } from './mplayer';

const seeded = (s = 7) => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
const W = framesOf('kiem', 'light', 0).w * 1000; // phôi swings like a sword
function setup(truce = 0) {
  const m = new MatchAuthority([1, 2, 3], truce, seeded(), 0, true);
  m.tick(0); // flush the round-start messages
  m.state(1, { ...blankState([0, 0, 0], 0) });
  m.state(2, { ...blankState([0, 0, -1.5], Math.PI) }); // in front of 1, facing 1
  m.state(3, { ...blankState([20, 0, 20], 0) });
  return m;
}
const atk = (s: number, at: number): MatchClientMsg => ({ t: 'atk', s, kind: 'light', combo: 0, at });
const hit = (s: number, tg: number, at: number): MatchClientMsg => ({ t: 'hit', s, tg, zone: 'torso', dist: 1.5, p: [0, 1.2, -1], at, rt: at - 100 });
const kinds = (o: Out[]) => o.map((x) => x.m.t);

describe('match authority: hits', () => {
  it('a fresh claim inside the active frames damages', () => {
    const m = setup();
    m.msg(1, atk(1, 1000), 1000);
    const o = m.msg(1, hit(1, 2, 1000 + W + 20), 1000 + W + 60);
    expect(kinds(o)).toEqual(['dmg']);
    expect(m.players.get(2)!.hp).toBeCloseTo(BALANCE.combat.hp - BALANCE.weapons.phoi.light, 5);
    // the same swing cannot hit the same target twice
    expect(kinds(m.msg(1, hit(1, 2, 1000 + W + 30), 1000 + W + 70))).toEqual(['reject']);
  });
  it('rejects stale swings, bad timing and out-of-reach targets', () => {
    const m = setup();
    expect(m.msg(1, hit(9, 2, 1000), 1000)[0].m).toMatchObject({ t: 'reject', why: 'stale' });
    m.msg(1, atk(1, 1000), 1000);
    expect(m.msg(1, hit(1, 2, 1000 + W + 900), 1000 + W + 900)[0].m).toMatchObject({ why: 'timing' });
    m.msg(1, atk(2, 3000), 3000);
    expect(m.msg(1, hit(2, 3, 3000 + W + 10), 3000 + W + 10)[0].m).toMatchObject({ why: 'reach' });
  });
  it('rate-limits attacks faster than the frame data', () => {
    const m = setup();
    m.msg(1, atk(1, 1000), 1000);
    m.msg(1, atk(2, 1010), 1010); // ignored: too soon
    expect(m.msg(1, hit(2, 2, 1010 + W + 10), 1010 + W + 10)[0].m).toMatchObject({ why: 'stale' });
  });
  it('a parry press near the hit time parries (window widened by rtt/2)', () => {
    const m = setup();
    m.setRtt(2, 120);
    m.msg(2, { t: 'parry', at: 1000 + W + 50 }, 1000 + W); // pressed 30 ms after the hit landed: inside the 60 ms slack
    m.msg(1, atk(1, 1000), 1000);
    const o = m.msg(1, hit(1, 2, 1000 + W + 20), 1000 + W + 60);
    expect(kinds(o)).toEqual(['parried']);
    expect(m.players.get(2)!.hp).toBe(BALANCE.combat.hp);
    expect(parryOk(0, 160 + 61, 120, 0.16)).toBe(false);
    expect(parryOk(0, 160 + 59, 120, 0.16)).toBe(true);
    expect(parryOk(0, -100, 400, 0.16)).toBe(false); // slack caps at 80 ms
  });
  it('the truce makes the target immune', () => {
    const t = setup(30);
    t.msg(1, atk(1, 1000), 1000);
    expect(t.msg(1, hit(1, 2, 1000 + W + 20), 1000 + W + 20)[0].m).toMatchObject({ why: 'immune' });
  });
  it('a kill costs 2 levels, then the player respawns after 4 s', () => {
    const m = setup(), v = m.players.get(2)!;
    v.forge.blades[0].level = 5; v.forge.blades[0].best = 5; v.hp = 3;
    m.msg(1, atk(1, 1000), 1000);
    const o = m.msg(1, hit(1, 2, 1000 + W + 20), 1000 + W + 20);
    expect(kinds(o)).toEqual(['dmg', 'score', 'kill', 'fsync']);
    expect(v.alive).toBe(false); expect(v.forge.blades[0].level).toBe(3); expect(m.players.get(1)!.kills).toBe(1);
    expect(kinds(m.tick(2000))).not.toContain('spawn');
    const sp = m.tick(1000 + W + 20 + BALANCE.match.respawnS * 1000);
    expect(kinds(sp)).toContain('spawn');
    expect(v.alive).toBe(true); expect(v.hp).toBe(BALANCE.combat.hp);
  });
});

describe('match authority: forge, pickups, snapshot', () => {
  it('strikes only in stance at the own anvil; the server rolls', () => {
    const m = setup(), me = m.players.get(1)!;
    expect(kinds(m.msg(1, { t: 'forge', op: { k: 'strike', timing: 'perfect', n: 1 } }, 100))).toEqual(['fsync']);
    m.msg(1, { t: 'forge', op: { k: 'stance', on: true } }, 100);
    expect(me.stance).toBe(false); // no anvil yet
    m.msg(1, { t: 'anvil', act: 'place', p: [0, 0, -1.1], yaw: 0 }, 100);
    m.msg(1, { t: 'forge', op: { k: 'stance', on: true } }, 200);
    expect(me.stance).toBe(true);
    const o = m.msg(1, { t: 'forge', op: { k: 'strike', timing: 'perfect', n: 2 } }, 300);
    expect(kinds(o)).toEqual(['forged', 'fsync']);
    expect(o[0].to).toBe('all');
    // the cooldown refuses an immediate second strike
    expect(kinds(m.msg(1, { t: 'forge', op: { k: 'strike', timing: 'miss', n: 3 } }, 310))).toEqual(['fsync']);
  });
  it('a blank in reach gives the second blade', () => {
    const m = setup(), me = m.players.get(1)!, k = m.pickups.list[0];
    expect(m.pickups.list.length).toBe(4); // 3 players + 1
    me.st.x = k.p[0] + 5; m.msg(1, { t: 'take', id: k.id }, 100);
    expect(me.forge.carried).toBe(1);
    me.st.x = k.p[0]; me.st.z = k.p[2];
    expect(kinds(m.msg(1, { t: 'take', id: k.id }, 200))).toEqual(['pickup', 'fsync']);
    expect(me.forge.carried).toBe(2); expect(m.pickups.list.length).toBe(3);
    const r = m.tick(BALANCE.match.rackEveryS * 1000 + 1);
    expect(kinds(r)).toContain('pickup');
  });
  it('snapshots carry the server-side weapon, level and hp', () => {
    const m = setup(), me = m.players.get(1)!;
    me.forge.blades[0] = { family: 'bua', level: 4, best: 4 }; me.hp = 61;
    const e = m.snapshot(500).players.find((p) => p.id === 1)!;
    expect(e.state.level).toBe(4); expect(e.state.hp).toBe(61); expect(e.state.weapon).toBeGreaterThan(0);
  });
  it('anim codes round trip', () => {
    const c = animCode({ phase: 'recover', kind: 'heavy', combo: 2 });
    expect(decodeAnim(c)).toEqual({ phase: 'recover', kind: 'heavy', combo: 2 });
  });
});
