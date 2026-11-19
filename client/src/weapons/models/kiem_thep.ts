import type * as THREE from 'three';
import type { ModelCtx } from '../../render/models/kit';
import { cyl } from '../../render/models/kit';
import { COL } from '../palette';
import { blade, profile, ring, taper, wrap } from '../shapes';
import { WeaponBuilder } from '../wkit';

/** Kiếm thép (+6) — a proper arming sword: straight ground blade with a short fuller, flared guard, disc pommel. */
export function build(ctx: ModelCtx): THREE.Group {
  const b = new WeaponBuilder('kiem_thep', 6);
  const w = (u: number) => (u < 0.82 ? 0.025 - 0.006 * u : 0.0201 * Math.pow((1 - u) / 0.18, 0.8));
  b.add(blade(taper(0.07, 0.84, 9, w, (u) => 0.0064 - 0.003 * u, (u) => ({ f: u < 0.5 ? 0.0016 : 0 })), { bevel: 0.42, edgeTint: 1.08 }),
    COL.steel, { skin: 'bright', uv: 'long' });
  b.add(profile([[-0.088, 0], [0.088, 0], [0.094, 0.018], [0.07, 0.013], [0.02, 0.016], [-0.02, 0.016], [-0.07, 0.013], [-0.094, 0.018]], 0.014, 0.003),
    COL.dark, { pos: [0, 0.052, 0], heat: 0.35 });
  b.add(wrap(-0.052, 0.05, 0.015, 6, 0.0016), COL.leather, { skin: 'leather', uv: 'round', smooth: true });
  b.add(ring(0.0155, 0.003, 8), COL.dark, { pos: [0, 0.05, 0], heat: 0.3 });
  b.add(ring(0.0155, 0.003, 8), COL.dark, { pos: [0, -0.053, 0], heat: 0.3 });
  b.add(cyl(0.025, 0.025, 0.015, 8), COL.dark, { pos: [0, -0.078, 0], rot: [0, 0, Math.PI / 2], heat: 0.35 });
  b.add(cyl(0.008, 0.008, 0.02, 6), COL.steel, { pos: [0, -0.078, 0], rot: [0, 0, Math.PI / 2], heat: 0.35 });
  b.mark('base', [0, 0.1, 0]).mark('tip', [0, 0.84, 0]);
  return b.done(ctx);
}
