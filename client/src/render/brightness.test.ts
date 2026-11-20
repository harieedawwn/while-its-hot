import { describe, expect, it } from 'vitest';
import { brightnessParams, liftLight, liftSrgb } from './brightness';

describe('Độ sáng', () => {
  it('0 is the original look: both lifts are identity', () => {
    const p = brightnessParams(0);
    expect(p).toEqual({ floor: 0, gamma: 0 });
    for (const v of [0, 0.1, 0.5, 1]) { expect(liftLight(v, p.floor)).toBe(v); expect(liftSrgb(v, p.gamma)).toBe(v); }
  });
  it('lifts the dark end more than the bright end, never past 1, monotonic', () => {
    const p = brightnessParams(100);
    expect(liftSrgb(0.2, p.gamma) - 0.2).toBeGreaterThan(liftSrgb(0.8, p.gamma) - 0.8);
    expect(liftSrgb(1, p.gamma)).toBe(1);
    expect(liftLight(1, p.floor)).toBe(1);
    let prev = -1;
    for (let i = 0; i <= 20; i++) { const v = liftSrgb(i / 20, p.gamma); expect(v).toBeGreaterThanOrEqual(prev); prev = v; }
  });
  it('is monotonic in the slider and the heat ramp bypasses the lift', () => {
    expect(liftSrgb(0.3, brightnessParams(65).gamma)).toBeGreaterThan(0.3);
    expect(liftSrgb(0.3, brightnessParams(100).gamma)).toBeGreaterThan(liftSrgb(0.3, brightnessParams(65).gamma));
    expect(liftSrgb(0.3, 0.6, true)).toBe(0.3);
  });
});
