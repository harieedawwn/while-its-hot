import type * as THREE from 'three';

/** A solid vertical cylinder (an anvil, a brazier): dynamic obstacles on top of the static BVH world. */
export interface Blocker { x: number; z: number; r: number; y: number; h: number; on: boolean; }

/**
 * Push a capsule (seg + radius) out of the active blockers. Horizontal push while the capsule's body is
 * beside the cylinder; if the feet are above the top, rest on it instead. Returns true if it moved.
 */
export function resolveBlockers(list: readonly Blocker[], seg: THREE.Line3, r: number, nOut: THREE.Vector3, onContact?: (n: THREE.Vector3) => void): boolean {
  let any = false;
  for (const b of list) {
    if (!b.on) continue;
    const feet = Math.min(seg.start.y, seg.end.y) - r, head = Math.max(seg.start.y, seg.end.y) + r, top = b.y + b.h;
    if (head <= b.y || feet >= top) continue;
    const cx = seg.start.x - b.x, cz = seg.start.z - b.z, d = Math.hypot(cx, cz), min = b.r + r;
    if (d >= min) continue;
    if (top - feet < 0.12 && feet < top) { // feet barely inside the top: stand on it
      const lift = top - feet;
      seg.start.y += lift; seg.end.y += lift;
      onContact?.(nOut.set(0, 1, 0)); any = true; continue;
    }
    const nx = d > 1e-6 ? cx / d : 1, nz = d > 1e-6 ? cz / d : 0, push = min - d;
    seg.start.x += nx * push; seg.end.x += nx * push; seg.start.z += nz * push; seg.end.z += nz * push;
    onContact?.(nOut.set(nx, 0, nz)); any = true;
  }
  return any;
}
