import { BALANCE } from '../balance';

/**
 * The strike ring as a function of the shared clock (ROUND3 §1): the marker phase is a pure function of time,
 * so the client draws it every frame and the server re-checks it at the strike's timestamp, with no drift.
 * The zone positions come from a seeded sequence both ends share.
 */
const R = BALANCE.forge.ring;

/** Marker phase 0..1 at time t: starts at p0 at t0 and runs one lap per `lap` seconds. */
export interface RingBase { p0: number; t0: number; lap: number }
export function phaseAt(b: RingBase, t: number): number {
  const v = (b.p0 + (t - b.t0) / b.lap) % 1;
  return v < 0 ? v + 1 : v;
}
/** Shortest distance between two phases on the ring (0..0.5). */
export function ringDist(a: number, b: number): number { const d = Math.abs(a - b) % 1; return Math.min(d, 1 - d); }

/** Deterministic 0..1 from (seed, k): the shared zone sequence. */
export function hash01(seed: number, k: number): number {
  let h = (Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(k | 0, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0x45d9f3b) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** The next zone center after a Trúng at marker phase `marker`: a random 0.15–0.45 ahead, and never under the marker. */
export function zoneAfter(marker: number, half: number, seed: number, k: number, g0: number = R.gapMin, g1: number = R.gapMax, clear: number = R.clear): number {
  const g = g0 + (g1 - g0) * hash01(seed, k);
  return (marker + Math.max(g, half + clear)) % 1;
}
