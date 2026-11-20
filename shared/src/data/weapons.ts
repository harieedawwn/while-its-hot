import { BALANCE } from '../balance';
import { type PassiveId, traitMods } from '../passives';

/**
 * Weapon roster (ROUND3 §4, docs/ROSTER.md): 4 families × 15 forms, forms at +3…+21 (every 3), +25…+37 (every 4), +42…+57 (every 5).
 * `passives` is the row's FULL effect list (not cumulative). Display names and effect lines live in
 * client/src/ui/strings.vi.ts, never here. `model` = the builder/GLB id (usually the weapon id); a form with
 * no model yet borrows the nearest lower form's (client/src/weapons/weapon.ts `modelFor`).
 */
export const FAMILIES = ['kiem', 'bua', 'dao', 'tay'] as const;
export type Family = (typeof FAMILIES)[number];
export type HeavyKind = 'thrust' | 'overhead' | 'lunge' | 'punch';

export interface WeaponStats {
  /** Which family moveset the form swings with (the blank swings a sword). */
  moveset: Family;
  light: number; heavy: number; comboHits: number; comboS: number; reach: number; heavyKind: HeavyKind;
  /** Attack time multiplier of this form (bua speeds up with level). */
  timeMul: number;
}
export interface WeaponDef {
  id: string; family: Family | null; minLevel: number;
  stats: WeaponStats; passives: readonly PassiveId[]; model: string;
}

const W = BALANCE.weapons;
const smooth = (a: number, b: number, x: number): number => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** Power level of a blade level: the old 3-per-form ladder (form index × 3 + 3), so a form hits the same however far apart the forms are. */
export function formEquivLevel(level: number): number {
  if (level < W.familyPick) return level;
  let i = 0;
  while (i + 1 < W.formLevels.length && level >= W.formLevels[i + 1]) i++;
  return i * 3 + 3;
}
/** Attack time multiplier at a level: 1 − k·smoothstep(from, to, L) for families with speedUp. */
export function timeMulAt(f: Family, level: number): number {
  level = formEquivLevel(level);
  const fam = W.family[f] as { speedUp?: { k: number; from: number; to: number } };
  return fam.speedUp ? 1 - fam.speedUp.k * smooth(fam.speedUp.from, fam.speedUp.to, level) : 1;
}
const stats = (f: Family, level: number): WeaponStats => {
  const s = W.family[f];
  return { moveset: f, light: s.light, heavy: s.heavy, comboHits: s.comboHits, comboS: s.comboS, reach: s.reach, heavyKind: s.heavyKind, timeMul: timeMulAt(f, level) };
};

/** One family's 15 forms in level order (BALANCE.weapons.formLevels): [id, passives]. */
type Rows = readonly (readonly [string, readonly PassiveId[]])[];
const ROSTER: Record<Family, Rows> = {
  kiem: [
    ['kiem_tho', []],
    ['kiem_thep', ['combo3_bonus']],
    ['kiem_ban_rong', ['combo3_bonus', 'parry_window_plus']],
    ['truong_kiem', ['combo3_bonus', 'parry_window_plus', 'thrust_pierce']],
    ['kiem_toi_lua', ['combo3_bonus', 'parry_window_plus', 'thrust_pierce', 'burn_on_hit']],
    ['kiem_rang_cua', ['burn_strong', 'slow_on_hit', 'thrust_pierce']],
    ['kiem_tram_nguyet', ['flying_slash', 'burn_strong', 'slow_on_hit']],
    ['kiem_dong_xanh', ['parry_slash', 'flying_slash_strong', 'burn_strong']],
    ['kiem_xich', ['chain_whip', 'light_reach_plus', 'flying_slash_strong']],
    ['kiem_hac_thach', ['lava_crack', 'flying_slash_burn']],
    ['kiem_bang', ['freeze_combo3', 'slash_ice_floor']],
    ['kiem_thien_thach', ['meteor_heavy', 'flying_slash_strong']],
    ['kiem_van_kiem', ['orbit_blades', 'meteor_heavy']],
    ['kiem_nhat_thuc', ['black_hole_heavy', 'orbit_blades']],
    ['kiem_mat_troi', ['slash_all_lights', 'fire_column_heavy']],
  ],
  bua: [
    ['bua_ren', []],
    ['bua_ta', ['light_break_block']],
    ['chuy_gai', ['light_break_block', 'stagger_plus']],
    ['bua_chien', ['light_break_block', 'stagger_plus', 'slam_aoe']],
    ['bua_de', ['light_break_block', 'stagger_plus', 'slam_aoe', 'heavy_launch']],
    ['bua_piston', ['piston_blast', 'light_break_block', 'stagger_plus', 'slam_aoe']],
    ['bua_cu_chuy', ['magnet_pull_heavy', 'piston_blast', 'slam_aoe']],
    ['bua_dung_nham', ['lava_pool_ground', 'slam_lava_big', 'magnet_pull_heavy']],
    ['bua_chuong', ['bell_ring', 'bell_wave_heavy', 'lava_pool_ground']],
    ['bua_cao_su', ['rubber_launch', 'light_push']],
    ['bua_sam', ['chain_lightning_heavy', 'rubber_launch', 'light_push']],
    ['bua_mo_neo', ['anchor_throw', 'chain_lightning_heavy']],
    ['bua_trong_luc', ['gravity_pin', 'slam_double', 'anchor_throw']],
    ['bua_nui', ['mountain_crack', 'gravity_pin']],
    ['bua_sao_lun', ['star_black_hole', 'light_shockwave']],
  ],
  dao: [
    ['dao_gam', []],
    ['dao_phay', ['combo4_bonus']],
    ['dao_moc', ['combo4_bonus', 'backstab_bonus']],
    ['dao_hai_luoi', ['slide_long', 'after_slide_bonus', 'backstab_bonus']],
    ['dao_nem', ['throw_knife', 'backstab_bonus']],
    ['dao_doc', ['poison_on_hit', 'throw_poison', 'backstab_bonus']],
    ['dao_bong', ['shadow_invis', 'poison_on_hit', 'throw_knife']],
    ['dao_liem', ['hook_lunge', 'poison_on_hit', 'shadow_invis']],
    ['dao_guong', ['parry_blink', 'hook_lunge', 'poison_on_hit']],
    ['dao_lua', ['slide_fire_trail', 'throw_burn', 'parry_blink']],
    ['dao_ngoc', ['speed_stacks', 'triple_jump', 'slide_fire_trail']],
    ['dao_dong_ho', ['time_slow_heavy', 'speed_stacks']],
    ['dao_phan_than', ['slide_decoy', 'time_slow_heavy']],
    ['dao_nghin_luoi', ['blade_storm', 'slide_decoy']],
    ['dao_khe_nut', ['rift_dash', 'triple_jump', 'blade_storm']],
  ],
  tay: [
    ['gang_sat', []],
    ['gang_dinh', ['combo4_knock']],
    ['gang_xich', ['heal_on_hit', 'combo4_knock']],
    ['gang_piston', ['piston_charge', 'heavy_push', 'heal_on_hit', 'combo4_knock']],
    ['gang_lua', ['fireball_heavy', 'heal_on_hit']],
    ['gang_bang', ['freeze_combo4', 'iceball_heavy', 'heal_on_hit']],
    ['gang_set', ['spark_on_hit', 'chain_lightning_heavy', 'freeze_combo4']],
    ['gang_da', ['stone_wall', 'heavy_push_far', 'spark_on_hit']],
    ['gang_tu', ['magnet_punch', 'stone_wall', 'spark_on_hit']],
    ['gang_ten_lua', ['rocket_fist', 'magnet_punch', 'spark_on_hit']],
    ['gang_xuong', ['kill_full_heal', 'heal_on_hit_2', 'rocket_fist']],
    ['gang_khong_lo', ['giant_hand', 'heal_on_hit', 'rocket_fist']],
    ['gang_trong_luc', ['gravity_well_throw', 'light_pull', 'giant_hand']],
    ['gang_thien_thach', ['meteor_combo4', 'meteor_rain']],
    ['gang_troi', ['sky_hand', 'light_push', 'heal_on_hit']],
  ],
};

