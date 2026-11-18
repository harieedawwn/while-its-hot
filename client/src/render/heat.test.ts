import { describe, expect, it } from 'vitest';
import { HEAT_HEX, HEAT_STEPS, heatHex, heatStep, stepHeat } from './heat';

describe('heat ramp', () => {
  it('has the 9 LOOK §5 steps, dark to white', () => {
    expect(HEAT_STEPS).toBe(9);
    expect(HEAT_HEX[0]).toBe('#1a0b08');
    expect(HEAT_HEX[8]).toBe('#fffaf0');
  });
  it('maps heat to discrete steps and clamps', () => {
    expect(heatStep(-1)).toBe(0);
    expect(heatStep(0)).toBe(0);
    expect(heatStep(0.5)).toBe(4);
    expect(heatStep(0.999)).toBe(8);
    expect(heatStep(1)).toBe(8);
    expect(heatStep(5)).toBe(8);
    expect(heatHex(1)).toBe('#fffaf0');
  });
  it('stepHeat(i) lands inside step i', () => {
    for (let i = 0; i < HEAT_STEPS; i++) expect(heatStep(stepHeat(i))).toBe(i);
  });
  it('is monotonic', () => {
    let last = 0;
    for (let h = 0; h <= 1; h += 0.01) { const s = heatStep(h); expect(s).toBeGreaterThanOrEqual(last); last = s; }
  });
});
