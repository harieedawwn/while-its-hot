import { describe, expect, it } from 'vitest';
import { BALANCE } from '../balance';
import { resolveHit } from '../combat/damage';
import { attackShape } from '../combat/frames';
import { familyForms, traitsOf, weaponById } from '../data/weapons';
import { chargeMulOf, hitEffects, killEffects, parryEffects, PASSIVE_IDS, slideOf, type AttackShape } from '../passives';
import type { Atom } from './atoms';
import { arena, run } from './test-kit';

const D = BALANCE.effects.dao, T = BALANCE.effects.tay, E = BALANCE.effects;
const ctx = (kind: 'light' | 'heavy', combo = 0, back = false) => ({ kind, combo, dist: 2, reach: 2, back });
const atoms = (l: ReturnType<typeof hitEffects>) => l as Atom[];

describe('dao rows (phase 29)', () => {
  it('backstab multiplies only from behind; slide/jump traits fold in', () => {
    const shape: AttackShape = attackShape(weaponById('dao_moc'), 'light', 0);
    expect(shape.backMul).toBe(D.backMul);
    const def = { x: 0, z: 0, yaw: 0, parrying: false, blocking: false, immune: false, stamina: 3, armorLevel: 0 };
    const hit = (z: number) => resolveHit({ x: 0, z, shape, family: 'dao', weaponLevel: 0 }, def);
    const front = hit(-2), back = hit(2);
    if (front.r !== 'hit' || back.r !== 'hit') throw new Error('expected hits');
    expect(back.dmg / front.dmg).toBeCloseTo(D.backMul, 5);
    expect(attackShape(weaponById('dao_gam'), 'light', 0).backMul).toBeUndefined();
    expect(traitsOf(weaponById('dao_ngoc')).airJumps).toBe(2);
    expect(traitsOf(weaponById('dao_gam')).airJumps).toBe(1);
    expect(traitsOf(weaponById('dao_hai_luoi')).slide.len).toBeCloseTo(1.3 * D.slideLen, 5);
    expect(slideOf(['slide_fire_trail'])).toBe('trail');
    expect(chargeMulOf(['piston_charge'])).toBe(T.chargeMul);
  });

  it('poison stacks to 3 and fades; haste stacks to 5', () => {
    const { w, me, a, sink } = arena(['poison_on_hit', 'speed_stacks']);
    for (let i = 0; i < 5; i++) for (const e of atoms(hitEffects(['poison_on_hit', 'speed_stacks'], ctx('light')))) w.apply(me, a, e);
    expect(sink.burnDps).toEqual([2, 4, 6, 6, 6]);
    const haste = sink.st.filter((s) => s.k === 'haste').map((s) => s.v);
    expect(haste[4]).toBeCloseTo(1 + 5 * D.haste.per, 5);
    run(w, D.poison.s + 0.2);
    for (const e of atoms(hitEffects(['poison_on_hit'], ctx('light')))) w.apply(me, a, e);
    expect(sink.burnDps.at(-1)).toBe(2);
  });

  it('shadow: invisible after a backstab or a kill; any swing ends it', () => {
    const { w, me, a, sink } = arena(['shadow_invis']);
    for (const e of atoms(hitEffects(['shadow_invis'], ctx('light', 0, false)))) w.apply(me, a, e);
    expect(sink.st.filter((s) => s.k === 'invis')).toHaveLength(0);
    for (const e of atoms(hitEffects(['shadow_invis'], ctx('light', 0, true)))) w.apply(me, a, e);
    expect(sink.st.at(-1)).toMatchObject({ k: 'invis', s: D.invis.s });
    w.swing(me, 'light', 0, 0);
    expect(sink.st.at(-1)).toMatchObject({ k: 'invis', s: 0 });
    for (const e of atoms(killEffects(['shadow_invis']))) w.apply(me, a, e);
    expect(sink.st.at(-1)).toMatchObject({ k: 'invis', s: D.invis.s });
  });

  it('a thrown knife flies out, hits once, comes back and is gone; poison knife poisons; cd holds', () => {
    const { w, me, sink } = arena(['throw_poison']);
    w.swing(me, 'heavy', 0, 0); w.swing(me, 'heavy', 0, 0);
    expect(w.live.filter((e) => e.k === 'knife')).toHaveLength(1);
    run(w, 0.55);
    expect(sink.dmg.filter((d) => d.k === 'knife').map((d) => d.t).sort()).toEqual([2, 3]);
    expect(sink.burns).toHaveLength(2);
    expect(w.live.find((e) => e.k === 'knife')!.vz).toBeGreaterThan(0);
    run(w, 0.6);
    expect(w.live.filter((e) => e.k === 'knife')).toHaveLength(0);
    expect(sink.dmg.filter((d) => d.k === 'knife')).toHaveLength(2);
    expect(w.cdLeft('knife:1')).toBeGreaterThan(0);
  });

  it('hook lunge dashes the owner at a foe in front (not behind); blink lands behind the attacker', () => {
    const h = arena(['hook_lunge']);
    h.w.swing(h.me, 'heavy', 0, 0);
    expect(h.sink.knocks).toHaveLength(1);
    expect(h.sink.knocks[0].t).toBe(1);
    expect(h.sink.knocks[0].v[2]).toBeLessThan(0);
    const h2 = arena(['hook_lunge']);
    h2.me.yaw = Math.PI;
    h2.w.swing(h2.me, 'heavy', 0, 0);
    expect(h2.sink.knocks).toHaveLength(0);
    const b = arena(['parry_blink']);
    for (const e of atoms(parryEffects(['parry_blink']))) b.w.apply(b.me, b.a, e);
    expect(b.sink.tps[0]).toMatchObject({ t: 1 });
    expect(b.sink.tps[0].p[2]).toBeCloseTo(b.a.z + D.blink.behind, 5);
    expect(b.sink.st.at(-1)).toMatchObject({ k: 'invis', s: D.invis.parryS });
  });

  it('rift dash cuts everyone on the line for its damage and moves the owner 12 m', () => {
    const { w, me, sink } = arena(['rift_dash']);
    w.swing(me, 'heavy', 0, 0);
    expect(sink.dmg.filter((d) => d.k === 'rift').map((d) => d.d)).toEqual([D.rift.dmg, D.rift.dmg]);
    expect(sink.tps[0].p[2]).toBeCloseTo(-D.rift.range, 5);
    w.swing(me, 'heavy', 0, 0);
    expect(sink.tps).toHaveLength(1);
  });

  it('blade storm ticks for 2 s at most; time field slows others inside and not the owner', () => {
    const s = arena(['blade_storm']);
    s.w.swing(s.me, 'heavy', 0, 0);
    run(s.w, D.storm.s + 1);
    const n = s.sink.dmg.filter((d) => d.k === 'storm' && d.t === 2).length;
    expect(n).toBeGreaterThanOrEqual(7);
    expect(n).toBeLessThanOrEqual(Math.ceil(D.storm.s / D.storm.every) + 1);
    const f = arena(['time_slow_heavy']);
    f.w.swing(f.me, 'heavy', 0, 0);
    run(f.w, 0.5);
    const slowed = new Set(f.sink.st.filter((x) => x.k === 'slow' && x.v === D.timefield.slow).map((x) => x.t));
    expect([...slowed].sort()).toEqual([2, 3].filter((id) => id === 2 || Math.hypot(0.6, 4.5) <= D.timefield.r));
    expect(slowed.has(1)).toBe(false);
  });

  it('a slide leaves a decoy that blows up a foe who swings at it, and a fire trail within the entity cap', () => {
    const d = arena(['slide_decoy']);
    d.me.sliding = true;
    run(d.w, 0.1);
    expect(d.w.live.filter((e) => e.k === 'decoy')).toHaveLength(1);
    d.me.sliding = false; d.me.x = 20;
    d.a.swinging = true; d.a.x = 0; d.a.z = -1;
    run(d.w, 0.1);
    expect(d.sink.dmg.find((x) => x.k === 'boom')?.d).toBe(D.decoy.dmg);
    const t = arena(['slide_fire_trail']);
    t.me.sliding = true;
    run(t.w, 3);
    expect(t.w.live.filter((e) => e.k === 'lava').length).toBeGreaterThan(3);
    expect(t.w.live.length).toBeLessThanOrEqual(E.maxPerOwner);
  });
});

