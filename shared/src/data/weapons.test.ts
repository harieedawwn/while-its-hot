import { describe, expect, it } from 'vitest';
import { BALANCE } from '../balance';
import { framesFor } from '../combat/frames';
import { applyAttack, hitEffects, parryWindow, PASSIVE_IDS, pendingPassives, slamEffects, type AttackShape } from '../passives';
import { dmgScale, FAMILIES, familyForms, formFor, passivesOf, timeMulAt, traitsOf, WEAPON_IDS, WEAPONS, weaponById, type Family } from './weapons';

const base: AttackShape = { dmg: 10, arcDeg: 90, lungeM: 2, staggerS: 0.5, ignoresBlock: false, breaksBlock: false };
const W = BALANCE.weapons;

describe('weapon data (ROSTER: 4 × 15 + phoi)', () => {
  it('has 61 unique snake_case ids, no thương left', () => {
    expect(WEAPONS).toHaveLength(61);
    expect(FAMILIES).toEqual(['kiem', 'bua', 'dao', 'tay']);
    expect(new Set(WEAPON_IDS).size).toBe(WEAPON_IDS.length);
    for (const id of WEAPON_IDS) expect(id).toMatch(/^[a-z][a-z0-9_]*$/);
    for (const id of ['giao_sat', 'thuong_thep', 'kich', 'dai_dao', 'tram_ma_dao']) expect(WEAPON_IDS).not.toContain(id);
  });
  it('a form every 3 levels from +3 to +45', () => {
    for (const f of FAMILIES) expect(familyForms(f).map((w) => w.minLevel)).toEqual(Array.from({ length: 15 }, (_, i) => 3 + 3 * i));
    expect(weaponById('phoi').family).toBeNull();
  });
  it('every listed passive is registered', () => {
    for (const p of WEAPONS.flatMap((w) => w.passives)) expect(PASSIVE_IDS).toContain(p);
  });
  it('forms by level; rows are complete lists (not cumulative)', () => {
    expect(formFor('kiem', 2).id).toBe('phoi');
    expect(formFor(null, 12).id).toBe('phoi');
    expect([3, 5, 6, 9, 12, 15, 44, 45].map((l) => formFor('kiem', l).id))
      .toEqual(['kiem_tho', 'kiem_tho', 'kiem_thep', 'kiem_ban_rong', 'truong_kiem', 'kiem_toi_lua', 'kiem_nhat_thuc', 'kiem_mat_troi']);
    expect(formFor('dao', 3).id).toBe('dao_gam');
    expect(formFor('tay', 45).id).toBe('gang_troi');
    expect(passivesOf(weaponById('kiem_toi_lua'))).toEqual(['combo3_bonus', 'parry_window_plus', 'thrust_pierce', 'burn_on_hit']);
    expect(passivesOf(weaponById('kiem_rang_cua'))).toEqual(['burn_strong', 'slow_on_hit', 'thrust_pierce']);
    expect(passivesOf(weaponById('bua_ren'))).toEqual([]);
  });
  it('family stats and traits (ROUND3 §4)', () => {
    expect(weaponById('kiem_thep').stats).toMatchObject({ reach: 2.3, light: 12, heavy: 30, comboHits: 3 });
    expect(weaponById('bua_de').stats).toMatchObject({ heavy: 40, light: 15, comboHits: 2 });
    expect(weaponById('dao_gam').stats).toMatchObject({ light: 7, heavy: 18, comboHits: 4, reach: 1.6 });
    expect(weaponById('gang_sat').stats).toMatchObject({ light: 6, heavy: 20, comboHits: 4, reach: 1.5 });
    expect(weaponById('phoi').stats).toMatchObject({ moveset: 'kiem', light: 9, heavy: 20 });
    expect(traitsOf(weaponById('dao_gam'))).toMatchObject({ move: 1.2, airJumps: 1, slide: { speed: 1.25, len: 1.3, cd: 0.6 } });
    expect(traitsOf(weaponById('gang_sat')).taken).toBe(1.1);
    expect(traitsOf(weaponById('bua_ren')).move).toBe(0.92);
    expect(traitsOf(weaponById('phoi'))).toMatchObject({ move: 1, airJumps: 0, taken: 1 });
    expect(framesFor(weaponById('dao_gam'), 'heavy', 0).lungeM).toBe(3);
  });
  it('scaling formulas', () => {
    expect(dmgScale('kiem', 10)).toBeCloseTo(1.45);
    expect(dmgScale('bua', 10)).toBeCloseTo(1 + 0.2 + 0.12);
    expect(dmgScale('dao', 20)).toBeCloseTo(1.7);
    expect(dmgScale('tay', 20)).toBeCloseTo(1.6);
    expect(timeMulAt('bua', 12)).toBe(1);
    expect(timeMulAt('bua', 30)).toBeCloseTo(0.7);
    expect(timeMulAt('bua', 21)).toBeCloseTo(0.85);
    expect(timeMulAt('kiem', 45)).toBe(1);
    expect(weaponById('bua_sao_lun').stats.timeMul).toBeCloseTo(0.7);
  });
});

