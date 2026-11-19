import type * as THREE from 'three';
import { cbox } from '../../render/geo/cbox';
import type { ModelCtx } from '../../render/models/kit';
import { COL } from '../palette';
import { pole, profile, wrap } from '../shapes';
import { WeaponBuilder } from '../wkit';

/** Búa tạ (+6) — sledge: long chamfered block head, iron langets down the haft, leather grip, capped butt. */
export function build(ctx: ModelCtx): THREE.Group {
  const b = new WeaponBuilder('bua_ta', 6);
  b.add(pole(-0.1, 0.78, 0.019, 0.016), COL.wood, { skin: 'wood', uv: 'long' });
  b.add(profile([[0.11, -0.03], [0.118, -0.024], [0.118, 0.024], [0.11, 0.03], [-0.11, 0.03], [-0.118, 0.024], [-0.118, -0.024], [-0.11, -0.03]], 0.058, 0.005),
    COL.raw, { pos: [0, 0.76, 0], skin: 'forged', dent: 0.0012, pits: 0.16 });
  for (const s of [1, -1]) {
    b.add(cbox(0.005, 0.17, 0.02, 0.0015), COL.iron, { pos: [s * 0.018, 0.66, 0], skin: 'forged', heat: 0.3 });
    b.add(cbox(0.006, 0.008, 0.008, 0.002), COL.iron, { pos: [s * 0.021, 0.6, 0], skin: 'forged', heat: 0.3 });
  }
  b.add(wrap(-0.095, 0.075, 0.0205, 5, 0.0022), COL.leather, { skin: 'leather', uv: 'round', smooth: true });
  b.add(cbox(0.044, 0.02, 0.044, 0.006), COL.iron, { pos: [0, -0.108, 0], skin: 'forged', heat: 0.3 });
  b.mark('base', [0, 0.68, 0]).mark('tip', [0, 0.8, 0]);
  return b.done(ctx);
}
