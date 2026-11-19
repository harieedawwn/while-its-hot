import type * as THREE from 'three';
import type { ModelCtx } from '../../render/models/kit';
import { COL, outward } from '../palette';
import { knob, pole, ring, spike, turn, wrap } from '../shapes';
import { WeaponBuilder } from '../wkit';

/** Chùy gai (+10) — spiked mace: barrel head with two staggered rings of spikes and a crown spike, banded haft. */
export function build(ctx: ModelCtx): THREE.Group {
  const b = new WeaponBuilder('chuy_gai', 10);
  b.add(pole(-0.12, 0.66, 0.018, 0.017), COL.woodDark, { skin: 'wood', uv: 'long' });
  b.add(turn([[0, 0.6], [0.022, 0.605], [0.046, 0.64], [0.058, 0.7], [0.048, 0.76], [0.024, 0.795], [0, 0.8]], 8), COL.steel, { skin: 'bright' });
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4, y = i % 2 ? 0.735 : 0.665, r = i % 2 ? 0.05 : 0.054;
    b.add(spike(0.055, 0.013, 4), COL.steel, { pos: [Math.cos(a) * r, y, -Math.sin(a) * r], rot: outward(a, i % 2 ? 0.25 : -0.15) });
  }
  b.add(spike(0.06, 0.014, 4), COL.steel, { pos: [0, 0.795, 0] });
  b.add(ring(0.024, 0.005, 8), COL.dark, { pos: [0, 0.6, 0], heat: 0.4 });
  for (const y of [0.5, 0.2]) b.add(ring(0.019, 0.003, 8), COL.iron, { pos: [0, y, 0], skin: 'forged', heat: 0.2 });
  b.add(wrap(-0.115, 0.07, 0.0195, 6, 0.0018), COL.leather, { skin: 'leather', uv: 'round', smooth: true });
  b.add(knob(0.024), COL.dark, { pos: [0, -0.13, 0], scale: [1, 0.7, 1], heat: 0.3 });
  b.mark('base', [0, 0.6, 0]).mark('tip', [0, 0.82, 0]);
  return b.done(ctx);
}
