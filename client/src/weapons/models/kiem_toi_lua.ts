import type * as THREE from 'three';
import { cbox } from '../../render/geo/cbox';
import type { ModelCtx } from '../../render/models/kit';
import { COL } from '../palette';
import { blade, knob, profile, ring, spike, taper, turn, wrap } from '../shapes';
import { WeaponBuilder } from '../wkit';

/**
 * Kiếm tôi lửa (+18) — masterwork: a flame-waved blade with a bright tempered edge and dark fuller, brass flame
 * inlays at the root, brass guard with curled ends and red stones, dark wrap with brass rings, faceted pommel.
 */
const FLAME: [number, number][] = [[0, 0], [0.011, 0.026], [0.004, 0.044], [0.008, 0.07], [0, 0.092], [-0.008, 0.07], [-0.004, 0.044], [-0.011, 0.026]];

export function build(ctx: ModelCtx): THREE.Group {
  const b = new WeaponBuilder('kiem_toi_lua', 18);
  const wave = (u: number) => (u < 0.86 ? Math.sin(u * Math.PI * 7) : 0);
  const w = (u: number) => (u < 0.86 ? (0.03 - 0.008 * u) * (1 + 0.1 * wave(u)) : 0.0231 * Math.pow((1 - u) / 0.14, 0.8));
  b.add(blade(taper(0.09, 1.1, 18, w, (u) => 0.0072 - 0.0036 * u, (u) => ({ z: 0.0035 * wave(u), f: u < 0.62 ? 0.0026 : 0 })),
    { bevel: 0.46, fullerW: 0.17, edgeTint: 1.2, fullerTint: 0.5 }), COL.steel, { skin: 'bright', uv: 'long' });
  for (const s of [1, -1]) {
    b.add(profile(FLAME, 0.001, 0), COL.brass, { pos: [s * 0.0068, 0.1, 0], heat: 0.25 });
    b.add(knob(0.008), COL.gem, { pos: [s * 0.012, 0.072, 0], scale: [0.6, 1, 1], heat: 0 });
  }
  b.add(profile([[-0.15, 0.046], [-0.136, 0.02], [-0.05, 0], [0.05, 0], [0.136, 0.02], [0.15, 0.046], [0.14, 0.052], [0.12, 0.03], [0.05, 0.016],
    [0.026, 0.032], [0, 0.05], [-0.026, 0.032], [-0.05, 0.016], [-0.12, 0.03], [-0.14, 0.052]], 0.022, 0.003), COL.brass, { pos: [0, 0.05, 0], heat: 0.3 });
  b.add(wrap(-0.165, 0.05, 0.0165, 10, 0.0018), COL.leatherDark, { skin: 'leather', uv: 'round', smooth: true });
  b.add(ring(0.0175, 0.0032, 8), COL.brass, { pos: [0, 0.048, 0], heat: 0.25 });
  b.add(ring(0.0175, 0.0032, 8), COL.brass, { pos: [0, -0.06, 0], heat: 0.25 });
  b.add(turn([[0, -0.21], [0.018, -0.205], [0.026, -0.19], [0.022, -0.174], [0.014, -0.166], [0.018, -0.166], [0, -0.165]], 6), COL.brass, { heat: 0.3 });
  b.add(spike(0.022, 0.008, 4), COL.brass, { pos: [0, -0.21, 0], rot: [Math.PI, 0, 0], heat: 0.3 });
  b.add(cbox(0.008, 0.006, 0.012, 0.002), COL.gem, { pos: [0, -0.19, 0.024], heat: 0 });
  b.mark('base', [0, 0.12, 0]).mark('tip', [0, 1.1, 0]).mark('grip_l', [0, -0.11, 0]);
  return b.done(ctx);
}
