import type * as THREE from 'three';
import type { ModelCtx } from '../../render/models/kit';
import { COL } from '../palette';
import { blade, pole, ring, taper, turn } from '../shapes';
import { tassel } from '../tassel';
import { WeaponBuilder } from '../wkit';

/** Thương thép (+6) — steel spear: long ridged leaf head on a clean socket, red tassel, iron butt cap. */
export function build(ctx: ModelCtx): THREE.Group {
  const b = new WeaponBuilder('thuong_thep', 6);
  b.add(pole(-0.66, 1.5, 0.0195, 0.0175), COL.wood, { skin: 'wood', uv: 'long' });
  b.add(turn([[0.021, 1.48], [0.022, 1.505], [0.016, 1.58], [0.0125, 1.625], [0, 1.63]], 7), COL.steel);
  b.add(ring(0.022, 0.004, 8), COL.dark, { pos: [0, 1.5, 0], heat: 0.4 });
  const w = (u: number) => 0.032 * Math.pow(Math.max(0, Math.sin(Math.PI * (0.1 + 0.9 * u))), 0.65) * (1 - 0.25 * u);
  b.add(blade(taper(1.62, 1.99, 9, w, (u) => 0.0085 - 0.0045 * u), { bevel: 0.16, fullerW: 0.08, edgeTint: 1.08 }), COL.steel, { uv: 'long' });
  tassel(b, 1.49, 0.13);
  b.add(turn([[0, -0.7], [0.016, -0.69], [0.021, -0.64], [0.02, -0.62]], 7), COL.iron, { skin: 'forged', heat: 0.3 });
  b.mark('base', [0, 1.62, 0]).mark('tip', [0, 1.99, 0]).mark('grip_l', [0, 0.6, 0]);
  return b.done(ctx);
}
