import * as THREE from 'three';
import { BALANCE } from '@wih/shared';

/** One sim tick of intent. mx = strafe right, my = forward (stick or WASD, length ≤ 1). Edges are per tick. */
export interface MoveInput {
  mx: number; my: number; yaw: number;
  jumpPressed: boolean; slidePressed: boolean; slideHeld: boolean;
}
export const NO_INPUT: MoveInput = { mx: 0, my: 0, yaw: 0, jumpPressed: false, slidePressed: false, slideHeld: false };

export type JumpKind = 'jump' | 'bounce' | 'slidejump' | 'walljump';
/** What happened this tick; the controller turns these into bus events (camera, audio, VFX listen). */
export type MoveEvent =
  | { k: 'jump'; kind: JumpKind }
  | { k: 'land'; speed: number }
  | { k: 'slide'; on: boolean }
  | { k: 'slamstart' }
  | { k: 'slam'; pos: THREE.Vector3 };

/** Full movement state of one player. `pos` is the feet (bottom of the capsule). */
export interface MoveState {
  pos: THREE.Vector3; vel: THREE.Vector3;
  grounded: boolean; groundN: THREE.Vector3;
  /** Seconds left in which a ground jump still works after leaving the ground. */
  coyote: number;
  /** Seconds left on a buffered jump press. */
  jumpBuf: number;
  /** Stamina in pips (fractional while regenerating). */
  stamina: number;
  /** Seconds of invulnerability left (combat reads `iframe > 0`; stance exit, relics). */
  iframe: number;
  sliding: boolean; slideT: number; slideDir: THREE.Vector3;
  /** Seconds until the next slide may start; slideLock = a timed-out slide must be released first. */
  slideCd: number; slideLock: boolean;
  slamming: boolean;
  /** Seconds since the last slam landing (bounce window). */
  sinceSlam: number;
  wallJumps: number;
  /** Seconds since a wall was in reach; wallN = its horizontal normal (away from the wall). */
  sinceWall: number; wallN: THREE.Vector3;
  clinging: boolean;
  /** Low capsule (sliding, or no room to stand up). */
  low: boolean;
  /** Combat writes these: ground speed multiplier (block, charge) and seconds of weak control after a push. */
  speedMul: number; pushT: number;
  events: MoveEvent[];
}

export function createMoveState(pos: THREE.Vector3Tuple = [0, 0, 0]): MoveState {
  return {
    pos: new THREE.Vector3(...pos), vel: new THREE.Vector3(),
    grounded: false, groundN: new THREE.Vector3(0, 1, 0),
    coyote: 0, jumpBuf: 0, stamina: BALANCE.move.stamina.pips,
    iframe: 0,
    sliding: false, slideT: 0, slideDir: new THREE.Vector3(0, 0, -1), slideCd: 0, slideLock: false,
    slamming: false, sinceSlam: 1e3,
    wallJumps: 0, sinceWall: 1e3, wallN: new THREE.Vector3(),
    clinging: false, low: false, speedMul: 1, pushT: 0, events: [],
  };
}

/** Combat push (lunge, knockback): set the horizontal velocity and weaken ground control for s seconds. */
export function pushMove(st: MoveState, vx: number, vz: number, s: number, vy = 0): void {
  st.vel.x = vx; st.vel.z = vz;
  if (vy > 0) { st.vel.y = vy; st.grounded = false; }
  st.pushT = Math.max(st.pushT, s);
}

/** Capsule height for the current posture. */
export function bodyHeight(s: MoveState): number {
  return s.low ? BALANCE.move.body.lowHeight : BALANCE.move.body.height;
}

/** Camera-relative horizontal wish direction (length ≤ 1). Yaw 0 looks down −Z. */
export function wishDir(mx: number, my: number, yaw: number, out: THREE.Vector3): THREE.Vector3 {
  const len = Math.hypot(mx, my);
  const k = len > 1 ? 1 / len : 1;
  const s = Math.sin(yaw), c = Math.cos(yaw);
  // forward = (−sin, 0, −cos), right = (cos, 0, −sin)
  return out.set((mx * c - my * s) * k, 0, (-mx * s - my * c) * k);
}
