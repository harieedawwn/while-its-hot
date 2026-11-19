import { BONE_INDEX, BONES, POSE_LEN, ROOT_AT, type Pose } from './skeleton';
import type { Clip, Ease } from './clips/types';

const D2R = Math.PI / 180;
const EASE = { cubic: 0, in: 1, out: 2, linear: 3 } as const;

/** A clip flattened to typed arrays so sampling is allocation-free. */
export interface Compiled {
  id: string; len: number; loop: boolean; spline: boolean; upper: boolean; additive: boolean;
  n: number; u: Float32Array; ease: Uint8Array; data: Float32Array;
}

export function compile(c: Clip): Compiled {
  const keys = [...c.keys].sort((a, b) => a.u - b.u);
  const n = keys.length;
  const out: Compiled = {
    id: c.id, len: c.len, loop: c.loop, spline: !!c.spline, upper: !!c.upper, additive: !!c.additive,
    n, u: new Float32Array(n), ease: new Uint8Array(n), data: new Float32Array(n * POSE_LEN),
  };
  keys.forEach((key, i) => {
    out.u[i] = key.u; out.ease[i] = EASE[(key.ease ?? 'cubic') as Ease];
    for (const b of BONES) {
      const v = key.r[b]; if (!v) continue;
      const o = i * POSE_LEN + BONE_INDEX[b] * 3;
      out.data[o] = v[0] * D2R; out.data[o + 1] = v[1] * D2R; out.data[o + 2] = v[2] * D2R;
    }
    if (key.root) out.data.set(key.root, i * POSE_LEN + ROOT_AT);
  });
  return out;
}

function shape(e: number, t: number): number {
  switch (e) { case 1: return t * t; case 2: return 1 - (1 - t) * (1 - t); case 3: return t; default: return t * t * (3 - 2 * t); }
}

/** Sample a compiled clip at u (looping clips wrap, others clamp) into `out`. */
export function sample(c: Compiled, uIn: number, out: Pose): void {
  const { n, u, data } = c;
  let t = uIn;
  if (c.loop) t -= Math.floor(t); else t = t < 0 ? 0 : t > 1 ? 1 : t;
  if (n === 1) { out.set(data.subarray(0, POSE_LEN)); return; }
  // segment i0 → i1; for loops the last key wraps to the first (u + 1)
  let i0 = n - 1;
  for (let i = 0; i < n; i++) if (u[i] > t) { i0 = i - 1; break; }
  let u0: number, u1: number, i1: number;
  if (i0 < 0) { i0 = n - 1; u0 = u[i0] - 1; i1 = 0; u1 = u[0]; }
  else if (i0 === n - 1) { if (c.loop) { i1 = 0; u0 = u[i0]; u1 = u[0] + 1; } else { out.set(data.subarray(i0 * POSE_LEN, (i0 + 1) * POSE_LEN)); return; } }
  else { i1 = i0 + 1; u0 = u[i0]; u1 = u[i1]; }
  const f = u1 > u0 ? (t - u0) / (u1 - u0) : 0;
  const A = i0 * POSE_LEN, B = i1 * POSE_LEN;
  if (c.spline) {
    const im = c.loop ? (i0 + n - 1) % n : Math.max(0, i0 - 1), ip = c.loop ? (i1 + 1) % n : Math.min(n - 1, i1 + 1);
    const M = im * POSE_LEN, Pn = ip * POSE_LEN, f2 = f * f, f3 = f2 * f;
    for (let j = 0; j < POSE_LEN; j++) {
      const p0 = data[M + j], p1 = data[A + j], p2 = data[B + j], p3 = data[Pn + j];
      out[j] = 0.5 * (2 * p1 + (p2 - p0) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f2 + (3 * p1 - p0 - 3 * p2 + p3) * f3);
    }
  } else {
    const e = shape(c.ease[i0], f);
    for (let j = 0; j < POSE_LEN; j++) out[j] = data[A + j] + (data[B + j] - data[A + j]) * e;
  }
}

/** Per-slot masks: 1 where a clip with `upper` takes over (chest, head, both arms). */
export const UPPER_MASK: Float32Array = (() => {
  const m = new Float32Array(POSE_LEN);
  for (const b of BONES) if (b === 'chest' || b === 'head' || b.startsWith('arm_') || b.startsWith('fore_') || b.startsWith('hand_')) m.fill(1, BONE_INDEX[b] * 3, BONE_INDEX[b] * 3 + 3);
  return m;
})();
export const FULL_MASK: Float32Array = new Float32Array(POSE_LEN).fill(1);

/** out = a + (b − a) · w · mask */
export function blend(out: Pose, a: Pose, b: Pose, w: number, mask: Float32Array = FULL_MASK): void {
  for (let j = 0; j < POSE_LEN; j++) out[j] = a[j] + (b[j] - a[j]) * w * mask[j];
}
export function addScaled(out: Pose, add: Pose, w: number): void { for (let j = 0; j < POSE_LEN; j++) out[j] += add[j] * w; }
