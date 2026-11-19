import type * as THREE from 'three';
import type { ModelCtx } from '../../render/models/kit';
import { cyl } from '../../render/models/kit';
import { COL } from '../palette';
import { blade, knob, profile, ring, taper, wrap } from '../shapes';
import { WeaponBuilder } from '../wkit';

/** Kiếm bản rộng (+10) — broadsword: wide fullered blade, long guard with a langet over the blade, wheel pommel. */
export function build(ctx: ModelCtx): THREE.Group {
  const b = new WeaponBuilder('kiem_ban_rong', 10);
  const w = (u: number) => (u < 0.84 ? 0.037 - 0.008 * u : 0.0303 * Math.pow((1 - u) / 0.16, 0.7));
  b.add(blade(taper(0.075, 0.9, 10, w, (u) => 0.0068 - 0.003 * u, (u) => ({ f: u < 0.68 ? 0.0024 : 0 })), { bevel: 0.5, fullerW: 0.2, edgeTint: 1.1 }),
    COL.steel, { skin: 'bright', uv: 'long' });
  b.add(profile([[-0.11, 0], [0.11, 0], [0.122, 0.02], [0.1, 0.024], [0.032, 0.021], [0.016, 0.05], [-0.016, 0.05], [-0.032, 0.021], [-0.1, 0.024], [-0.122, 0.02]], 0.02, 0.003),
    COL.dark, { pos: [0, 0.052, 0], heat: 0.35 });
  b.add(knob(0.013), COL.dark, { pos: [0, 0.064, 0.122], heat: 0.35 });
  b.add(knob(0.013), COL.dark, { pos: [0, 0.064, -0.122], heat: 0.35 });
  b.add(wrap(-0.058, 0.05, 0.016, 7, 0.0016), COL.leather, { skin: 'leather', uv: 'round', smooth: true });
  b.add(ring(0.017, 0.0028, 8), COL.dark, { pos: [0, -0.004, 0], heat: 0.3 });
  b.add(ring(0.0165, 0.0032, 8), COL.dark, { pos: [0, -0.059, 0], heat: 0.3 });
  b.add(cyl(0.032, 0.032, 0.018, 10), COL.dark, { pos: [0, -0.093, 0], rot: [0, 0, Math.PI / 2], heat: 0.35 });
  b.add(cyl(0.022, 0.022, 0.024, 10), COL.steel, { pos: [0, -0.093, 0], rot: [0, 0, Math.PI / 2], heat: 0.35 });
  b.mark('base', [0, 0.11, 0]).mark('tip', [0, 0.9, 0]);
  return b.done(ctx);
}
