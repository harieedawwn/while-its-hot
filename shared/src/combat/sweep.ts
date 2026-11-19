import { BALANCE } from '../balance';
import type { Arc } from './frames';

/**
 * Blade sweep vs hit capsules (TECH §4 "Melee hits"), pure math on number triples so the server can
 * re-run it. The blade is a segment in the attacker's swing frame (eye, look yaw, clamped pitch): slashes
 * rotate it across the arc, thrusts extend it forward. Sub-steps keep the tip travel ≤ maxStepM, so a fast
 * swing never tunnels through a thin target.
 */
export type V3 = [number, number, number];
export type Zone = 'head' | 'torso' | 'legs';
export interface Capsule { a: V3; b: V3; r: number; zone: Zone; }
export interface SwingFrame { eye: V3; fwd: V3; right: V3; up: V3; }

const S = BALANCE.combat.sweep;
const D2R = Math.PI / 180;
const ZONES: Zone[] = ['head', 'torso', 'legs'];

/** The three hit capsules of a body standing at feet, scaled to the posture height (1.8 standing). */
export function bodyCapsules(feet: V3, height: number): Capsule[] {
  const k = height / BALANCE.move.body.height, caps = BALANCE.combat.capsules;
  return ZONES.map((zone) => {
    const c = caps[zone];
    return { a: [feet[0], feet[1] + c.y0 * k, feet[2]], b: [feet[0], feet[1] + c.y1 * k, feet[2]], r: c.r, zone };
  });
}

/** Swing frame from the attack origin (eye dropped a little) and look angles; yaw 0 looks down −Z. */
export function swingFrame(eye: V3, yaw: number, pitch: number): SwingFrame {
  const p = Math.max(-S.pitchMaxDeg * D2R, Math.min(S.pitchMaxDeg * D2R, pitch));
  const sy = Math.sin(yaw), cy = Math.cos(yaw), sp = Math.sin(p), cp = Math.cos(p);
  const fwd: V3 = [-sy * cp, sp, -cy * cp];
  const right: V3 = [cy, 0, -sy];
  const up: V3 = [right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0]];
  return { eye: [eye[0], eye[1] - S.eyeDrop, eye[2]], fwd, right, up };
}

/** Slash angle (degrees) at u, the arc rescaled around its middle to arcDeg (passives widen it). */
export function arcAngle(arc: Arc, arcDeg: number, u: number): number {
  const span = arc.to - arc.from, mid = (arc.from + arc.to) / 2;
  const half = span === 0 ? 0 : (span / 2) * (arcDeg / Math.abs(span));
  return mid - half + 2 * half * u;
}

/**
 * Blade direction at u in a frame given as fwd/right/up triples (view space works too: fwd −Z, right +X, up +Y).
 * Writes into out and returns the extension (fraction of reach) for thrusts, 1 for slashes.
 */
export function bladeDir(f: Pick<SwingFrame, 'fwd' | 'right' | 'up'>, arc: Arc, arcDeg: number, u: number, out: V3): number {
  if (arc.kind === 'thrust') { out[0] = f.fwd[0]; out[1] = f.fwd[1]; out[2] = f.fwd[2]; return arc.from + (arc.to - arc.from) * u; }
  const a = arcAngle(arc, arcDeg, u) * D2R, r = arc.roll * D2R;
  const ca = Math.cos(a), sa = Math.sin(a), cr = Math.cos(r), sr = Math.sin(r);
  for (let i = 0; i < 3; i++) out[i] = f.fwd[i] * ca + (f.right[i] * cr + f.up[i] * sr) * sa;
  return 1;
}

const dir: V3 = [0, 0, 0];
/** Blade segment base→tip at u. */
export function bladeAt(f: SwingFrame, arc: Arc, arcDeg: number, reach: number, u: number, base: V3, tip: V3): void {
  const ext = bladeDir(f, arc, arcDeg, u, dir);
  for (let i = 0; i < 3; i++) { base[i] = f.eye[i] + dir[i] * S.baseM; tip[i] = f.eye[i] + dir[i] * reach * ext; }
}

/** Squared distance between segments p1q1 and p2q2 (Ericson, Real-Time Collision Detection 5.1.9). */
export function segSegDist2(p1: V3, q1: V3, p2: V3, q2: V3, onA?: V3): number {
  const d1 = sub(q1, p1), d2 = sub(q2, p2), r = sub(p1, p2);
  const a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r);
  let s: number, t: number;
  if (a <= 1e-12 && e <= 1e-12) { s = t = 0; }
  else if (a <= 1e-12) { s = 0; t = clamp01(f / e); }
  else {
    const c = dot(d1, r);
    if (e <= 1e-12) { t = 0; s = clamp01(-c / a); }
    else {
      const b = dot(d1, d2), den = a * e - b * b;
      s = den > 1e-12 ? clamp01((b * f - c * e) / den) : 0;
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = clamp01(-c / a); } else if (t > 1) { t = 1; s = clamp01((b - c) / a); }
    }
  }
  let d = 0;
  for (let i = 0; i < 3; i++) {
    const ca = p1[i] + d1[i] * s, cb = p2[i] + d2[i] * t;
    if (onA) onA[i] = ca;
    d += (ca - cb) ** 2;
  }
  return d;
}

export interface SweepHit { zone: Zone; u: number; point: V3; }
const b0: V3 = [0, 0, 0], t0: V3 = [0, 0, 0], b1: V3 = [0, 0, 0], t1: V3 = [0, 0, 0];

/** First capsule the blade touches between u0 and u1 (sub-stepped), or null. Head wins ties, then torso. */
export function sweepHit(f: SwingFrame, arc: Arc, arcDeg: number, reach: number, u0: number, u1: number, caps: Capsule[]): SweepHit | null {
  bladeAt(f, arc, arcDeg, reach, u0, b0, t0);
  bladeAt(f, arc, arcDeg, reach, u1, b1, t1);
  const travel = Math.hypot(t1[0] - t0[0], t1[1] - t0[1], t1[2] - t0[2]);
  const n = Math.max(1, Math.ceil(travel / S.maxStepM));
  const point: V3 = [0, 0, 0];
  for (let i = 0; i <= n; i++) {
    const u = u0 + ((u1 - u0) * i) / n;
    bladeAt(f, arc, arcDeg, reach, u, b0, t0);
    for (const c of caps) if (segSegDist2(b0, t0, c.a, c.b, point) <= c.r * c.r) return { zone: c.zone, u, point };
  }
  return null;
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
