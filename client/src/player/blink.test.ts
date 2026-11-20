import { describe, expect, it } from 'vitest';
import { safeSpot } from './blink';

describe('blink landing (phase 29)', () => {
  const from = { x: 0, y: 0, z: 0 };
  it('lands on the wished spot when it is free', () => {
    expect(safeSpot(from, { x: 0, y: 0, z: -12 }, () => true)).toEqual([0, 0, -12]);
  });
  it('steps back toward the start until the capsule fits', () => {
    const free = (_x: number, _y: number, z: number) => z > -8.2;
    const [, , z] = safeSpot(from, { x: 0, y: 0, z: -12 }, free);
    expect(z).toBeGreaterThan(-8.2);
    expect(z).toBeLessThan(-7.4);
  });
  it('stays where it was when nothing fits', () => {
    expect(safeSpot(from, { x: 3, y: 0, z: -4 }, () => false)).toEqual([0, 0, 0]);
  });
});