describe('tay rows (phase 29)', () => {
  it('heals, full heal on a kill, pulls and pushes come out of the hooks', () => {
    const { w, me, a, sink } = arena(['heal_on_hit_2', 'kill_full_heal']);
    for (const e of atoms(hitEffects(['heal_on_hit_2'], ctx('light')))) w.apply(me, a, e);
    for (const e of atoms(killEffects(['kill_full_heal']))) w.apply(me, a, e);
    expect(sink.heals.map((h) => h.hp)).toEqual([2, BALANCE.combat.hp]);
    expect(sink.heals.every((h) => h.t === 1)).toBe(true);
    expect(hitEffects(['combo4_knock'], ctx('light', 2))).toHaveLength(0);
    expect(hitEffects(['combo4_knock'], ctx('light', 3))[0]).toMatchObject({ type: 'push', v: T.combo4Knock * T.mToV });
    expect(hitEffects(['heavy_push_far'], ctx('heavy'))[0]).toMatchObject({ type: 'push', v: T.farPush * T.mToV });
    expect(hitEffects(['light_pull'], ctx('light'))[0]).toMatchObject({ type: 'pull', m: T.lightPull });
    expect(hitEffects(['freeze_combo4'], ctx('light', 3))).toHaveLength(1);
    expect(hitEffects(['freeze_combo4'], ctx('light', 2))).toHaveLength(0);
  });

  it('projectiles explode on the first foe: fire burns, ice slows, rocket is the big one', () => {
    for (const [id, k] of [['fireball_heavy', 'fireball'], ['iceball_heavy', 'iceball'], ['rocket_fist', 'rocket']] as const) {
      const { w, me, sink } = arena([id]);
      w.swing(me, 'heavy', 0, 0); w.swing(me, 'heavy', 0, 0);
      expect(w.live.filter((e) => e.k === k), id).toHaveLength(1);
      run(w, 1.2);
      const P = T.proj[k];
      expect(sink.dmg.filter((d) => d.k === k).map((d) => d.d), id).toContain(P.dmg);
      expect(sink.dmg.some((d) => d.t === 3 && d.k === k), `${id} splash`).toBe(P.boomR >= 2.6);
      expect(w.live.filter((e) => e.k === k && !e.done), id).toHaveLength(0);
      if (k === 'fireball') expect(sink.burns.length).toBeGreaterThan(0);
      if (k === 'iceball') expect(sink.st.some((s) => s.k === 'slow' && s.v === T.proj.iceball.slow)).toBe(true);
    }
  });

  it('spark hops to a second foe; the wall needs a look at the ground; magnet punch pulls then hits', () => {
    const sp = arena(['spark_on_hit']);
    for (const e of atoms(hitEffects(['spark_on_hit'], ctx('light')))) sp.w.apply(sp.me, sp.a, e);
    expect(sp.sink.dmg).toEqual([{ t: 3, d: T.spark.dmg, k: 'chain' }]);
    const wl = arena(['stone_wall']);
    wl.w.swing(wl.me, 'heavy', 0, 0);
    expect(wl.w.live).toHaveLength(0);
    wl.me.pitch = -0.9;
    wl.w.swing(wl.me, 'heavy', 0, 0);
    expect(wl.w.live.filter((e) => e.k === 'wall')).toHaveLength(1);
    run(wl.w, T.wall.s + 0.1);
    expect(wl.w.live).toHaveLength(0);
    const mg = arena(['magnet_punch']);
    mg.w.swing(mg.me, 'heavy', 0, 0);
    expect(mg.sink.knocks).toHaveLength(2);
    expect(mg.sink.dmg).toHaveLength(0);
    mg.a.z = -T.magnetPunch.to; mg.b.z = -T.magnetPunch.to; mg.b.x = 0;
    run(mg.w, T.magnetPunch.delay + 0.1);
    expect(mg.sink.dmg.map((d) => d.d)).toEqual([T.magnetPunch.dmg, T.magnetPunch.dmg]);
  });

  it('hands land after their delay in their radius; gravity throw respects the hole cap; meteors', () => {
    for (const [id, H] of [['giant_hand', T.giant], ['sky_hand', T.sky]] as const) {
      const { w, me, a, sink } = arena([id]);
      me.pitch = -0.7;
      w.swing(me, 'heavy', 0, 0);
      const e = w.live.find((x) => x.k === 'hand')!;
      expect(e.r).toBe(H.r);
      a.x = e.x; a.z = e.z;
      run(w, H.delay - 0.1);
      expect(sink.dmg).toHaveLength(0);
      run(w, 0.2);
      expect(sink.dmg.find((d) => d.t === 2)?.d).toBe(H.dmg);
    }
    const g = arena(['gravity_well_throw']);
    g.w.swing(g.me, 'heavy', 0, 0);
    for (let t = 0; t < T.gravity.s + 0.5; t += 0.05) { g.a.z = -4 - (Math.floor(t * 4) % 2) * 30; g.w.tick(0.05); }
    const held = g.sink.st.filter((s) => s.k === 'well' && s.t === 2).reduce((n, s) => n + s.s, 0);
    expect(held).toBeGreaterThan(0);
    expect(held).toBeLessThanOrEqual(T.gravity.capS + 1e-9);
    const r = arena(['meteor_rain']);
    r.me.pitch = -0.5;
    r.w.swing(r.me, 'heavy', 0, 0);
    run(r.w, T.rain.n * T.rain.every + 0.1);
    expect(r.w.live.filter((e) => e.k === 'meteor').length + r.sink.fxs.filter((f) => f.k === 'meteor_hit').length).toBe(T.rain.n);
    const m = arena(['meteor_combo4']);
    for (const e of atoms(hitEffects(['meteor_combo4'], ctx('light', 3)))) m.w.apply(m.me, m.a, e);
    expect(m.w.live.find((e) => e.k === 'meteor')).toMatchObject({ x: 0, z: -2, dmg: T.meteorSmall.dmg });
  });

  it('every dao/tay row resolves: some hook fires for each id of each form', () => {
    for (const fam of ['dao', 'tay'] as const) {
      for (const f of familyForms(fam)) for (const id of f.passives) expect(PASSIVE_IDS, `${f.id}: ${id}`).toContain(id);
    }
  });
});
