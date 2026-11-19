import type * as THREE from 'three';
import { cbox } from '../../render/geo/cbox';
import type { ModelCtx } from '../../render/models/kit';
import { COL } from '../palette';
import { blade, knob, taper, wrap } from '../shapes';
import { WeaponBuilder } from '../wkit';

/** Kiếm thô (+3) — first sword: short, uneven, hammer-dented; a bent bar for a guard, cord grip, lump pommel. */
export function build(ctx: ModelCtx): THREE.Group {
  const b = new WeaponBuilder('kiem_tho', 3);
  const w = (u: number) => (u < 0.8 ? 0.027 - 0.004 * u : 0.0238 * Math.pow((1 - u) / 0.2, 0.75));
  // asymmetric: the centerline wanders and the bevels are cut unevenly
  b.add(blade(taper(0.065, 0.72, 8, w, (u) => 0.0068 - 0.003 * u, (u) => ({ z: Math.sin(u * 7.3) * 0.0022 })), { bevel: 0.38 }),
    COL.raw, { skin: 'forged', dent: 0.0016, pits: 0.28 });
  b.add(cbox(0.016, 0.02, 0.13, 0.004), COL.iron, { pos: [0, 0.056, 0.002], rot: [0.08, 0, 0.04], skin: 'forged', dent: 0.0015, heat: 0.4 });
  b.add(wrap(-0.055, 0.048, 0.0145, 7, 0.0028), COL.cord, { skin: 'leather', uv: 'round', smooth: true });
  b.add(knob(0.021), COL.iron, { pos: [0, -0.072, 0], scale: [0.85, 0.75, 1], skin: 'forged', dent: 0.002, heat: 0.4 });
  b.mark('base', [0, 0.1, 0]).mark('tip', [0, 0.72, 0]);
  return b.done(ctx);
}
