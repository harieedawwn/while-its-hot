import type * as THREE from 'three';
import { cbox } from '../../render/geo/cbox';
import type { ModelCtx } from '../../render/models/kit';
import { COL, DOWN, outward } from '../palette';
import { blade, pole, profile, ring, spike, taper, turn, wrap } from '../shapes';
import { tassel } from '../tassel';
import { WeaponBuilder } from '../wkit';

/** Kích (+10) — ji halberd: spear point plus a crescent blade toward +Z and a back hook, tassel, butt spike. */
function crescent(): [number, number][] {
  const pts: [number, number][] = [];
  // outer (edge) arc bulges to +Z; the inner arc's horns end inside the socket
  for (let i = 0; i <= 8; i++) { const a = -1.0 + (2.0 * i) / 8; pts.push([-0.03 + 0.135 * Math.cos(a), 0.13 * Math.sin(a)]); }
  for (let i = 8; i >= 0; i--) { const a = -0.85 + (1.7 * i) / 8; pts.push([-0.062 + 0.1 * Math.cos(a), 0.095 * Math.sin(a)]); }
  return pts;
}

export function build(ctx: ModelCtx): THREE.Group {
  const b = new WeaponBuilder('kich', 10);
  b.add(pole(-0.7, 1.52, 0.0195, 0.018), COL.woodDark, { skin: 'wood', uv: 'long' });
  for (const [y0, y1] of [[-0.09, 0.12], [0.48, 0.7]]) b.add(wrap(y0, y1, 0.021, 5, 0.0016), COL.leather, { skin: 'leather', uv: 'round', smooth: true });
  b.add(turn([[0.022, 1.5], [0.023, 1.53], [0.019, 1.64], [0.013, 1.68], [0, 1.685]], 7), COL.steel);
  for (const y of [1.51, 1.56]) b.add(ring(0.0235, 0.0035, 8), COL.dark, { pos: [0, y, 0], heat: 0.4 });
  const w = (u: number) => (u < 0.7 ? 0.022 - 0.004 * u : 0.0192 * Math.pow((1 - u) / 0.3, 0.8));
  b.add(blade(taper(1.67, 2.03, 8, w, (u) => 0.0075 - 0.0035 * u, (u) => ({ f: u < 0.5 ? 0.0018 : 0 })), { bevel: 0.4, edgeTint: 1.08 }), COL.steel, { uv: 'long' });
  b.add(profile(crescent(), 0.008, 0.003), COL.steel, { pos: [0, 1.6, 0] });
  b.add(cbox(0.012, 0.03, 0.05, 0.003), COL.dark, { pos: [0, 1.6, 0.025], heat: 0.5 });
  b.add(spike(0.075, 0.011, 4), COL.steel, { pos: [0, 1.61, -0.018], rot: outward(Math.PI / 2, 0.25) });
  tassel(b, 1.5, 0.12, 6, 0.028);
  b.add(spike(0.09, 0.015, 4), COL.iron, { pos: [0, -0.7, 0], rot: DOWN, skin: 'forged', heat: 0.3 });
  b.mark('base', [0, 1.5, 0]).mark('tip', [0, 2.03, 0]).mark('grip_l', [0, 0.6, 0]);
  return b.done(ctx);
}
