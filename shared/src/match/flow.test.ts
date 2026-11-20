import { describe, expect, it } from 'vitest';
import { BALANCE } from '../balance';
import { MatchAuthority } from './authority';
import type { Out } from './mplayer';
import { burnDps, makeOffers, notorietyFor, ringRadius, roundWinner } from './rules';

const M = BALANCE.match;
const rng = () => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

describe('round rules', () => {
  it('ring is absent, then shrinks to min', () => {
    expect(ringRadius(M.ring.startS - 1)).toBe(0);
    expect(ringRadius(M.ring.startS)).toBe(M.ring.maxR);
    expect(ringRadius(M.ring.closedS)).toBe(M.ring.minR);
    // continuous: no step bigger than the shrink rate allows over one 60 fps frame, so the mesh can follow it per frame
    let prev = ringRadius(M.ring.startS), worst = 0;
    for (let t = M.ring.startS; t <= M.ring.closedS + 1; t += 1 / 60) { const r = ringRadius(t); worst = Math.max(worst, Math.abs(r - prev)); prev = r; }
    expect(worst).toBeLessThan(0.05);
    expect(ringRadius(M.ring.closedS + 50)).toBe(M.ring.minR);
    expect(burnDps(M.ring.startS)).toBe(6);
    expect(burnDps(M.ring.startS + 25)).toBe(10);
  });
  it('ring speed scales the closing time', () => {
    const span = M.ring.closedS - M.ring.startS;
    expect(ringRadius(M.ring.startS + span * 0.65, 2)).toBe(M.ring.minR);
    expect(ringRadius(M.ring.startS + span * 0.65, 1)).toBeGreaterThan(M.ring.minR);
    expect(ringRadius(M.ring.closedS, 0)).toBeGreaterThan(M.ring.minR);
  });
  it('the round machine uses the room rules', () => {
    const a = new MatchAuthority([1, 2], { lives: 1, rounds: 2, roundS: 120, truce: 0 }, rng(), 0, true);
    expect(a.flow.rules).toMatchObject({ lives: 1, rounds: 2, roundS: 120 });
    expect(a.init(1)).toMatchObject({ rules: { lives: 1, rounds: 2, roundS: 120 } });
    expect(a.flow.end).toBe(120_000);
  });
  it('winner: kills, then lives, then damage', () => {
    const r = (id: number, kills: number, lives: number, dealt: number) => ({ id, kills, lives, dealt, online: true });
    expect(roundWinner([r(1, 2, 1, 0), r(2, 1, 3, 99)]).win).toBe(1);
    expect(roundWinner([r(1, 1, 1, 0), r(2, 1, 2, 0)]).win).toBe(2);
    expect(roundWinner([r(1, 1, 2, 10), r(2, 1, 2, 50)]).win).toBe(2);
    expect(roundWinner([r(1, 0, 3, 0), r(2, 0, 3, 0)]).win).toBeNull();
    expect(roundWinner([r(1, 4, 3, 0), r(2, 1, 3, 0)]).lead).toBe(3);
    expect(notorietyFor(2)).toBe(1); expect(notorietyFor(3)).toBe(2);
  });
  it('offers: three distinct, last place gets rare relics and early modules', () => {
    const r = rng();
    const o = makeOffers([], false, 5, r);
    expect(new Set(o).size).toBe(3);
    const l = makeOffers(['an_sat'], true, 0, r);
    expect(l).toHaveLength(3); expect(l).not.toContain('an_sat');
  });
});

type Harmable = { harm(t: unknown, d: number, by: number, out: Out[]): void };
function runTo(a: MatchAuthority, from: number, ms: number, out: Out[]): number {
  let t = from; const end = from + ms;
  while (t < end) { t += 50; out.push(...a.tick(t)); }
  return t;
}

