import { BALANCE } from '../balance';
import type { Family, WeaponDef } from '../data/weapons';
import { passivesOf } from '../data/weapons';
import { type AttackCtx, type AttackKind, type AttackShape, applyAttack } from '../passives';

/**
 * Melee frame data (GDD §5) read from BALANCE.combat.family. A light swing's w + a + r is the family's
 * combo rhythm (comboS); heavies are the release after a charge; the dash attack is light 1 with a lunge.
 */
export interface Arc { kind: 'slash' | 'thrust'; from: number; to: number; roll: number; }
export interface Frames {
  w: number; a: number; r: number; arc: Arc;
  /** Knockback speed (m/s) given to the target, lunge distance for the attacker. */
  knock: number; lungeM: number; staggerS: number; breaksBlock: boolean;
}
const C = BALANCE.combat;

type Raw = { w: number; a: number; r: number; arc: Arc; knock: number; lungeM: number; staggerS?: number; breaksBlock?: boolean };
const norm = (f: Raw): Frames => ({ ...f, staggerS: f.staggerS ?? 0, breaksBlock: f.breaksBlock ?? false });

export function framesOf(moveset: Family, kind: AttackKind, combo: number): Frames {
  const fam = C.family[moveset];
  if (kind === 'heavy') return norm(fam.heavy);
  const f = norm(fam.light[Math.min(combo, fam.light.length - 1)]);
  return kind === 'dash' ? { ...f, lungeM: C.dash.lungeM } : f;
}
export const totalS = (f: Frames): number => f.w + f.a + f.r;
/** Arc span in degrees (thrusts have none). */
export const arcSpan = (a: Arc): number => (a.kind === 'slash' ? Math.abs(a.to - a.from) : 0);

/** The attack before passives: family damage, the frame data's arc/lunge/stagger/block-break. */
export function baseShape(def: WeaponDef, kind: AttackKind, combo: number): AttackShape {
  const f = framesOf(def.stats.moveset, kind, combo);
  const dmg = kind === 'heavy' ? def.stats.heavy : def.stats.light * (kind === 'dash' ? C.dash.dmgMul : 1);
  return { dmg, arcDeg: arcSpan(f.arc), lungeM: f.lungeM, staggerS: f.staggerS, ignoresBlock: false, breaksBlock: f.breaksBlock };
}
/** The attack as it resolves: base shape folded through the held form's passives. */
export function attackShape(def: WeaponDef, kind: AttackKind, combo: number, dist = 0): AttackShape {
  const ctx: AttackCtx = { kind, combo, dist, reach: def.stats.reach };
  return applyAttack(passivesOf(def), baseShape(def, kind, combo), ctx);
}
