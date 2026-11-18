import * as THREE from 'three';
import { FOUNDRY, wallPoint } from '@wih/shared';
import { HEAT_HEX } from '../../render/heat';
import { box, type Ctx } from './ctx';
import { wbox } from './shell';

/**
 * The furnace mouth (north landmark, LOOK §1.6: the only near-white in the scene). A recess in the wall whose
 * back is nested rectangles stepping down the heat ramp, framed by a rust steel portal with a hood.
 */
export function buildFurnace(c: Ctx): void {
  const { lib, pal } = c, rust = lib.get('rust'), brick = lib.get('brick'), glow = lib.get('glow'), paint = lib.get('paint');
  const f = FOUNDRY.furnace, u0 = f.u - f.w / 2, u1 = f.u + f.w / 2, ch = FOUNDRY.channel;

  // recess floor either side of the channel (the channel bed itself is laid by the floor builder)
  for (const [a, b] of [[u0, -ch.halfW], [ch.halfW, u1]]) {
    wbox(c, rust, 'N', a, b, 0, f.depth, -0.2, 0, pal.floorDark);
    wbox(c, brick, 'N', a, b, 0, f.depth, ch.bedY, -0.2, pal.channelWall);
  }
  // glowing back: nested rectangles, outer = dull red, center = white-hot (heat ramp steps 3..8)
  const bz = wallPoint('N', 0, f.depth)[1] + 0.03;
  const sizes: [number, number][] = [[13.6, 9.3], [11.4, 7.9], [9.2, 6.4], [7, 4.9], [4.8, 3.4], [2.6, 1.8]];
  sizes.forEach(([w, h], i) => {
    c.b.add(new THREE.PlaneGeometry(w, h), glow, { pos: [f.u, 4.7, bz + i * 0.01], color: HEAT_HEX[3 + i] });
  });
  // heavy portal: two pillars, lintel with an ochre stripe, a stepped hood up into the roof trusses
  for (const s of [-1, 1]) {
    const a = s < 0 ? u0 - 1.9 : u1, b = s < 0 ? u0 : u1 + 1.9;
    wbox(c, rust, 'N', a, b, -0.9, 1.4, 0, 12.4, pal.rust);
    wbox(c, rust, 'N', a - 0.3, b + 0.3, -1.2, 1.6, 0, 0.9, pal.rustDark);
    for (const y of [3, 6.5, 10]) wbox(c, rust, 'N', a - 0.12, b + 0.12, -1.05, -0.9, y, y + 0.45, pal.rustDark, 1);
  }
  wbox(c, rust, 'N', u0 - 1.9, u1 + 1.9, -0.9, 1.4, f.h, f.h + 1.3, pal.rust);
  wbox(c, paint, 'N', u0 - 1.9, u1 + 1.9, -0.92, -0.9, f.h + 0.35, f.h + 0.75, pal.ochre);
  const tiers: [number, number, number, number][] = [[10.8, 1.8, 10.8, 12.2], [9.6, 2.4, 12.2, 13.6], [8.2, 3, 13.6, 15], [6.8, 3.4, 15, 16]];
  for (const [hw, d, y0, y1] of tiers) wbox(c, rust, 'N', -hw, hw, -0.4, d, y0, y1, pal.rustDark);
  box(c, rust, [-3.4, 16, -34.4], [3.4, FOUNDRY.roofY, -30.6], pal.iron, 2); // chimney neck into the roof
}
