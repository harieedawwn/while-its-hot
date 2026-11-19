import type * as THREE from 'three';
import type { ModelCtx } from '../../render/models/kit';
import { COL, DOWN, outward } from '../palette';
import { blade, pole, profile, ring, spike, taper, turn, wrap } from '../shapes';
import { tassel } from '../tassel';
import { WeaponBuilder } from '../wkit';

/** Đại đao (+14) — guandao: broad single-edged blade, edge toward +Z, tip curling back; spur on the spine, brass mouth collar. */
export function build(ctx: ModelCtx): THREE.Group {
  const b = new WeaponBuilder('dai_dao', 14);
  b.add(pole(-0.76, 1.38, 0.02, 0.0185, 8), COL.woodDark, { skin: 'wood', uv: 'long' });
  for (const [y0, y1] of [[-0.1, 0.13], [0.5, 0.72]]) b.add(wrap(y0, y1, 0.0215, 5, 0.0016), COL.leather, { skin: 'leather', uv: 'round', smooth: true });
  for (const y of [0.9, 1.15]) b.add(ring(0.0205, 0.0035, 8), COL.iron, { pos: [0, y, 0], skin: 'forged', heat: 0.2 });
  // collar: brass ring + a steel "mouth" that grips the blade root
  b.add(turn([[0.022, 1.35], [0.026, 1.37], [0.026, 1.41], [0.03, 1.43], [0.02, 1.45], [0, 1.45]], 8), COL.brass, { heat: 0.3 });
  b.add(profile([[-0.05, 0], [0.04, 0], [0.05, 0.03], [0.02, 0.05], [-0.03, 0.06], [-0.06, 0.03]], 0.026, 0.004), COL.steel, { pos: [0, 1.42, 0], heat: 0.6 });
  const w = (u: number) => (u < 0.72 ? 0.042 + 0.03 * u : 0.0636 * Math.pow((1 - u) / 0.28, 0.6));
  const z = (u: number) => 0.012 * Math.sin(u * Math.PI * 0.8) - 0.055 * u * u * u;
  b.add(blade(taper(1.45, 2.06, 16, w, (u) => 0.0092 - 0.005 * u, (u) => ({ z: z(u), f: u < 0.62 ? 0.0024 : 0 })),
    { single: true, bevel: 0.3, fullerW: 0.12, edgeTint: 1.12 }), COL.steel, { uv: 'long' });
  b.add(spike(0.06, 0.012, 4), COL.steel, { pos: [0, 1.64, z(0.3) - 0.055], rot: outward(Math.PI / 2, 0.5) });
  tassel(b, 1.36, 0.13, 6, 0.03);
  b.add(spike(0.11, 0.016, 4), COL.iron, { pos: [0, -0.76, 0], rot: DOWN, skin: 'forged', heat: 0.3 });
  b.mark('base', [0, 1.47, 0]).mark('tip', [0, 2.06, z(1)]).mark('grip_l', [0, 0.61, 0]);
  return b.done(ctx);
}
