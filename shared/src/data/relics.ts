import type { ModuleId } from './modules';

/**
 * Relics (Di vật, GDD §8). Pure data: every field is an effect the engine reads generically (`foldRelics`),
 * never switch-cased on the id. Adding a relic = one row here + its name in strings.vi.ts.
 * `rare` relics fill the pool offered to last place.
 */
export interface RelicFx {
  /** Forge mods (ForgeMods): multipliers, plus Nhập thần fill rate and extra seconds. */
  costMul: number; decayMul: number; heatMul: number; zoneMul: number; frenzyFillMul: number; frenzyPlusS: number;
  /** Weapon damage multiplier. */
  dmgMul: number;
  /** Turn this many Vỡ into Giữ each round / make this many Lên a +2 each round. */
  guardVo: number; plus2Once: number;
  /** Mối hàn: after a Vỡ the next Trúng is a sure Lên. */
  sureAfterVo: boolean;
  /** Start each round with this much armor; kills give this many weapon levels. */
  armorStart: number; killLevels: number;
  /** A parry restores this much stamina / HP. */
  parryStamina: number; parryHp: number;
  /** A Hỏng knocks everyone within this many meters of your anvil back 4 m. */
  wave: number;
  /** Anvil place and pick-up are instant. */
  instantAnvil: boolean;
  /** Seconds of i-frames after leaving the forge stance. */
  stanceIframeS: number;
}
export const NO_RELIC: RelicFx = {
  costMul: 1, decayMul: 1, heatMul: 1, zoneMul: 1, frenzyFillMul: 1, frenzyPlusS: 0, dmgMul: 1, guardVo: 0, plus2Once: 0, sureAfterVo: false,
  armorStart: 0, killLevels: 0, parryStamina: 0, parryHp: 0, wave: 0, instantAnvil: false, stanceIframeS: 0,
};

export interface RelicDef { id: string; rare: boolean; fx: Partial<RelicFx> }
export const RELICS = [
  { id: 'da_niem', rare: true, fx: { guardVo: 1 } },
  { id: 'hon_than_do', rare: true, fx: { plus2Once: 1 } },
  { id: 'vong_da', rare: false, fx: { costMul: 0.75 } },
  { id: 'moi_han', rare: false, fx: { sureAfterVo: true } },
  { id: 'an_sat', rare: true, fx: { dmgMul: 1.1 } },
  { id: 'kim_giu_nhiet', rare: false, fx: { decayMul: 0.5 } },
  { id: 'ong_be', rare: false, fx: { heatMul: 2 } },
  { id: 'bua_nen', rare: true, fx: { wave: 4 } },
  { id: 'de_nhe', rare: false, fx: { instantAnvil: true } },
  { id: 'dau_toi', rare: false, fx: { parryStamina: 1, parryHp: 5 } },
  { id: 'gang_da', rare: false, fx: { stanceIframeS: 0.3 } },
  { id: 'mat_tho', rare: false, fx: { zoneMul: 1.4 } },
  { id: 'sat_vun', rare: true, fx: { killLevels: 1 } },
  { id: 'dinh_tan', rare: false, fx: { armorStart: 2 } },
] as const satisfies readonly RelicDef[];
export type RelicId = (typeof RELICS)[number]['id'];
export const RELIC_IDS: readonly string[] = RELICS.map((r) => r.id);
export const isRelic = (id: string): boolean => RELIC_IDS.includes(id);
const BY_ID = new Map<string, RelicDef>(RELICS.map((r) => [r.id, r]));
export const relicById = (id: string): RelicDef | undefined => BY_ID.get(id);

/** Combine a player's relics: multipliers multiply, counts and amounts add, flags or. */
export function foldRelics(ids: readonly string[]): RelicFx {
  const o: RelicFx = { ...NO_RELIC };
  for (const id of ids) {
    const f = BY_ID.get(id)?.fx; if (!f) continue;
    o.costMul *= f.costMul ?? 1; o.decayMul *= f.decayMul ?? 1; o.heatMul *= f.heatMul ?? 1;
    o.zoneMul *= f.zoneMul ?? 1; o.dmgMul *= f.dmgMul ?? 1; o.frenzyFillMul *= f.frenzyFillMul ?? 1; o.frenzyPlusS += f.frenzyPlusS ?? 0;
    o.guardVo += f.guardVo ?? 0; o.plus2Once += f.plus2Once ?? 0; o.armorStart += f.armorStart ?? 0; o.killLevels += f.killLevels ?? 0;
    o.sureAfterVo ||= f.sureAfterVo ?? false;
    o.parryStamina += f.parryStamina ?? 0; o.parryHp += f.parryHp ?? 0; o.wave = Math.max(o.wave, f.wave ?? 0);
    o.instantAnvil ||= f.instantAnvil ?? false; o.stanceIframeS += f.stanceIframeS ?? 0;
  }
  return o;
}

/** A draft offer is a relic id or an armor module id (catch-up builds for last place). */
export type OfferId = RelicId | ModuleId;
