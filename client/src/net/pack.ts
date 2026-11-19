import { animCode, FLAG, type NetState } from '@wih/shared';
import type { Combatant } from '../combat/combatant';

/** The local player's State for the 20 Hz uplink (weapon/level/armor/hp are the server's to fill). */
export function packLocal(c: Combatant, forging: boolean, out: NetState): NetState {
  const s = c.body.s, f = c.fighter;
  out.x = s.pos.x; out.y = s.pos.y; out.z = s.pos.z;
  out.vx = s.vel.x; out.vy = s.vel.y; out.vz = s.vel.z;
  out.yaw = Math.atan2(Math.sin(c.yaw), Math.cos(c.yaw)); out.pitch = c.pitch;
  out.anim = animCode(f); out.animT = Math.max(0, f.t);
  let fl = 0;
  if (s.grounded) fl |= FLAG.grounded;
  if (s.sliding) fl |= FLAG.sliding;
  if (f.blocking) fl |= FLAG.blocking;
  if (f.parrying) fl |= FLAG.parrying;
  if (forging) fl |= FLAG.forging;
  if (s.dashT > 0) fl |= FLAG.dashing;
  if (f.swingId & 1) fl |= FLAG.swing;
  if (f.dead) fl |= FLAG.dead;
  out.flags = fl;
  out.stamina = s.stamina;
  return out;
}

export function emptyState(): NetState {
  return { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, anim: 0, animT: 0, flags: 0, weapon: 0, level: 0, stamina: 3, armor: 0, hp: 100 };
}
