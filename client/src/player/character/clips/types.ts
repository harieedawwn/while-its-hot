import { BONE_INDEX, BONES, type BoneName } from '../skeleton';

type V3 = readonly [number, number, number];
/** Bone rotations in DEGREES (axes: see skeleton.ts). Bones not listed are at rest (0,0,0). */
export type BonePose = Partial<Record<BoneName, V3>>;
/** How the segment that STARTS at this key eases toward the next one (default cubic = smoothstep). */
export type Ease = 'cubic' | 'in' | 'out' | 'linear';
/** u = 0..1 along the clip; root = pelvis offset in meters from its rest height (+Y up, −Z forward). */
export interface Key { u: number; r: BonePose; root?: V3; ease?: Ease; }
export interface Clip {
  id: string;
  /** Seconds for u 0→1 when played as an action or base state. */
  len: number;
  loop: boolean;
  /** Catmull-Rom through the keys (cycles) instead of per-segment easing. */
  spline?: boolean;
  /** Plays only on chest/head/arms; legs and pelvis keep the base layer (block, parry, hit-react). */
  upper?: boolean;
  /** Added on top of the base layer instead of replacing it (sprint lean). */
  additive?: boolean;
  keys: readonly Key[];
}

export const k = (u: number, r: BonePose, root?: V3, ease?: Ease): Key => ({ u, r, root, ease });

const SWAP = (n: BoneName): BoneName => (n.endsWith('_l') ? n.replace(/_l$/, '_r') : n.endsWith('_r') ? n.replace(/_r$/, '_l') : n) as BoneName;
/** Mirror across the body's midline: swap sides, negate y and z rotations and the sideways root offset. */
export function mirrorKey(key: Key, du = 0): Key {
  const r: Record<string, V3> = {};
  for (const n of BONES) { const v = key.r[n]; if (v) r[SWAP(n)] = [v[0], -v[1], -v[2]]; }
  return { u: key.u + du, r, root: key.root && [-key.root[0], key.root[1], key.root[2]], ease: key.ease };
}

/** A two-step cycle from two half-cycle poses (contact, passing): keys at 0, ¼, ½ (mirrored), ¾. */
export function cycle(id: string, len: number, contact: BonePose, passing: BonePose, rootContact: V3, rootPassing: V3): Clip {
  const a = k(0, contact, rootContact), b = k(0.25, passing, rootPassing);
  return { id, len, loop: true, spline: true, keys: [a, b, mirrorKey(a, 0.5), mirrorKey(b, 0.5)] };
}

/** Bone name → flat index helper for tests and tools. */
export const boneAt = (n: BoneName): number => BONE_INDEX[n] * 3;

/** The whole clip mirrored left↔right (strafe_l from strafe_r). */
export function mirrorClip(c: Clip, id: string): Clip { return { ...c, id, keys: c.keys.map((key) => mirrorKey(key)) }; }
