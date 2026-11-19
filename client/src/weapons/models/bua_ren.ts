import type * as THREE from 'three';
import { cbox } from '../../render/geo/cbox';
import type { ModelCtx } from '../../render/models/kit';
import { COL } from '../palette';
import { crooked, profile, wrap } from '../shapes';
import { WeaponBuilder } from '../wkit';

/** Búa rèn (+3) — the smith's own cross-peen hammer on a crooked haft, a rag at the grip. Dented, scaled. */
export function build(ctx: ModelCtx): THREE.Group {
  const b = new WeaponBuilder('bua_ren', 4);
  b.add(crooked(-0.08, 0.52, 0.016, 0.012, 5), COL.wood, { skin: 'wood', uv: 'long' });
  // side profile: square face toward +Z, peen wedge toward −Z
  b.add(profile([[0.075, -0.024], [0.078, 0.024], [-0.025, 0.026], [-0.09, 0.008], [-0.092, -0.006], [-0.025, -0.024]], 0.044, 0.004),
    COL.raw, { pos: [0, 0.5, 0], skin: 'forged', dent: 0.0022, pits: 0.3 });
  b.add(cbox(0.04, 0.004, 0.012, 0.0015), COL.ink, { pos: [0, 0.529, 0], skin: 'wood', heat: 0 }); // wedge in the eye
  b.add(wrap(-0.05, 0.04, 0.018, 3, 0.004), COL.rag, { skin: 'leather', uv: 'round', smooth: true });
  b.mark('base', [0, 0.42, 0]).mark('tip', [0, 0.54, 0]);
  return b.done(ctx);
}
