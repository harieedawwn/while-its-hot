import { BALANCE } from '../balance';
import type { AttackShape } from '../passives';

/**
 * Damage and defense (GDD §5, §7), pure. Damage = base × (1 + 0.06 × level) × armorFactor (passives are
 * already folded into the shape's dmg). Defense order: i-frames → parry (front) → block (front) → hit.
 */
const C = BALANCE.combat;
const D2R = Math.PI / 180;

export const levelFactor = (level: number): number => 1 + BALANCE.weapons.levelDmg * level;
export const armorFactor = (armorLevel: number): number => 1 - Math.min(C.armor.max, C.armor.perLevel * armorLevel);
export function damageOf(shape: AttackShape, weaponLevel: number, armorLevel: number): number {
  return shape.dmg * levelFactor(weaponLevel) * armorFactor(armorLevel);
}

export interface DefenderView {
  x: number; z: number; yaw: number;
  /** In the parry window / holding block / dash i-frames or other invulnerability. */
  parrying: boolean; blocking: boolean; immune: boolean;
  stamina: number; armorLevel: number;
  /** Extra block arc (khiên tay: 180°). */
  blockArcDeg?: number;
}
export interface AttackView { x: number; z: number; shape: AttackShape; weaponLevel: number; }

export type HitResult =
  | { r: 'immune' }
  | { r: 'parried'; attackerStaggerS: number; parrierStamina: number }
  | { r: 'blocked' | 'guardbreak' | 'pierced' | 'hit'; dmg: number; staminaCost: number; staggerS: number };

/** True when the point (x,z) lies within ±halfDeg of the facing of someone at (dx,dz) looking along yaw (0 = −Z). */
export function inFront(d: { x: number; z: number; yaw: number }, x: number, z: number, halfDeg: number): boolean {
  const vx = x - d.x, vz = z - d.z, l = Math.hypot(vx, vz);
  if (l < 1e-6) return true;
  const fx = -Math.sin(d.yaw), fz = -Math.cos(d.yaw);
  return (vx * fx + vz * fz) / l >= Math.cos(halfDeg * D2R);
}

export function resolveHit(a: AttackView, d: DefenderView): HitResult {
  if (d.immune) return { r: 'immune' };
  if (d.parrying && inFront(d, a.x, a.z, C.parry.frontDeg)) {
    return { r: 'parried', attackerStaggerS: C.parry.staggerS, parrierStamina: C.parry.stamina };
  }
  const full = damageOf(a.shape, a.weaponLevel, d.armorLevel);
  const stagger = a.shape.staggerS;
  if (d.blocking && inFront(d, a.x, a.z, (d.blockArcDeg ?? C.block.frontDeg * 2) / 2)) {
    if (a.shape.ignoresBlock) return { r: 'pierced', dmg: full, staminaCost: 0, staggerS: stagger };
    const reduced = full * (1 - C.block.reduce);
    if (a.shape.breaksBlock || d.stamina < C.block.stamina) {
      return { r: 'guardbreak', dmg: reduced, staminaCost: Math.min(d.stamina, C.block.stamina), staggerS: Math.max(stagger, C.block.guardBreakS) };
    }
    return { r: 'blocked', dmg: reduced, staminaCost: C.block.stamina, staggerS: 0 };
  }
  return { r: 'hit', dmg: full, staminaCost: 0, staggerS: stagger };
}
