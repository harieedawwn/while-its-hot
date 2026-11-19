import { describe, expect, it } from 'vitest';
import { BALANCE } from '../balance';
import { applyAttack, hitEffects, parryWindow, PASSIVE_IDS, slamEffects, type AttackShape } from '../passives';
import { FAMILIES, familyForms, formFor, passivesOf, WEAPON_IDS, WEAPONS, weaponById } from './weapons';

const base: AttackShape = { dmg: 10, arcDeg: 90, lungeM: 2, staggerS: 0.5, ignoresBlock: false, breaksBlock: false };

describe('weapon data', () => {
  it('has 16 unique snake_case ids', () => {
    expect(WEAPONS).toHaveLength(16);
    expect(new Set(WEAPON_IDS).size).toBe(WEAPON_IDS.length);
    for (const id of WEAPON_IDS) expect(id).toMatch(/^[a-z][a-z0-9_]*$/);
  });
  it('each family starts at the pick level with strictly rising minLevels', () => {
    for (const f of FAMILIES) {
      const lv = familyForms(f).map((w) => w.minLevel);
      expect(lv[0]).toBe(BALANCE.weapons.familyPick);
      for (let i = 1; i < lv.length; i++) expect(lv[i]).toBeGreaterThan(lv[i - 1]);
      expect(lv[lv.length - 1]).toBeLessThanOrEqual(BALANCE.weapons.maxLevel);
    }
    expect(weaponById('phoi').family).toBeNull();
  });
  it('every passive is registered and used once', () => {
    const used = WEAPONS.flatMap((w) => w.passives);
    for (const p of used) expect(PASSIVE_IDS).toContain(p);
    expect(new Set(used).size).toBe(used.length);
  });
  it('stats follow the family moveset', () => {
    expect(weaponById('kiem_thep').stats.reach).toBe(2.3);
    expect(weaponById('bua_de').stats.heavy).toBe(45);
    expect(weaponById('phoi').stats).toMatchObject({ moveset: 'kiem', light: 9, heavy: 20 });
  });
  it('forms by level never go backwards and passives stack within a family', () => {
    expect(formFor('kiem', 2).id).toBe('phoi');
    expect(formFor(null, 12).id).toBe('phoi');
    expect([3, 5, 6, 13, 14, 20].map((l) => formFor('thuong', l).id))
      .toEqual(['giao_sat', 'giao_sat', 'thuong_thep', 'kich', 'dai_dao', 'tram_ma_dao']);
    expect(passivesOf(weaponById('kiem_toi_lua'))).toEqual(['combo3_bonus', 'parry_window_plus', 'thrust_pierce', 'burn_on_hit']);
    expect(passivesOf(weaponById('bua_ren'))).toEqual([]);
  });
});

describe('passive hooks', () => {
  const P = BALANCE.weapons.passive;
  it('fold attack modifiers', () => {
    const ids = passivesOf(weaponById('truong_kiem'));
    expect(applyAttack(ids, base, { kind: 'light', combo: 2, dist: 1, reach: 2.3 }).dmg).toBeCloseTo(10 * P.combo3Mul);
    expect(applyAttack(ids, base, { kind: 'light', combo: 1, dist: 1, reach: 2.3 }).dmg).toBe(10);
    expect(applyAttack(ids, base, { kind: 'heavy', combo: 0, dist: 1, reach: 2.3 }).ignoresBlock).toBe(true);
    expect(parryWindow(ids, 0.16)).toBeCloseTo(0.16 + P.parryPlusS);
    expect(base.dmg).toBe(10);
    const th = passivesOf(weaponById('kich'));
    expect(applyAttack(th, base, { kind: 'light', combo: 0, dist: 3.1, reach: 3.2 }).dmg).toBeCloseTo(10 * P.maxReach.mul);
    expect(applyAttack(th, base, { kind: 'heavy', combo: 0, dist: 1, reach: 3.2 }).arcDeg).toBe(P.sweepArcDeg);
    expect(applyAttack(passivesOf(weaponById('dai_dao')), base, { kind: 'dash', combo: 0, dist: 1, reach: 3.2 }).lungeM).toBeCloseTo(3);
  });
  it('emit hit and slam effects', () => {
    const bua = passivesOf(weaponById('bua_de'));
    expect(applyAttack(bua, base, { kind: 'light', combo: 0, dist: 1, reach: 2 }).breaksBlock).toBe(true);
    expect(applyAttack(bua, base, { kind: 'heavy', combo: 0, dist: 1, reach: 2 }).staggerS).toBeCloseTo(0.5 + P.staggerPlusS);
    expect(hitEffects(bua, { kind: 'heavy', combo: 0, dist: 1, reach: 2 }).map((e) => e.type)).toEqual(['launch', 'shockwave']);
    expect(hitEffects(bua, { kind: 'light', combo: 0, dist: 1, reach: 2 })).toEqual([]);
    expect(slamEffects(bua)).toEqual([{ type: 'aoe', dmg: P.slamAoe.dmg, r: P.slamAoe.r }]);
    expect(hitEffects(passivesOf(weaponById('kiem_toi_lua')), { kind: 'light', combo: 0, dist: 1, reach: 2 })[0].type).toBe('burn');
    expect(hitEffects(passivesOf(weaponById('tram_ma_dao')), { kind: 'heavy', combo: 0, dist: 1, reach: 3 })).toEqual([{ type: 'pull', m: P.pullM }]);
  });
});
