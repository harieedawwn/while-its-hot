import { BALANCE } from '../balance';
import { forgeOdds, type ForgeOdds, type PassiveId } from '../passives';

/** Forge outcome odds (GDD §6): base row by level → heat → ring timing → passives → relic mods → Tiếng tăm. */
const F = BALANCE.forge;

export type Outcome = 'tuyet' | 'dat' | 'giu' | 'hong';
export type ForgeTarget = 'blade' | 'armor';
/** perfect/miss = where the marker was; auto = a frenzy auto-strike (no timing shift). */
export type Timing = 'perfect' | 'miss' | 'auto';
export const OUTCOME_DELTA: Record<Outcome, number> = { tuyet: 2, dat: 1, giu: 0, hong: -1 };

/** Relic / round modifiers as plain numbers, so relic data (phase 18) never needs a branch in the rules. */
export interface ForgeMods {
  /** Tiếng tăm stacks. */
  notoriety: number;
  /** Points moved from Hỏng to Giữ (Mối hàn). */
  mercy: number;
  zoneMul: number; cadenceMul: number; heatGainMul: number; heatDecayMul: number;
}
export const NO_MODS: ForgeMods = { notoriety: 0, mercy: 0, zoneMul: 1, cadenceMul: 1, heatGainMul: 1, heatDecayMul: 1 };

export type HeatBand = 'cold' | 'dull' | 'forging' | 'burning';
export function heatBand(h: number): HeatBand {
  if (h < F.heat.cold) return 'cold';
  if (h < F.heat.dull) return 'dull';
  return h > F.heat.burning ? 'burning' : 'forging';
}

/** Base odds row for a level. Armor passes level × rowMul (0..10 → 0..20). */
export function baseOdds(level: number): ForgeOdds {
  const l = Math.max(0, Math.floor(level));
  const r = F.rows.find((x) => l <= x.upTo) ?? F.rows[F.rows.length - 1];
  return { tuyet: r.tuyet, dat: r.dat, giu: r.giu, hong: r.hong };
}

type Key = keyof ForgeOdds;
const SUCCESS: Key[] = ['tuyet', 'dat', 'giu'];
/** Take up to `pts` points proportionally from `from`; returns what was taken. */
function take(o: ForgeOdds, from: Key[], pts: number): number {
  const tot = from.reduce((s, k) => s + o[k], 0), m = Math.min(pts, tot);
  if (m <= 0) return 0;
  for (const k of from) o[k] -= (o[k] * m) / tot;
  return m;
}

export interface OddsInput {
  level: number; target: ForgeTarget; heat: number; timing: Timing;
  passives?: readonly PassiveId[]; mods?: ForgeMods;
}
/** The final odds in points (always sums to 100, never negative). */
export function oddsFor(i: OddsInput): ForgeOdds {
  const mods = i.mods ?? NO_MODS;
  const lvl = i.target === 'armor' ? i.level * F.armor.rowMul : i.level;
  let o = baseOdds(lvl);
  const band = heatBand(i.heat);
  const shift = band === 'cold' ? F.heat.coldShift : band === 'dull' ? F.heat.dullShift : band === 'burning' ? F.heat.burnShift : 0;
  if (shift > 0) o.hong += take(o, SUCCESS, shift);
  if (i.timing === 'perfect') {
    const m = Math.min(F.strike.perfectShift, o.hong);
    o.hong -= m; o.dat += m * F.strike.perfectDatShare; o.tuyet += m * (1 - F.strike.perfectDatShare);
  } else if (i.timing === 'miss') o.hong += take(o, SUCCESS, F.strike.missShift);
  if (i.passives?.length) o = forgeOdds(i.passives, o, i.level);
  if (mods.notoriety > 0) o.hong += take(o, ['dat'], F.notorietyShift * mods.notoriety);
  if (mods.mercy > 0) { const m = Math.min(mods.mercy, o.hong); o.hong -= m; o.giu += m; }
  return o;
}

/** Roll an outcome from odds with a uniform rand in [0,1). */
export function rollOutcome(o: ForgeOdds, rand: number): Outcome {
  const total = o.tuyet + o.dat + o.giu + o.hong;
  let r = rand * total;
  for (const k of ['tuyet', 'dat', 'giu'] as const) { if (r < o[k]) return k; r -= o[k]; }
  return 'hong';
}
