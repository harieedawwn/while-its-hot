import type * as THREE from 'three';
import { cbox } from '../../render/geo/cbox';
import type { ModelCtx } from '../../render/models/kit';
import { cyl } from '../../render/models/kit';
import { COL } from '../palette';
import { knob, pole, profile, spike, wrap } from '../shapes';
import { WeaponBuilder } from '../wkit';

/** Búa chiến (+14) — war hammer: toothed face toward +Z, a long down-curved beak behind, crown spike, langets, rondel. */
export function build(ctx: ModelCtx): THREE.Group {
  const b = new WeaponBuilder('bua_chien', 14);
  const y = 0.86;
  b.add(pole(-0.14, y + 0.02, 0.018, 0.0165), COL.woodDark, { skin: 'wood', uv: 'long' });
  b.add(profile([[0.1, -0.024], [0.1, 0.024], [0.03, 0.03], [-0.02, 0.02], [-0.09, 0.004], [-0.17, -0.046], [-0.086, -0.016], [-0.02, -0.02], [0.03, -0.03]], 0.044, 0.004),
    COL.steel, { pos: [0, y, 0] });
  // face: 3×3 pyramid teeth on a raised plate
  b.add(cbox(0.05, 0.052, 0.012, 0.003), COL.steel, { pos: [0, y, 0.104] });
  for (let i = 0; i < 9; i++) b.add(spike(0.008, 0.009, 4), COL.steel, { pos: [((i % 3) - 1) * 0.015, y + (Math.floor(i / 3) - 1) * 0.016, 0.11], rot: [Math.PI / 2, Math.PI / 4, 0] });
  b.add(spike(0.09, 0.014, 4), COL.steel, { pos: [0, y + 0.026, 0], rot: [0, Math.PI / 4, 0] });
  for (const s of [1, -1]) {
    b.add(cbox(0.005, 0.2, 0.018, 0.0015), COL.dark, { pos: [s * 0.0175, y - 0.11, 0], heat: 0.35 });
    b.add(knob(0.006), COL.dark, { pos: [s * 0.023, y, 0.02], heat: 0.35 });
  }
  b.add(wrap(-0.135, 0.1, 0.0195, 8, 0.0016), COL.leather, { skin: 'leather', uv: 'round', smooth: true });
  b.add(cyl(0.034, 0.034, 0.007, 10), COL.dark, { pos: [0, 0.112, 0], heat: 0.3 });
  b.add(spike(0.05, 0.016, 4), COL.dark, { pos: [0, -0.14, 0], rot: [Math.PI, 0, 0], heat: 0.3 });
  b.mark('base', [0, y - 0.08, 0]).mark('tip', [0, y + 0.11, 0]);
  return b.done(ctx);
}
