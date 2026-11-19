import type * as THREE from 'three';
import type { ModelCtx } from '../../render/models/kit';
import { COL } from '../palette';
import { blade, profile, ring, taper, turn, wrap } from '../shapes';
import { WeaponBuilder } from '../wkit';

/** Trường kiếm (+14) — longsword: long tapering blade, swept quillons, hand-and-a-half grip, scent-stopper pommel. */
export function build(ctx: ModelCtx): THREE.Group {
  const b = new WeaponBuilder('truong_kiem', 14);
  const w = (u: number) => (u < 0.88 ? 0.027 - 0.011 * u : 0.0173 * Math.pow((1 - u) / 0.12, 0.85));
  b.add(blade(taper(0.08, 1.07, 12, w, (u) => 0.0068 - 0.0034 * u, (u) => ({ f: u < 0.48 ? 0.002 : 0 })), { bevel: 0.4, fullerW: 0.15, edgeTint: 1.12 }),
    COL.steel, { skin: 'bright', uv: 'long' });
  // ricasso block, then quillons that sweep up toward the blade
  b.add(profile([[-0.03, 0], [0.03, 0], [0.034, 0.02], [-0.034, 0.02]], 0.016, 0.003), COL.dark, { pos: [0, 0.06, 0], heat: 0.4 });
  b.add(profile([[-0.135, 0.034], [-0.122, 0.012], [-0.04, 0], [0.04, 0], [0.122, 0.012], [0.135, 0.034], [0.126, 0.038], [0.11, 0.022], [0.04, 0.014], [-0.04, 0.014], [-0.11, 0.022], [-0.126, 0.038]], 0.018, 0.003),
    COL.dark, { pos: [0, 0.048, 0], heat: 0.35 });
  b.add(wrap(-0.2, 0.048, 0.016, 12, 0.0015), COL.leather, { skin: 'leather', uv: 'round', smooth: true });
  b.add(ring(0.0168, 0.0028, 8), COL.dark, { pos: [0, -0.076, 0], heat: 0.3 });
  b.add(turn([[0, -0.29], [0.012, -0.286], [0.024, -0.268], [0.021, -0.248], [0.012, -0.234], [0.017, -0.222], [0.012, -0.204], [0, -0.2]], 8),
    COL.dark, { heat: 0.35 });
  b.mark('base', [0, 0.11, 0]).mark('tip', [0, 1.07, 0]).mark('grip_l', [0, -0.14, 0]);
  return b.done(ctx);
}
