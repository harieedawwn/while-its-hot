import { BALANCE } from '../balance';
import type { PassiveId } from '../passives';

/**
 * Weapon roster (GDD §6). One row per form; insert new forms anywhere by `minLevel`, ids never change.
 * `passives` lists only the passive this form adds — `passivesOf()` stacks the family's lower forms.
 * Display names live in client/src/ui/strings.vi.ts (`STR.weapon[id]`), never here.
 * `model` = the builder id in client/src/weapons/models (usually the weapon id).
 */
export const FAMILIES = ['kiem', 'bua', 'thuong'] as const;
export type Family = (typeof FAMILIES)[number];
export type HeavyKind = 'thrust' | 'overhead' | 'sweep';

export interface WeaponStats {
  /** Which family moveset the form swings with (the blank swings a sword). */
  moveset: Family;
  light: number; heavy: number; comboHits: number; comboS: number; reach: number; heavyKind: HeavyKind;
}
export interface WeaponDef {
  id: string; family: Family | null; minLevel: number;
  stats: WeaponStats; passives: readonly PassiveId[]; model: string;
}

const W = BALANCE.weapons;
const fam = (f: Family): WeaponStats => ({ moveset: f, ...W.family[f] });
const row = (id: string, family: Family, minLevel: number, passives: PassiveId[] = []): WeaponDef =>
  ({ id, family, minLevel, stats: fam(family), passives, model: id });

export const WEAPONS: readonly WeaponDef[] = [
  { id: 'phoi', family: null, minLevel: 0, stats: { ...fam('kiem'), ...W.phoi }, passives: [], model: 'phoi' },
  row('kiem_tho', 'kiem', 3),
  row('kiem_thep', 'kiem', 6, ['combo3_bonus']),
  row('kiem_ban_rong', 'kiem', 10, ['parry_window_plus']),
  row('truong_kiem', 'kiem', 14, ['thrust_pierce']),
  row('kiem_toi_lua', 'kiem', 18, ['burn_on_hit']),
  row('bua_ren', 'bua', 3),
  row('bua_ta', 'bua', 6, ['light_break_block']),
  row('chuy_gai', 'bua', 10, ['stagger_plus']),
  row('bua_chien', 'bua', 14, ['slam_aoe']),
  row('bua_de', 'bua', 18, ['heavy_launch']),
  row('giao_sat', 'thuong', 3),
  row('thuong_thep', 'thuong', 6, ['max_reach_bonus']),
  row('kich', 'thuong', 10, ['sweep_wide']),
  row('dai_dao', 'thuong', 14, ['slide_lunge_plus']),
  row('tram_ma_dao', 'thuong', 18, ['heavy_pull']),
];
export const WEAPON_IDS: readonly string[] = WEAPONS.map((w) => w.id);
const BY_ID = new Map(WEAPONS.map((w) => [w.id, w]));

export function weaponById(id: string): WeaponDef {
  const w = BY_ID.get(id);
  if (!w) throw new Error(`unknown weapon ${id}`);
  return w;
}
/** The family's forms, lowest minLevel first. */
export function familyForms(f: Family): WeaponDef[] {
  return WEAPONS.filter((w) => w.family === f).sort((a, b) => a.minLevel - b.minLevel);
}
/** The form a blade shows at `level` (its highest level ever, since forms never go backwards). */
export function formFor(family: Family | null, level: number): WeaponDef {
  if (family === null || level < W.familyPick) return weaponById('phoi');
  let pick = familyForms(family)[0];
  for (const w of familyForms(family)) if (level >= w.minLevel) pick = w;
  return pick;
}
/** All passives active on a form: its own plus every lower form of the same family. */
export function passivesOf(def: WeaponDef): PassiveId[] {
  if (def.family === null) return [...def.passives];
  return familyForms(def.family).filter((w) => w.minLevel <= def.minLevel).flatMap((w) => w.passives);
}
