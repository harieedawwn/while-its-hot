import type * as THREE from 'three';
import type { ModelCtx } from '../../render/models/kit';
import { COL } from '../palette';
import { blade, crooked, taper, turn, wrap } from '../shapes';
import { WeaponBuilder } from '../wkit';

/** Giáo sắt (+3) — iron spear: a crude leaf head with a hammered socket, rope-bound onto a crooked pole. */
export function build(ctx: ModelCtx): THREE.Group {
  const b = new WeaponBuilder('giao_sat', 7);
  b.add(crooked(-0.6, 1.4, 0.02, 0.03, 9), COL.wood, { skin: 'wood', uv: 'long' });
  b.add(turn([[0.024, 1.33], [0.025, 1.36], [0.017, 1.43], [0.012, 1.46], [0, 1.465]], 6), COL.raw, { skin: 'forged', dent: 0.0018, pits: 0.3 });
  const w = (u: number) => 0.036 * Math.pow(Math.max(0, Math.sin(Math.PI * (0.14 + 0.86 * u))), 0.75);
  b.add(blade(taper(1.45, 1.72, 7, w, (u) => 0.0068 - 0.0035 * u, (u) => ({ z: Math.sin(u * 6) * 0.003 })), { bevel: 0.32 }),
    COL.raw, { skin: 'forged', dent: 0.0016, pits: 0.28 });
  b.add(wrap(1.27, 1.345, 0.024, 4, 0.004), COL.cord, { skin: 'leather', uv: 'round', smooth: true });
  b.mark('base', [0, 1.46, 0]).mark('tip', [0, 1.72, 0]).mark('grip_l', [0, 0.55, 0]);
  return b.done(ctx);
}
