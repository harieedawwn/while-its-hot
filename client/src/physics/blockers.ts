import type * as THREE from 'three';

/**
 * A solid vertical cylinder (an anvil, a brazier) or, with hx/hz, an axis-aligned slab (a cage door): dynamic
 * obstacles on top of the static BVH world. For a slab `r` is ignored.
 */
export interface Blocker { x: number; z: number; r: number; y: number; h: number; on: boolean; hx?: number; hz?: number; }

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
    if (b.hx !== undefined && b.hz !== undefined) { if (pushOutOfSlab(b, seg, r, nOut, onContact)) any = true; continue; }
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

/** Slab: push the capsule axis out along the axis of least penetration (rect grown by the capsule radius). */
function pushOutOfSlab(b: Blocker, seg: THREE.Line3, r: number, nOut: THREE.Vector3, onContact?: (n: THREE.Vector3) => void): boolean {
  const hx = b.hx! + r, hz = b.hz! + r;
  const dx = seg.start.x - b.x, dz = seg.start.z - b.z;
  const px = hx - Math.abs(dx), pz = hz - Math.abs(dz);
  if (px <= 0 || pz <= 0) return false;
  let nx = 0, nz = 0;
  if (px < pz) { nx = dx >= 0 ? 1 : -1; seg.start.x += nx * px; seg.end.x += nx * px; }
  else { nz = dz >= 0 ? 1 : -1; seg.start.z += nz * pz; seg.end.z += nz * pz; }
  onContact?.(nOut.set(nx, 0, nz));
  return true;
}
