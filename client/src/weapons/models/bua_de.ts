import type * as THREE from 'three';
import { cbox } from '../../render/geo/cbox';
import type { ModelCtx } from '../../render/models/kit';
import { COL } from '../palette';
import { knob, pole, profile, ring, spike, wrap } from '../shapes';
import { WeaponBuilder } from '../wkit';

/**
 * Búa đe (+18) — masterwork: the head IS an anvil (polished face, horn toward −Z, flat heel striking +Z),
 * brass bands and rivets, steel-strapped haft, dark wrap between brass rings, brass pommel with a spike.
 */
const ANVIL: [number, number][] = [
  [0.105, 0], [0.105, 0.028], [0.058, 0.048], [0.054, 0.098], [0.13, 0.11], [0.13, 0.162], [-0.1, 0.162],
  [-0.124, 0.152], [-0.205, 0.134], [-0.124, 0.118], [-0.064, 0.098], [-0.058, 0.048], [-0.105, 0.028], [-0.105, 0],
];

export function build(ctx: ModelCtx): THREE.Group {
  const b = new WeaponBuilder('bua_de', 18);
  const y = 0.86;
  b.add(pole(-0.16, y + 0.05, 0.02, 0.018, 8), COL.woodDark, { skin: 'wood', uv: 'long' });
  b.add(profile(ANVIL, 0.078, 0.005), COL.steel, { pos: [0, y, 0] });
  b.add(cbox(0.088, 0.01, 0.232, 0.003), '#ffffff', { pos: [0, y + 0.166, 0.014] });
  b.add(cbox(0.02, 0.003, 0.02, 0.001), COL.ink, { pos: [0, y + 0.172, 0.09], heat: 0 });
  b.add(cbox(0.086, 0.01, 0.124, 0.002), COL.brass, { pos: [0, y + 0.072, 0], heat: 0.3 });
  b.add(cbox(0.086, 0.008, 0.214, 0.002), COL.brass, { pos: [0, y + 0.02, 0], heat: 0.3 });
  for (const s of [1, -1]) for (const z of [0.09, -0.09]) b.add(knob(0.007), COL.brass, { pos: [s * 0.044, y + 0.136, z], heat: 0.3 });
  for (const s of [1, -1]) b.add(cbox(0.005, 0.22, 0.02, 0.0015), COL.dark, { pos: [s * 0.0205, y - 0.1, 0], heat: 0.35 });
  b.add(wrap(-0.15, 0.13, 0.021, 9, 0.0018), COL.leatherDark, { skin: 'leather', uv: 'round', smooth: true });
  for (const ry of [0.13, -0.01, -0.15]) b.add(ring(0.022, 0.0035, 8), COL.brass, { pos: [0, ry, 0], heat: 0.25 });
  b.add(knob(0.028), COL.brass, { pos: [0, -0.18, 0], scale: [1, 0.75, 1], heat: 0.3 });
  b.add(spike(0.05, 0.012, 4), COL.brass, { pos: [0, -0.195, 0], rot: [Math.PI, 0, 0], heat: 0.3 });
  b.mark('base', [0, y - 0.04, 0]).mark('tip', [0, y + 0.18, 0]);
  return b.done(ctx);
}
