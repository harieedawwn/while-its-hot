import { BALANCE } from '../balance';
import type { Family, WeaponDef } from '../data/weapons';
import { passivesOf } from '../data/weapons';
import { type AttackCtx, type AttackKind, type AttackShape, applyAttack } from '../passives';

/**
 * Melee frame data (GDD §5) read from BALANCE.combat.family. A light swing's w + a + r is the family's
 * combo rhythm (comboS); heavies are the release after a charge; the slide attack is light 1 with a lunge.
 */
export interface Arc { kind: 'slash' | 'thrust'; from: number; to: number; roll: number; }
export interface Frames {
  w: number; a: number; r: number; arc: Arc;
  /** Knockback speed (m/s) given to the target, lunge distance for the attacker. */
  knock: number; lungeM: number; staggerS: number; breaksBlock: boolean;
  /** Which fist throws it (tay; every other family swings with the right hand). */
  hand: 'r' | 'l';
}
const C = BALANCE.combat;

type Raw = { w: number; a: number; r: number; arc: Arc; knock: number; lungeM: number; staggerS?: number; breaksBlock?: boolean; hand?: 'r' | 'l' };
const norm = (f: Raw, k: number): Frames => ({ ...f, w: f.w * k, a: f.a * k, r: f.r * k, staggerS: f.staggerS ?? 0, breaksBlock: f.breaksBlock ?? false, hand: f.hand ?? 'r' });

/** timeMul scales windup/active/recover (WeaponStats.timeMul: bua gets faster with level). */
export function framesOf(moveset: Family, kind: AttackKind, combo: number, timeMul = 1): Frames {
  const fam = C.family[moveset];
  if (kind === 'heavy') return norm(fam.heavy, timeMul);
  const light: readonly Raw[] = fam.light;
  const f = norm(light[Math.min(combo, light.length - 1)], timeMul);
  return kind === 'slide' ? { ...f, lungeM: C.slideAtk.lungeM } : f;
}
/** Frame data of a weapon's swing (its moveset at its form's speed). */
export const framesFor = (def: WeaponDef, kind: AttackKind, combo: number): Frames => framesOf(def.stats.moveset, kind, combo, def.stats.timeMul);
export const totalS = (f: Frames): number => f.w + f.a + f.r;
/** Arc span in degrees (thrusts have none). */
export const arcSpan = (a: Arc): number => (a.kind === 'slash' ? Math.abs(a.to - a.from) : 0);

/** The attack before passives: family damage, the frame data's arc/lunge/stagger/block-break. */
export function baseShape(def: WeaponDef, kind: AttackKind, combo: number): AttackShape {
  const f = framesOf(def.stats.moveset, kind, combo, def.stats.timeMul);
  const dmg = kind === 'heavy' ? def.stats.heavy : def.stats.light * (kind === 'slide' ? C.slideAtk.dmgMul : 1);
  return { dmg, arcDeg: arcSpan(f.arc), lungeM: f.lungeM, staggerS: f.staggerS, ignoresBlock: false, breaksBlock: f.breaksBlock };
}
/** The attack as it resolves: base shape folded through the held form's passives. */
export function attackShape(def: WeaponDef, kind: AttackKind, combo: number, dist = 0): AttackShape {
  const ctx: AttackCtx = { kind, combo, dist, reach: def.stats.reach };
  return applyAttack(passivesOf(def), baseShape(def, kind, combo), ctx);
}
