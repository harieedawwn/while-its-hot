import { COL, DOWN } from './palette';
import { spike } from './shapes';
import type { WeaponBuilder } from './wkit';

/** Red horsehair tassel under a polearm head: `n` thin cones hanging from y, splayed a little. */
export function tassel(b: WeaponBuilder, y: number, len: number, n = 6, r = 0.026): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.3, L = len * (0.85 + 0.3 * ((i * 7) % 5) / 5);
    b.add(spike(L, 0.011, 3), COL.red, { pos: [Math.cos(a) * r * 0.6, y, Math.sin(a) * r * 0.6], rot: [DOWN[0] - Math.sin(a) * 0.18, 0, Math.cos(a) * 0.18], skin: 'leather', heat: 0, smooth: true });
  }
}
