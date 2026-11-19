import { bus } from '../../core/events';
import type { MoveState } from '../move-state';
import type { AnimInput } from './animator';
import type { Character } from './character';

/** Fill an AnimInput from the movement state (reused object, no allocation). */
export function animInputFromMove(s: MoveState, yaw: number, out: AnimInput): AnimInput {
  out.vx = s.vel.x; out.vy = s.vel.y; out.vz = s.vel.z; out.yaw = yaw;
  out.grounded = s.grounded; out.sliding = s.sliding; out.slamming = s.slamming; out.clinging = s.clinging;
  return out;
}

/** Local-player events → the body's one-shot clips. Returns the unsubscribe. */
export function bindCharacterEvents(c: Character): () => void {
  const off = [bus.on('move:land', (e) => c.anim.onLand(e.speed))];
  return () => off.forEach((f) => f());
}
