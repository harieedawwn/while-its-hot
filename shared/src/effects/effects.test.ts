import { describe, expect, it } from 'vitest';
import { BALANCE } from '../balance';
import { familyForms, passivesOf } from '../data/weapons';
import { hitEffects, isInline, parryEffects, pendingPassives, reachFor, slamEffects, type PassiveId } from '../passives';
import type { Atom } from './atoms';
import { arena, run } from './test-kit';
import type { EffectWorld } from './world';

const E = BALANCE.effects;

/** Every trigger a row can have: heavy + light swings, a landed heavy/light 3rd hit, a parry, a slam. */
function everything(passives: readonly PassiveId[]) {
  const x = arena(passives), { w, me, a } = x;
  const atoms = (l: ReturnType<typeof hitEffects>) => l.filter((e): e is Atom => !isInline(e));
  w.swing(me, 'heavy', 0, 0.2);
  w.swing(me, 'light', 2, 0.1);
  for (const e of atoms(hitEffects(passives, { kind: 'heavy', combo: 0, dist: 2, reach: 2 }))) w.apply(me, a, e);
  for (const e of atoms(hitEffects(passives, { kind: 'light', combo: 2, dist: 2, reach: 2 }))) w.apply(me, a, e);
  for (const e of atoms(parryEffects(passives))) w.apply(me, a, e);
  for (const e of atoms(slamEffects(passives))) w.apply(me, null, e);
  run(w, 3.5);
  return x;
}

