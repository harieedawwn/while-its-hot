import { BALANCE } from '../balance';

/** Forge rules as pure functions (ROUND3 §1, GDD §6): p(L), zone(L), heat bands, mods. No randomness here. */
const F = BALANCE.forge, W = BALANCE.weapons;

/** Lên = +1 (a card may make it +2), Giữ = 0, Vỡ = −2 (level clamps at 0, a blade is never destroyed). */
export type Outcome = 'len' | 'giu' | 'vo';
export type ForgeTarget = 'blade' | 'armor';
/** Where the marker was when the hammer fell. */
export type Timing = 'hit' | 'miss';

/** Card / relic / round modifiers as plain numbers, so item data never needs a branch in the rules (ROUND3 §5). */
export interface ForgeMods {
  /** Tiếng tăm stacks. */
  notoriety: number;
  zoneMul: number; heatMul: number; decayMul: number; costMul: number;
  frenzyFillMul: number; frenzyPlusS: number;
  /** Charges: Vỡ becomes Giữ / the next Lên is +2. */
  guardVo: number; plus2Once: number;
  /** After a Vỡ the next Trúng is a sure Lên. */
  sureAfterVo: boolean;
}
export const NO_MODS: ForgeMods = {
  notoriety: 0, zoneMul: 1, heatMul: 1, decayMul: 1, costMul: 1, frenzyFillMul: 1, frenzyPlusS: 0, guardVo: 0, plus2Once: 0, sureAfterVo: false,
};

export type HeatBand = 'cold' | 'dull' | 'forging' | 'burning';
export function heatBand(h: number): HeatBand {
  if (h < F.heat.cold) return 'cold';
  if (h < F.heat.dull) return 'dull';
  return h > F.heat.burning ? 'burning' : 'forging';
}
/** Zone multiplier of a heat band: forging = full, dull ×0.8, cold or burning ×0.6. */
export function heatZoneMul(h: number): number {
  const b = heatBand(h);
  return b === 'forging' ? 1 : b === 'dull' ? F.zone.dullMul : F.zone.offMul;
}

/** The level the curves read: blades use their level, armor (0..10) is stretched over the same range. */
export function curveLevel(level: number, target: ForgeTarget): number {
  return Math.max(0, target === 'armor' ? level * F.armor.levelMul : level);
}
const along = (a: number, b: number, level: number): number => a + (b - a) * Math.min(1, level / (W.maxLevel - 1));

/** Chance that a Trúng is a Lên. */
export function pLen(level: number, target: ForgeTarget = 'blade'): number { return along(F.p.p0, F.p.pEnd, curveLevel(level, target)); }
/** Sweet-zone size at a level as a fraction of the ring, before heat and mods. */
export function zoneFrac(level: number, target: ForgeTarget = 'blade'): number { return along(F.zone.z0, F.zone.zEnd, curveLevel(level, target)); }

/** Frenzy zone size (fraction of the ring) `age` seconds after it started: full, then a linear shrink. */
export function frenzyZone(age: number, durS: number = F.frenzy.durS): number {
  const f = F.frenzy;
  if (age <= f.shrinkAtS) return f.zoneFull;
  const k = Math.min(1, (age - f.shrinkAtS) / Math.max(1e-6, durS - f.shrinkAtS));
  return f.zoneFull + (f.zoneEnd - f.zoneFull) * k;
}
