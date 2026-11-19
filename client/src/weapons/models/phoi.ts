import type * as THREE from 'three';
import { cbox } from '../../render/geo/cbox';
import type { ModelCtx } from '../../render/models/kit';
import { COL } from '../palette';
import { blade, knob, taper, wrap } from '../shapes';
import { WeaponBuilder } from '../wkit';

/** Phôi thép — the blank: a hammered bar of raw stock on a rag-wrapped tang. Square-ended, no edge yet. */
export function build(ctx: ModelCtx): THREE.Group {
  const b = new WeaponBuilder('phoi', 2);
  // the bar: thick, flat-ended, a little wider toward the end, hammer-dented and scale-pitted
  b.add(blade(taper(0.06, 0.5, 6, (u) => 0.019 + 0.004 * u, (u) => 0.008 - 0.001 * u, (u) => ({ z: Math.sin(u * 5) * 0.002 })), { bevel: 0.75 }),
    COL.raw, { skin: 'forged', dent: 0.0018, pits: 0.3 });
  // shoulder where the tang was drawn out
  b.add(cbox(0.018, 0.03, 0.044, 0.004), COL.raw, { pos: [0, 0.05, 0], skin: 'forged', dent: 0.0015, pits: 0.25, heat: 0.7 });
  b.add(cbox(0.009, 0.16, 0.016, 0.003), COL.iron, { pos: [0, -0.02, 0], skin: 'forged', heat: 0.5 });
  // rag wrap, knotted, with a loose end
  b.add(wrap(-0.075, 0.035, 0.015, 5, 0.004), COL.rag, { skin: 'leather', uv: 'round', smooth: true });
  b.add(knob(0.014), COL.rag, { pos: [0.004, 0.03, -0.012], scale: [1, 0.8, 1.1], skin: 'leather' });
  b.add(cbox(0.004, 0.06, 0.016, 0.002), COL.rag, { pos: [0.008, -0.005, -0.022], rot: [0.35, 0, 0.1], skin: 'leather' });
  // the tang's bent end, peened over
  b.add(knob(0.011), COL.iron, { pos: [0, -0.1, 0], scale: [0.9, 0.7, 1.2], skin: 'forged', heat: 0.4 });
  b.mark('base', [0, 0.08, 0]).mark('tip', [0, 0.5, 0]);
  return b.done(ctx);
}