const forms = (f: Family): WeaponDef[] => ROSTER[f].map(([id, passives], i) => {
  const minLevel = W.formLevels[i];
  return { id, family: f, minLevel, stats: stats(f, minLevel), passives, model: id };
});

export const WEAPONS: readonly WeaponDef[] = [
  { id: 'phoi', family: null, minLevel: 0, stats: { ...stats('kiem', 0), ...W.phoi }, passives: [], model: 'phoi' },
  ...FAMILIES.flatMap(forms),
];
export const WEAPON_IDS: readonly string[] = WEAPONS.map((w) => w.id);
const BY_ID = new Map(WEAPONS.map((w) => [w.id, w]));
const BY_FAMILY = new Map(FAMILIES.map((f) => [f, WEAPONS.filter((w) => w.family === f)]));

export function weaponById(id: string): WeaponDef {
  const w = BY_ID.get(id);
  if (!w) throw new Error(`unknown weapon ${id}`);
  return w;
}
export const isWeaponId = (id: string): boolean => BY_ID.has(id);
export const isFamily = (f: unknown): f is Family => (FAMILIES as readonly unknown[]).includes(f);
/** The family's forms, lowest minLevel first. */
export function familyForms(f: Family): WeaponDef[] { return BY_FAMILY.get(f) ?? []; }
/** The form a blade shows at `level` (its highest level ever, since forms never go backwards). */
export function formFor(family: Family | null, level: number): WeaponDef {
  if (family === null || level < W.familyPick) return weaponById('phoi');
  let pick = familyForms(family)[0];
  for (const w of familyForms(family)) if (level >= w.minLevel) pick = w;
  return pick;
}
/** All passives active on a form: the row's own list (ROSTER rows are complete, not cumulative). */
export function passivesOf(def: WeaponDef): PassiveId[] { return [...def.passives]; }

/** Family traits while the weapon is held (ROUND3 §4); the blank has none. */
export interface FamilyTraits { move: number; airJumps: number; slide: { speed: number; len: number; cd: number }; taken: number; }
export const NO_TRAITS: FamilyTraits = { move: 1, airJumps: 0, slide: { speed: 1, len: 1, cd: 1 }, taken: 1 };
export function traitsOf(def: WeaponDef): FamilyTraits {
  if (def.family === null) return NO_TRAITS;
  const f = W.family[def.family], m = traitMods(def.passives);
  return { move: f.move, airJumps: Math.max(f.airJumps, m.airJumps), slide: m.slideLen === 1 ? f.slide : { ...f.slide, len: f.slide.len * m.slideLen }, taken: f.taken };
}
/** Damage scale by blade level: 1 + dmgK·L + dmgQ·L² of the family (the blank scales like a sword). */
export function dmgScale(family: Family | null, level: number): number {
  level = formEquivLevel(level);
  const f = W.family[family ?? 'kiem'];
  return 1 + f.dmgK * level + f.dmgQ * level * level;
}
