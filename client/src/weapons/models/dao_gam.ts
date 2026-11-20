import type * as THREE from 'three';
import { cbox } from '../../render/geo/cbox';
import type { ModelCtx } from '../../render/models/kit';
import { COL } from '../palette';
import { blade, knob, pole, taper, wrap } from '../shapes';
import { WeaponBuilder } from '../wkit';

/** Dao găm (+3) — first knife: a short straight hammer-finished blade, a stub iron bolster, wooden grip bound in cord, lump pommel. */
export function build(ctx: ModelCtx): THREE.Group {
  const b = new WeaponBuilder('dao_gam', 7);
  // spine runs straight, the edge sweeps up into the point (clip point), so it reads as a knife, not a small sword
  const w = (u: number) => (u < 0.7 ? 0.021 - 0.003 * u : 0.0189 * Math.pow((1 - u) / 0.3, 0.85));
  b.add(blade(taper(0.042, 0.33, 8, w, (u) => 0.0064 - 0.003 * u, (u) => ({ z: u > 0.6 ? -0.006 * (u - 0.6) : 0 })), { bevel: 0.42, edgeTint: 1.15 }),
    COL.raw, { skin: 'forged', dent: 0.0011, pits: 0.22 });
  b.add(cbox(0.02, 0.014, 0.058, 0.003), COL.iron, { pos: [0, 0.035, -0.002], skin: 'forged', dent: 0.0008, heat: 0.4 });
  b.add(pole(-0.082, 0.028, 0.0128, 0.0142, 7), COL.woodDark, { skin: 'wood', uv: 'long' });
  b.add(wrap(-0.064, 0.016, 0.0146, 5, 0.0024), COL.cord, { skin: 'leather', uv: 'round', smooth: true });
  b.add(knob(0.0165), COL.iron, { pos: [0, -0.088, 0], scale: [0.85, 0.7, 1.05], skin: 'forged', dent: 0.0012, heat: 0.4 });
  b.mark('base', [0, 0.06, 0]).mark('tip', [0, 0.33, 0]);
  return b.done(ctx);
}
