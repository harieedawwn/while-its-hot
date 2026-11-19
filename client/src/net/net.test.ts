import { describe, expect, it } from 'vitest';
import { BALANCE, type NetState } from '@wih/shared';
import { InterpBuffer, JitterMeter } from './interp';

const st = (x: number, yaw = 0, vx = 0): NetState => ({ x, y: 0, z: 0, vx, vy: 0, vz: 0, yaw, pitch: 0, anim: 0, animT: 0, flags: 1, weapon: 0, level: 0, stamina: 3, armor: 0, hp: 100 });

describe('interpolation buffer', () => {
  it('lerps between states and wraps yaw the short way', () => {
    const b = new InterpBuffer(), o = st(0);
    b.push(0, st(0, 3.0)); b.push(50, st(1, -3.0));
    expect(b.sample(25, o)).toBe('lerp');
    expect(o.x).toBeCloseTo(0.5);
    expect(Math.abs(Math.atan2(Math.sin(o.yaw), Math.cos(o.yaw)))).toBeGreaterThan(3.0); // through ±π, not through 0
  });
  it('extrapolates at most extrapMs, then holds', () => {
    const b = new InterpBuffer(), o = st(0);
    b.push(0, st(0, 0, 10)); b.push(50, st(0.5, 0, 10));
    expect(b.sample(80, o)).toBe('extrap'); expect(o.x).toBeCloseTo(0.8);
    expect(b.sample(400, o)).toBe('hold'); expect(o.x).toBeCloseTo(0.5 + 10 * BALANCE.net.interp.extrapMs / 1000);
  });
  it('drops late and duplicate states', () => {
    const b = new InterpBuffer();
    b.push(100, st(1)); b.push(50, st(9)); b.push(100, st(9));
    expect(b.size).toBe(1);
  });
});

describe('jitter meter', () => {
  it('steady 20 Hz → minimum delay; jittery → larger, clamped', () => {
    const a = new JitterMeter();
    for (let i = 0; i < 60; i++) a.add(i * 50, 1000 + i * 50);
    expect(a.target).toBe(BALANCE.net.interp.minMs);
    const j = new JitterMeter();
    for (let i = 0; i < 200; i++) j.add(i * 50, 1000 + i * 50 + (i % 2 ? 60 : 0));
    expect(j.target).toBeGreaterThan(150); expect(j.target).toBeLessThanOrEqual(BALANCE.net.interp.maxMs);
  });
});
