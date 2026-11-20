import * as THREE from 'three';
import { BALANCE } from '@wih/shared';
import { bodyHeight } from './move-state';
import type { Player } from './player';

/**
 * Blink / rift dash landing (phase 29, the server only names the spot because it has no level geometry): walk from the
 * wished spot back toward where the body was until the capsule fits. `free(x, y, z)` says whether it does. Falls back to
 * the start. Steps are 0.5 m, so a 12 m dash costs at most 25 overlap tests.
 */
export function safeSpot(from: THREE.Vector3Like, to: THREE.Vector3Like, free: (x: number, y: number, z: number) => boolean, stepM = 0.5): THREE.Vector3Tuple {
  const dx = from.x - to.x, dy = from.y - to.y, dz = from.z - to.z, n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / stepM));
  for (let i = 0; i <= n; i++) {
    const k = i / n, x = to.x + dx * k, y = to.y + dy * k, z = to.z + dz * k;
    if (free(x, y, z)) return [x, y, z];
  }
  return [from.x, from.y, from.z];
}

const seg = new THREE.Line3(), o = new THREE.Vector3(), dir = new THREE.Vector3();

/** Teleport the local body to (x, y, z) facing yaw: never through a wall (chest-height ray) and never inside one. */
export function blinkTo(p: Player, x: number, y: number, z: number, yaw: number): void {
  const w = p.kin.world, r = BALANCE.move.body.radius, h = bodyHeight(p.s), from = p.s.pos;
  let tx = x, tz = z;
  o.set(from.x, from.y + h * 0.6, from.z);
  dir.set(x - from.x, 0, z - from.z);
  const d = dir.length();
  if (d > 0.01) {
    dir.divideScalar(d);
    const hit = w.raycast(o, dir, d);
    if (hit && hit.distance < d) { const k = Math.max(0, hit.distance - r - 0.1); tx = from.x + dir.x * k; tz = from.z + dir.z * k; }
  }
  const free = (px: number, py: number, pz: number) => {
    seg.start.set(px, py + r + 0.05, pz); seg.end.set(px, py + h - r, pz);
    return !w.overlaps(seg, r);
  };
  const [sx, sy, sz] = safeSpot(from, { x: tx, y, z: tz }, free);
  p.place(sx, sy + 0.05, sz, yaw);
  p.s.vel.x *= 0.3; p.s.vel.z *= 0.3;
}
