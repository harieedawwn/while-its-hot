import type { ModuleId } from './modules';

/**
 * Relics (Di vật, GDD §8). Pure data: every field is an effect the engine reads generically (`foldRelics`),
 * never switch-cased on the id. Adding a relic = one row here + its name in strings.vi.ts.
 * `rare` relics fill the pool offered to last place.
 */
export interface RelicFx {
  /** Multipliers on forge ForgeMods. */
  cadenceMul: number; heatDecayMul: number; heatGainMul: number; zoneMul: number;
  /** Weapon damage multiplier. */
  dmgMul: number;
  /** Prevent this many Gãy each round / guarantee this many Tuyệt each round. */
  noBreak: number; tuyet: number;
  /** Mối hàn: each Hỏng lowers the next Hỏng chance by `mercyStep` points (max `mercyMax`), reset on Đạt. */
  mercyStep: number; mercyMax: number;
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
  cadenceMul: 1, heatDecayMul: 1, heatGainMul: 1, zoneMul: 1, dmgMul: 1, noBreak: 0, tuyet: 0, mercyStep: 0, mercyMax: 0,
  armorStart: 0, killLevels: 0, parryStamina: 0, parryHp: 0, wave: 0, instantAnvil: false, stanceIframeS: 0,
};

export interface RelicDef { id: string; rare: boolean; fx: Partial<RelicFx> }
export const RELICS = [
  { id: 'da_niem', rare: true, fx: { noBreak: 1 } },
  { id: 'hon_than_do', rare: true, fx: { tuyet: 1 } },
  { id: 'vong_da', rare: false, fx: { cadenceMul: 0.8 } },
  { id: 'moi_han', rare: false, fx: { mercyStep: 10, mercyMax: 40 } },
  { id: 'an_sat', rare: true, fx: { dmgMul: 1.1 } },
  { id: 'kim_giu_nhiet', rare: false, fx: { heatDecayMul: 0.5 } },
  { id: 'ong_be', rare: false, fx: { heatGainMul: 2 } },
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
    o.cadenceMul *= f.cadenceMul ?? 1; o.heatDecayMul *= f.heatDecayMul ?? 1; o.heatGainMul *= f.heatGainMul ?? 1;
    o.zoneMul *= f.zoneMul ?? 1; o.dmgMul *= f.dmgMul ?? 1;
    o.noBreak += f.noBreak ?? 0; o.tuyet += f.tuyet ?? 0; o.armorStart += f.armorStart ?? 0; o.killLevels += f.killLevels ?? 0;
    o.mercyStep += f.mercyStep ?? 0; o.mercyMax = Math.max(o.mercyMax, f.mercyMax ?? 0);
    o.parryStamina += f.parryStamina ?? 0; o.parryHp += f.parryHp ?? 0; o.wave = Math.max(o.wave, f.wave ?? 0);
    o.instantAnvil ||= f.instantAnvil ?? false; o.stanceIframeS += f.stanceIframeS ?? 0;
  }
  return o;
}

/** A draft offer is a relic id or an armor module id (catch-up builds for last place). */
export type OfferId = RelicId | ModuleId;
