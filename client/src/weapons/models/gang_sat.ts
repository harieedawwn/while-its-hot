import type * as THREE from 'three';
import { cbox } from '../../render/geo/cbox';
import { cyl, type ModelCtx } from '../../render/models/kit';
import { COL } from '../palette';
import { knob, ring } from '../shapes';
import { WeaponBuilder } from '../wkit';

const HALF_PI = Math.PI / 2;

/**
 * Găng sắt (+3) — the first gauntlet, RIGHT hand (the left is `mirrorLeft`). Gauntlet contract: the fist sits at
 * the grip origin, +Y = thumb side, +Z = knuckles (the striking face, like a blade's edge), −Z = the cuff up the
 * forearm, +X = back of the hand. Plain plate: two overlapping rows of finger lames, a back plate, a riveted cuff.
 */
export function build(ctx: ModelCtx): THREE.Group {
  const b = new WeaponBuilder('gang_sat', 11);
  const plate = { skin: 'forged' as const, dent: 0.0012, pits: 0.2 };
  // curled fingers under the lames
  b.add(cbox(0.07, 0.092, 0.08, 0.012), COL.leatherDark, { pos: [-0.004, -0.004, 0.006], skin: 'forged', heat: 0.6 });
  // knuckle row and middle row, one lame per finger, overlapping like shingles
  for (let i = 0; i < 4; i++) {
    const y = 0.033 - i * 0.0225;
    b.add(cbox(0.058, 0.021, 0.026, 0.004), COL.iron, { ...plate, pos: [0.01, y, 0.043], rot: [0, 0, 0.05 * (i - 1.5)] });
    b.add(cbox(0.044, 0.019, 0.022, 0.004), COL.dark, { ...plate, pos: [-0.018, y, 0.052], rot: [0, -0.35, 0] });
  }
  // back of the hand, a little domed by two stacked plates
  b.add(cbox(0.012, 0.088, 0.07, 0.004), COL.iron, { ...plate, pos: [0.04, 0, -0.006] });
  b.add(cbox(0.008, 0.07, 0.05, 0.003), COL.iron, { ...plate, pos: [0.047, 0.002, -0.012] });
  // thumb: one lame over a stub
  b.add(cbox(0.03, 0.03, 0.048, 0.008), COL.dark, { pos: [-0.012, 0.056, 0.004], rot: [0.3, 0, 0], skin: 'forged', heat: 0.6 });
  b.add(cbox(0.032, 0.012, 0.04, 0.003), COL.iron, { ...plate, pos: [-0.006, 0.072, 0.008], rot: [0.3, 0, 0] });
  // wrist strap and the flared cuff up the forearm
  b.add(cyl(0.045, 0.045, 0.02, 8), COL.leatherDark, { pos: [0, 0, -0.05], rot: [HALF_PI, 0, 0], skin: 'leather', heat: 0 });
  b.add(cyl(0.047, 0.056, 0.13, 8), COL.iron, { ...plate, pos: [0, 0, -0.125], rot: [HALF_PI, 0, 0] });
  b.add(ring(0.057, 0.0045, 8), COL.iron, { pos: [0, 0, -0.19], rot: [HALF_PI, 0, 0], skin: 'forged', heat: 0.5 });
  for (const a of [0.6, 2.2, 3.8, 5.4]) b.add(knob(0.0045), COL.iron, { pos: [Math.cos(a) * 0.05, Math.sin(a) * 0.05, -0.09], skin: 'forged', heat: 0.5 });
  // trail markers run along the knuckle row
  b.mark('base', [0, 0.012, 0.05]).mark('tip', [0, 0.05, 0.056]);
  return b.done(ctx);
}
