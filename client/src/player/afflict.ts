import type { MoveState } from './move-state';

/**
 * Movement statuses from form effects (phase 28, shared/effects): the owner of a body applies them, the motor
 * reads them. Timers are seconds left; a new status keeps the longer of the two.
 */
export interface Afflict {
  slowT: number; slowMul: number;
  freezeT: number;
  /** Pinned to the ground: no jumps (bua_trong_luc). */
  pinT: number;
  /** Ice under the feet: ground acceleration ×grip. */
  slipT: number; grip: number;
  /** Pulled toward (wx, wy, wz) at wellV m/s (black holes). */
  wellT: number; wellV: number; wx: number; wy: number; wz: number;
  /** Reflect off walls while a big knock carries the body (bua_cao_su). */
  bounceT: number;
  /** Run speed × while hasteT runs (dao_ngoc / dao_dong_ho stacks). */
  hasteT: number; hasteMul: number;
}
export const newAfflict = (): Afflict => ({ slowT: 0, slowMul: 1, freezeT: 0, pinT: 0, slipT: 0, grip: 1, wellT: 0, wellV: 0, wx: 0, wy: 0, wz: 0, bounceT: 0, hasteT: 0, hasteMul: 1 });

export type AfflictKind = 'slow' | 'freeze' | 'pin' | 'slip' | 'well' | 'shake' | 'haste' | 'invis' | 'poison';

/** Apply one status (shake is camera-only: the caller handles it). */
export function afflict(a: Afflict, k: AfflictKind, s: number, v: number, p?: readonly number[]): void {
  switch (k) {
    case 'slow': if (s >= a.slowT || v < a.slowMul) { a.slowT = Math.max(a.slowT, s); a.slowMul = Math.min(v, a.slowT > s ? a.slowMul : v); } break;
    case 'freeze': a.freezeT = Math.max(a.freezeT, s); break;
    case 'pin': a.pinT = Math.max(a.pinT, s); break;
    case 'slip': a.slipT = Math.max(a.slipT, s); a.grip = v; break;
    case 'well': if (p) { a.wellT = s; a.wellV = v; a.wx = p[0]; a.wy = p[1]; a.wz = p[2]; } break;
    case 'haste': a.hasteT = s; a.hasteMul = v; break;
    case 'shake': case 'invis': case 'poison': break;
  }
}

export function tickAfflict(a: Afflict, dt: number): void {
  a.slowT = Math.max(0, a.slowT - dt); if (a.slowT <= 0) a.slowMul = 1;
  a.freezeT = Math.max(0, a.freezeT - dt);
  a.pinT = Math.max(0, a.pinT - dt);
  a.slipT = Math.max(0, a.slipT - dt);
  a.wellT = Math.max(0, a.wellT - dt);
  a.bounceT = Math.max(0, a.bounceT - dt);
  a.hasteT = Math.max(0, a.hasteT - dt); if (a.hasteT <= 0) a.hasteMul = 1;
}

/** Ground speed multiplier from statuses (slow and haste multiply). */
export const afflictSpeed = (a: Afflict): number => (a.freezeT > 0 ? 0 : (a.slowT > 0 ? a.slowMul : 1) * (a.hasteT > 0 ? a.hasteMul : 1));
export const canJump = (a: Afflict): boolean => a.pinT <= 0 && a.freezeT <= 0;

/** Black-hole pull: steer the velocity toward the center (strong, but the body keeps falling). */
export function wellPull(s: MoveState, dt: number): void {
  const a = s.af;
  if (a.wellT <= 0) return;
  const dx = a.wx - s.pos.x, dy = a.wy - 1 - s.pos.y, dz = a.wz - s.pos.z, d = Math.hypot(dx, dz);
  if (d < 0.4) { s.vel.x *= 0.6; s.vel.z *= 0.6; return; }
  const k = Math.min(1, dt * 8);
  s.vel.x += ((dx / d) * a.wellV - s.vel.x) * k;
  s.vel.z += ((dz / d) * a.wellV - s.vel.z) * k;
  if (dy > 0.2) s.vel.y = Math.max(s.vel.y, 2);
  s.pushT = Math.max(s.pushT, 0.1);
}
