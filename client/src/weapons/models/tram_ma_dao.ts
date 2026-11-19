import type * as THREE from 'three';
import { cbox } from '../../render/geo/cbox';
import type { ModelCtx } from '../../render/models/kit';
import { cyl } from '../../render/models/kit';
import { COL, DOWN } from '../palette';
import { blade, knob, pole, spike, taper, turn, wrap } from '../shapes';
import { tassel } from '../tassel';
import { WeaponBuilder } from '../wkit';

/**
 * Trảm mã đao (+18) — masterwork: a metre of slightly curved, hamon-edged blade with a brass spine inlay over a
 * brass disc guard; long wrapped two-hand shaft banded in brass; tassel at the guard; brass butt spike.
 */
export function build(ctx: ModelCtx): THREE.Group {
  const b = new WeaponBuilder('tram_ma_dao', 18);
  b.add(pole(-0.8, 0.84, 0.0195, 0.019, 8), COL.woodDark, { skin: 'wood', uv: 'long' });
  for (const [y0, y1] of [[-0.12, 0.16], [0.5, 0.8]]) b.add(wrap(y0, y1, 0.0215, 8, 0.0016), COL.leatherDark, { skin: 'leather', uv: 'round', smooth: true });
  for (const y of [-0.13, 0.17, 0.49, 0.81]) b.add(cyl(0.0235, 0.0235, 0.014, 8), COL.brass, { pos: [0, y, 0], heat: 0.25 });
  b.add(cyl(0.056, 0.056, 0.012, 12), COL.brass, { pos: [0, 0.85, 0], heat: 0.3 });
  b.add(turn([[0.018, 0.856], [0.02, 0.87], [0.016, 0.9], [0, 0.9]], 6), COL.steel, { heat: 0.6 });
  const w = (u: number) => (u < 0.86 ? 0.034 - 0.007 * u : 0.028 * Math.pow((1 - u) / 0.14, 0.55));
  const z = (u: number) => -0.04 * u * u;
  b.add(blade(taper(0.86, 1.86, 12, w, (u) => 0.0082 - 0.004 * u, (u) => ({ z: z(u), f: u < 0.7 ? 0.0022 : 0 })),
    { single: true, bevel: 0.34, fullerW: 0.1, edgeTint: 1.22, fullerTint: 0.55 }), COL.steel, { uv: 'long' });
  for (const s of [1, -1]) b.add(cbox(0.001, 0.28, 0.004, 0.0004), COL.brass, { pos: [s * 0.0076, 1.04, -0.022], rot: [0.012, 0, 0], heat: 0.25 });
  tassel(b, 0.84, 0.15, 6, 0.04);
  b.add(knob(0.026), COL.brass, { pos: [0, -0.82, 0], scale: [1, 0.8, 1], heat: 0.3 });
  b.add(spike(0.08, 0.014, 4), COL.brass, { pos: [0, -0.835, 0], rot: DOWN, heat: 0.3 });
  b.mark('base', [0, 0.9, 0]).mark('tip', [0, 1.86, z(1)]).mark('grip_l', [0, 0.65, 0]);
  return b.done(ctx);
}