describe('round flow', () => {
  it('cage → fight → result → … → end after three round wins, with bounty and notoriety', () => {
    const a = new MatchAuthority([1, 2, 3], 0, rng(), 0), out: Out[] = [];
    const h = a as unknown as Harmable, [p1, p2, p3] = [1, 2, 3].map((i) => a.players.get(i)!);
    let t = runTo(a, 0, 100, out);
    expect(a.flow.ph).toBe('cage');
    expect(p1.offer).toHaveLength(3);
    a.msg(1, { t: 'draft', pick: p1.offer![1] }, t);
    expect(p1.relics).toHaveLength(1);
    t = runTo(a, t, M.cageS * 1000, out);
    expect(a.flow.ph).toBe('fight');
    expect(p2.relics).toHaveLength(1); // auto-picked
    for (let round = 1; round <= 3; round++) {
      expect(a.flow.n).toBe(round);
      p2.lives = 1; p3.lives = 1;
      const o: Out[] = [];
      h.harm(p2, 999, 1, o); h.harm(p3, 999, 1, o);
      out.push(...o);
      t = runTo(a, t, 100, out);
      expect(a.flow.ph).toBe('result');
      expect(a.flow.win).toBe(1);
      expect(p1.wins).toBe(round);
      if (round < 3) { t = runTo(a, t, (M.resultS + M.cageS) * 1000 + 200, out); expect(a.flow.ph).toBe('fight'); expect(a.flow.n).toBe(round + 1); }
    }
    t = runTo(a, t, M.resultS * 1000 + 200, out);
    expect(a.flow.ph).toBe('end');
    const end = out.find((o) => o.m.t === 'end');
    expect(end && end.m.t === 'end' && end.m.win).toBe(1);
    expect(p1.stacks).toBe(1); // lead of 2 kills = one stack (3+ earns two)
    expect(p1.pts).toBe(6);
  });

  it('nobody is hurt or respawns outside the fight; the ring burns outside it', () => {
    const a = new MatchAuthority([1, 2], 0, rng(), 0), out: Out[] = [];
    const h = a as unknown as Harmable;
    let t = runTo(a, 0, 100, out);
    const p = a.players.get(1)!;
    expect(a.flow.truceUntil()).toBe(Infinity);
    t = runTo(a, t, M.cageS * 1000, out);
    expect(a.flow.fighting).toBe(true);
    p.st.x = 100; p.st.z = 100; // far outside any ring
    const hp = p.hp;
    t = runTo(a, t, (M.ring.startS - 1) * 1000, out);
    expect(p.hp).toBe(hp);
    runTo(a, t, 4000, out);
    expect(p.hp).toBeLessThan(hp);
    void h;
  });
});

import { matchUnlocks } from '../unlocks';
describe('match unlocks', () => {
  it('unlocks the forms a family reached and raises bestLevel', () => {
    const r = matchUnlocks([8, 0, 0], { phoi: true, kiem_tho: true }, { kiem: 3, bua: 3, thuong: 3 });
    expect(r.forms.length).toBeGreaterThan(0);
    expect(r.forms).not.toContain('kiem_tho');
    expect(r.bestLevel.kiem).toBe(8); expect(r.bestLevel.bua).toBe(3);
    expect(matchUnlocks([0, 0, 0], {}, { kiem: 3 }).forms).toEqual([]);
  });
});

import { foldRelics, RELICS } from '../data/relics';
import { ForgeSession } from '../forge/session';
describe('relics', () => {
  it('fold combines effects; every relic changes something', () => {
    const f = foldRelics(['an_sat', 'vong_da', 'dinh_tan', 'dau_toi']);
    expect(f.dmgMul).toBeCloseTo(1.1); expect(f.cadenceMul).toBeCloseTo(0.8); expect(f.armorStart).toBe(2); expect(f.parryHp).toBe(5);
    for (const r of RELICS) expect(foldRelics([r.id])).not.toEqual(foldRelics([]));
  });
  it('da_niem prevents one Gãy, hon_than_do guarantees one Tuyệt', () => {
    const s = new ForgeSession(() => 0.99); // always rolls Hỏng
    s.noBreak = 1;
    expect(s.strike('miss').broke).toBe(false);
    expect(s.strike('miss').broke).toBe(true);
    const t = new ForgeSession(() => 0.99); t.tuyet = 1;
    expect(t.strike('miss').outcome).toBe('tuyet');
    expect(t.strike('miss').outcome).toBe('hong');
  });
});