describe('effect toolkit (phase 28)', () => {
  it('every kiem/bua row 18–45 has hooks and does something', () => {
    const pend = new Set(pendingPassives());
    for (const fam of ['kiem', 'bua'] as const) {
      for (const f of familyForms(fam).filter((d) => d.minLevel >= 18)) {
        const ids = passivesOf(f);
        for (const id of ids) expect(pend.has(id), `${f.id}: ${id}`).toBe(false);
        const { sink, w } = everything(ids);
        const slam = slamEffects(ids).some(isInline);
        expect(sink.total + w.live.length + (slam ? 1 : 0), f.id).toBeGreaterThan(0);
      }
    }
  });

  it('a flying slash flies, hits each foe once, and holds its cooldown', () => {
    const { w, me, sink } = arena(['flying_slash']);
    w.swing(me, 'heavy', 0, 0);
    w.swing(me, 'heavy', 0, 0);
    expect(w.live.filter((e) => e.k === 'slash')).toHaveLength(1);
    run(w, 1);
    expect(sink.dmg.map((d) => d.t).sort()).toEqual([2, 3]);
    expect(sink.dmg.every((d) => d.d === E.slash.dmg)).toBe(true);
    w.swing(me, 'heavy', 0, 0);
    expect(w.live.filter((e) => e.k === 'slash')).toHaveLength(0);
    run(w, E.slash.cd);
    w.swing(me, 'heavy', 0, 0);
    expect(w.live.filter((e) => e.k === 'slash')).toHaveLength(1);
  });

  it('every active atom respects its cooldown', () => {
    const cds: [PassiveId, number, string][] = [['meteor_heavy', E.meteor.cd, 'meteor'], ['fire_column_heavy', E.column.cd, 'column'],
      ['piston_blast', E.piston.cd, 'piston'], ['chain_lightning_heavy', E.chain.cd, 'chain'], ['anchor_throw', E.anchor.cd, 'anchor'],
      ['mountain_crack', E.crack.cd, 'crack'], ['black_hole_heavy', E.eclipse.cd, 'eclipse'], ['star_black_hole', E.star.cd, 'star'],
      ['gravity_pin', E.gravityPin.cd, 'pin'], ['magnet_pull_heavy', E.magnet.cd, 'magnet'], ['chain_whip', E.whip.cd, 'whip'],
      ['bell_wave_heavy', E.bellWave.cd, 'bell_wave'], ['lava_pool_ground', E.lavaPool.cd, 'pool']];
    for (const [id, cd, key] of cds) {
      const { w, me, sink } = arena([id]);
      w.swing(me, 'heavy', 0, 0);
      const n1 = sink.total + w.live.length;
      w.swing(me, 'heavy', 0, 0);
      expect(sink.total + w.live.length, id).toBe(n1);
      expect(w.cdLeft(`${key}:1`), id).toBeCloseTo(cd, 5);
    }
  });

  it('freeze on the 3rd light has a per-target cooldown', () => {
    const { w, me, a, b, sink } = arena(['freeze_combo3']);
    const fr = hitEffects(['freeze_combo3'], { kind: 'light', combo: 2, dist: 2, reach: 2 }) as Atom[];
    w.apply(me, a, fr[0]); w.apply(me, a, fr[0]); w.apply(me, b, fr[0]);
    expect(sink.st.filter((s) => s.k === 'freeze').map((s) => s.t)).toEqual([2, 3]);
    run(w, E.freeze.cdTarget + 0.1);
    w.apply(me, a, fr[0]);
    expect(sink.st.filter((s) => s.k === 'freeze')).toHaveLength(3);
  });

  it('a black hole never holds anyone longer than its cap, even walking in and out', () => {
    for (const [id, H] of [['black_hole_heavy', E.eclipse], ['star_black_hole', E.star]] as const) {
      const { w, me, a, sink } = arena([id]);
      w.swing(me, 'heavy', 0, 0);
      for (let t = 0; t < H.s + 0.5; t += 0.05) { a.z = -2 - (Math.floor(t * 4) % 2) * 20; w.tick(0.05); }
      const held = sink.st.filter((s) => s.k === 'well' && s.t === 2).reduce((n, s) => n + s.s, 0);
      expect(held, id).toBeGreaterThan(0);
      expect(held, id).toBeLessThanOrEqual(H.capS + 1e-9);
    }
  });

  it('the star implodes for its damage; the meteor lands after its delay', () => {
    const s1 = arena(['star_black_hole']);
    s1.w.swing(s1.me, 'heavy', 0, 0); run(s1.w, E.star.s + 0.2);
    expect(s1.sink.dmg.find((d) => d.k === 'boom')?.d).toBe(E.star.boom);
    const s2 = arena(['meteor_heavy']);
    s2.me.pitch = -0.6;
    s2.w.swing(s2.me, 'heavy', 0, 0); run(s2.w, E.meteor.delayS - 0.1);
    expect(s2.sink.dmg).toHaveLength(0);
    run(s2.w, 0.2);
    expect(s2.sink.dmg.some((d) => d.k === 'meteor_hit')).toBe(true);
  });

  it('rubber launch bounces, chain lightning hops up to n foes, whip reach adds to lights only', () => {
    const r = arena(['rubber_launch']);
    for (const e of hitEffects(['rubber_launch'], { kind: 'heavy', combo: 0, dist: 2, reach: 2 }) as Atom[]) r.w.apply(r.me, r.a, e);
    expect(r.sink.knocks[0].b).toBe(true);
    const c = arena(['chain_lightning_heavy']);
    c.w.swing(c.me, 'heavy', 0, 0);
    expect(c.sink.dmg.map((d) => d.t)).toEqual([2, 3]);
    expect(reachFor(['light_reach_plus'], 2.3, 'light')).toBeCloseTo(2.8);
    expect(reachFor(['light_reach_plus'], 2.3, 'heavy')).toBeCloseTo(2.3);
  });
});

describe('effect entities on the wire', () => {
  it('round-trip through the snapshot', async () => {
    const { encodeSnapshot, decodeSnapshot } = await import('../net/codec');
    const { w, me } = arena(['flying_slash', 'orbit_blades']);
    w.swing(me, 'heavy', 0, 0); w.tick(0.05);
    const ents = w.ents();
    const back = decodeSnapshot(encodeSnapshot({ serverTime: 5, players: [], ents }))!;
    expect(back.ents!.map((e) => e.k).sort()).toEqual(ents.map((e) => e.k).sort());
    const a = ents.find((e) => e.k === 'slash')!, b = back.ents!.find((e) => e.k === 'slash')!;
    expect(b.x).toBeCloseTo(a.x, 1); expect(b.vz).toBeCloseTo(a.vz, 1); expect(b.age).toBeCloseTo(a.age, 2);
    expect(decodeSnapshot(encodeSnapshot({ serverTime: 5, players: [] }))!.ents).toEqual([]);
  });
});
