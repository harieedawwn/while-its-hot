import { describe, expect, it } from 'vitest';
import { OneEuro, deadband, gyroRates, gyroStep } from './gyro-math';

const D = 180 / Math.PI;
/** A screen-frame angular velocity (rad/s about screen right / up / out) as devicemotion would report it, plus the "up" reading. */
function sensor(angle: number, w: [number, number, number], up: [number, number, number]) {
  const s = angle === 270 ? -1 : 1;
  return {
    r: { alpha: w[2] * D, beta: s * w[1] * D, gamma: -s * w[0] * D },
    acc: { x: s * up[1] * 9.8, y: -s * up[0] * 9.8, z: up[2] * 9.8 },
  };
}
const n = (x: number, y: number, z: number): [number, number, number] => { const m = Math.hypot(x, y, z); return [x / m, y / m, z / m]; };
const POSES: [string, [number, number, number]][] = [['upright', [0, 1, 0]], ['tilted back 40°', n(0, 0.77, 0.64)], ['flat', [0, 0, 1]], ['tipped forward', n(0, 0.7, -0.7)]];

describe('gyro mapping', () => {
  for (const angle of [90, 270]) for (const [name, up] of POSES) {
    it(`tilting the phone up never turns the view sideways (${angle}°, ${name})`, () => {
      // pure rotation about the screen's horizontal axis
      const { r, acc } = sensor(angle, [1, 0, 0], up);
      const q = gyroRates(r, acc, angle);
      expect(q.pitch).toBeCloseTo(1, 5);
      if (name === 'upright' || name === 'flat') expect(q.yaw).toBeCloseTo(0, 5);
    });
    it(`turning about gravity is pure yaw (${angle}°, ${name})`, () => {
      // counter-clockwise about up: the view turns left
      const w = up.map((c) => c * 1) as [number, number, number];
      const { r, acc } = sensor(angle, w, up);
      const q = gyroRates(r, acc, angle);
      expect(q.yaw).toBeCloseTo(-1, 5);
      expect(q.pitch).toBeCloseTo(w[0], 5); // only the screen-x part, 0 for these poses
      expect(Math.abs(w[0])).toBeLessThan(1e-9);
    });
  }
  it('falls back to the screen vertical when gravity is missing', () => {
    const { r } = sensor(90, [0, 2, 0], [0, 1, 0]);
    expect(gyroRates(r, null, 90).yaw).toBeCloseTo(-2, 5);
  });
  it('both landscapes give the same view motion for the same physical turn', () => {
    const a = sensor(90, [0.4, 1, 0], [0, 1, 0]), b = sensor(270, [0.4, 1, 0], [0, 1, 0]);
    const qa = gyroRates(a.r, a.acc, 90), qb = gyroRates(b.r, b.acc, 270);
    expect(qa.yaw).toBeCloseTo(qb.yaw, 5); expect(qa.pitch).toBeCloseTo(qb.pitch, 5);
  });
  it('step: invert flips pitch only, sens scales, a hard flick is capped', () => {
    const a = gyroStep(0.5, 0.5, 0.01, 1, false), b = gyroStep(0.5, 0.5, 0.01, 1, true);
    expect(b.dy).toBeCloseTo(-a.dy); expect(b.dx).toBeCloseTo(a.dx);
    expect(gyroStep(0.5, 0, 0.01, 2, false).dx).toBeCloseTo(a.dx * 2);
    expect(gyroStep(99, 0, 0.01, 1, false).dx).toBeCloseTo(2 * Math.PI * 0.01);
  });
  it('dead zone swallows sensor noise and has no jump at the edge', () => {
    expect(deadband(0.001, 0.004)).toBe(0);
    expect(deadband(0.0041, 0.004)).toBeLessThan(0.0002);
  });
  it('one-euro: removes jitter at rest, follows a fast turn closely', () => {
    const f = new OneEuro();
    let peak = 0;
    for (let i = 0; i < 200; i++) { const o = f.filter(i % 2 ? 0.01 : -0.01, 0.005); if (i > 20) peak = Math.max(peak, Math.abs(o)); }
    expect(peak).toBeLessThan(0.006);
    const g = new OneEuro(); let out = 0;
    for (let i = 0; i < 40; i++) out = g.filter(5, 0.005);
    expect(out).toBeGreaterThan(4.5);
  });
});