/** Light DPS: average light hit × scale / swing time (combo bonuses and form effects left out). */
function lightDps(f: Family, level: number): number {
  const def = formFor(f, level);
  const t = framesFor(def, 'light', 0);
  return (def.stats.light * dmgScale(f, level)) / (t.w + t.a + t.r);
}
describe('DPS table (ROUND3 §4)', () => {
  const lv = [3, 15, 30, 45];
  const table = Object.fromEntries(FAMILIES.map((f) => [f, lv.map((l) => lightDps(f, l))])) as Record<Family, number[]>;
  const rank = (i: number) => FAMILIES.slice().sort((a, b) => table[a][i] - table[b][i]);
  it('bua is lowest at +3 and highest at +45', () => {
    expect(rank(0)[0]).toBe('bua');
    expect(rank(3)[3]).toBe('bua');
  });
  it('tay has the lowest raw light DPS from +15 on (its power is in the forms)', () => {
    for (const i of [1, 2, 3]) expect(rank(i)[0]).toBe('tay');
  });
  it('kiem is steady: DPS grows linearly with level and is never the lowest', () => {
    const k = table.kiem, per = (k[1] - k[0]) / 12;
    expect((k[2] - k[1]) / 15).toBeCloseTo(per, 6);
    expect((k[3] - k[2]) / 15).toBeCloseTo(per, 6);
    for (const i of [0, 1, 2, 3]) expect(rank(i)[0]).not.toBe('kiem');
  });
  it('dao swings fastest at every level', () => {
    for (const l of lv) {
      const s = (f: Family) => { const t = framesFor(formFor(f, l), 'light', 0); return t.w + t.a + t.r; };
      for (const f of FAMILIES) if (f !== 'dao') expect(s('dao')).toBeLessThan(s(f));
    }
  });
});

describe('passive hooks', () => {
  const P = W.passive;
  it('fold attack modifiers', () => {
    const ids = passivesOf(weaponById('truong_kiem'));
    expect(applyAttack(ids, base, { kind: 'light', combo: 2, dist: 1, reach: 2.3 }).dmg).toBeCloseTo(10 * P.combo3Mul);
    expect(applyAttack(ids, base, { kind: 'light', combo: 1, dist: 1, reach: 2.3 }).dmg).toBe(10);
    expect(applyAttack(ids, base, { kind: 'heavy', combo: 0, dist: 1, reach: 2.3 }).ignoresBlock).toBe(true);
    expect(parryWindow(ids, 0.16)).toBeCloseTo(0.16 + P.parryPlusS);
    expect(base.dmg).toBe(10);
    expect(applyAttack(passivesOf(weaponById('dao_phay')), base, { kind: 'light', combo: 3, dist: 1, reach: 1.6 }).dmg).toBeCloseTo(10 * P.combo4Mul);
    expect(applyAttack(passivesOf(weaponById('dao_hai_luoi')), base, { kind: 'slide', combo: 0, dist: 1, reach: 1.6 }).dmg).toBeCloseTo(10 * P.afterSlideMul);
  });
  it('emit hit and slam effects', () => {
    const bua = passivesOf(weaponById('bua_de'));
    expect(applyAttack(bua, base, { kind: 'light', combo: 0, dist: 1, reach: 2 }).breaksBlock).toBe(true);
    expect(applyAttack(bua, base, { kind: 'heavy', combo: 0, dist: 1, reach: 2 }).staggerS).toBeCloseTo(0.5 + P.staggerPlusS);
    expect(hitEffects(bua, { kind: 'heavy', combo: 0, dist: 1, reach: 2 }).map((e) => e.type)).toEqual(['launch', 'shockwave']);
    expect(hitEffects(bua, { kind: 'light', combo: 0, dist: 1, reach: 2 })).toEqual([]);
    expect(slamEffects(bua)).toEqual([{ type: 'aoe', dmg: P.slamAoe.dmg, r: P.slamAoe.r }]);
    expect(hitEffects(passivesOf(weaponById('kiem_toi_lua')), { kind: 'light', combo: 0, dist: 1, reach: 2 })[0].type).toBe('burn');
    expect(hitEffects(passivesOf(weaponById('kiem_rang_cua')), { kind: 'light', combo: 0, dist: 1, reach: 2 })[0]).toMatchObject({ dps: P.burnStrong.dps });
  });
  it('lists the ids that are still no-ops (phase 28: kiem/bua, phase 29: dao/tay empty this list)', () => {
    expect(pendingPassives().sort()).toEqual([
      'anchor_throw', 'backstab_bonus', 'bell_ring', 'bell_wave_heavy', 'black_hole_heavy', 'blade_storm', 'chain_lightning_heavy',
      'chain_whip', 'combo4_knock', 'fire_column_heavy', 'fireball_heavy', 'flying_slash', 'flying_slash_burn', 'flying_slash_strong',
      'freeze_combo3', 'freeze_combo4', 'giant_hand', 'gravity_pin', 'gravity_well_throw', 'heal_on_hit', 'heal_on_hit_2', 'heavy_push',
      'heavy_push_far', 'hook_lunge', 'iceball_heavy', 'kill_full_heal', 'lava_crack', 'lava_pool_ground', 'light_pull', 'light_push',
      'light_reach_plus', 'light_shockwave', 'magnet_pull_heavy', 'magnet_punch', 'meteor_combo4', 'meteor_heavy', 'meteor_rain',
      'mountain_crack', 'orbit_blades', 'parry_blink', 'parry_slash', 'piston_blast', 'piston_charge', 'poison_on_hit', 'rift_dash',
      'rocket_fist', 'rubber_launch', 'shadow_invis', 'sky_hand', 'slam_double', 'slam_lava_big', 'slash_all_lights', 'slash_ice_floor',
      'slide_decoy', 'slide_fire_trail', 'slide_long', 'slow_on_hit', 'spark_on_hit', 'speed_stacks', 'star_black_hole', 'stone_wall',
      'throw_burn', 'throw_knife', 'throw_poison', 'time_slow_heavy', 'triple_jump',
    ]);
    // every id is used by at least one row
    const used = new Set(WEAPONS.flatMap((w) => w.passives));
    for (const id of PASSIVE_IDS) expect(used.has(id)).toBe(true);
  });
});
