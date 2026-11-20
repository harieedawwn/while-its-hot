import * as THREE from 'three';

/**
 * Viewmodel poses in VIEW space (−Z forward, +X right, +Y up): the weapon hand's grip position, the
 * blade direction (weapon +Y) and the edge direction (weapon +Z, orthogonalized). Clips are keys on a
 * phase axis: attacks use s = 0 start · 1 strike begins · 2 strike ends · 3 recovered, so one clip fits
 * any family's frame data; other clips use 0..1. Two-fist sets (tay) also key the LEFT hand in `l`
 * (every key of such a clip has one); one-handed sets leave it out and the left pose is unused.
 */
export type V3 = readonly [number, number, number];
export type VmEase = 'cubic' | 'in' | 'out' | 'linear';
export interface VmHand { p: V3; b: V3; e: V3; }
export interface VmKey extends VmHand { s: number; ease?: VmEase; l?: VmHand; }
interface Baked { s: number; p: THREE.Vector3; q: THREE.Quaternion; ease: VmEase; lp?: THREE.Vector3; lq?: THREE.Quaternion; }
export interface VmClip { keys: Baked[]; }

const mx = new THREE.Matrix4(), vb = new THREE.Vector3(), ve = new THREE.Vector3(), vx = new THREE.Vector3();

/** Rotation that takes weapon +Y to b and +Z to (e made perpendicular to b). */
export function basisQuat(b: V3, e: V3, out = new THREE.Quaternion()): THREE.Quaternion {
  vb.set(...b).normalize();
  ve.set(...e);
  ve.addScaledVector(vb, -ve.dot(vb));
  if (ve.lengthSq() < 1e-6) ve.set(0, 0, 1).addScaledVector(vb, -vb.z);
  ve.normalize();
  vx.crossVectors(vb, ve);
  return out.setFromRotationMatrix(mx.makeBasis(vx, vb, ve));
}

export function bakeKey(k: VmKey): Baked {
  const b: Baked = { s: k.s, p: new THREE.Vector3(...k.p), q: basisQuat(k.b, k.e), ease: k.ease ?? 'cubic' };
  if (k.l) { b.lp = new THREE.Vector3(...k.l.p); b.lq = basisQuat(k.l.b, k.l.e); }
  return b;
}
export function clip(keys: VmKey[]): VmClip { return { keys: keys.map(bakeKey).sort((a, b) => a.s - b.s) }; }

const easeF: Record<VmEase, (x: number) => number> = {
  linear: (x) => x,
  cubic: (x) => x * x * (3 - 2 * x),
  in: (x) => x * x,
  out: (x) => 1 - (1 - x) * (1 - x),
};

export class VmPose {
  readonly pos = new THREE.Vector3();
  readonly quat = new THREE.Quaternion();
  /** Left fist (two-fist sets only). */
  readonly lpos = new THREE.Vector3();
  readonly lquat = new THREE.Quaternion();
  copy(o: VmPose): this { this.pos.copy(o.pos); this.quat.copy(o.quat); this.lpos.copy(o.lpos); this.lquat.copy(o.lquat); return this; }
  setKey(k: VmKey): this {
    this.pos.set(...k.p); basisQuat(k.b, k.e, this.quat);
    if (k.l) { this.lpos.set(...k.l.p); basisQuat(k.l.b, k.l.e, this.lquat); }
    return this;
  }
  /** Move toward o by factor w (0..1). */
  towards(o: VmPose, w: number): this {
    this.pos.lerp(o.pos, w); this.quat.slerp(o.quat, w); this.lpos.lerp(o.lpos, w); this.lquat.slerp(o.lquat, w);
    return this;
  }
}

/** Sample a clip at s (clamped to its first/last key). */
export function sampleClip(c: VmClip, s: number, out: VmPose): VmPose {
  const k = c.keys;
  if (s <= k[0].s) return put(k[0], out);
  const last = k[k.length - 1];
  if (s >= last.s) return put(last, out);
  let i = 0;
  while (i < k.length - 2 && s > k[i + 1].s) i++;
  const a = k[i], b = k[i + 1];
  const t = easeF[a.ease]((s - a.s) / (b.s - a.s || 1));
  out.pos.lerpVectors(a.p, b.p, t);
  out.quat.slerpQuaternions(a.q, b.q, t);
  if (a.lp && b.lp && a.lq && b.lq) { out.lpos.lerpVectors(a.lp, b.lp, t); out.lquat.slerpQuaternions(a.lq, b.lq, t); }
  return out;
}
function put(k: Baked, out: VmPose): VmPose {
  out.pos.copy(k.p); out.quat.copy(k.q);
  if (k.lp && k.lq) { out.lpos.copy(k.lp); out.lquat.copy(k.lq); }
  return out;
}
