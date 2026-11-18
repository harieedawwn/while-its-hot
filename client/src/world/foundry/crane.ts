import * as THREE from 'three';
import { FOUNDRY } from '@wih/shared';
import { chain } from '../../render/models/props';
import { box, type Ctx } from './ctx';
import { deck, rail, stairs } from './catwalks';

/**
 * Upper layer (risky, open): runway walkways along the E and W walls at y 11, the crane bridge across the
 * south, two flights up from the ring catwalks, and the crane itself (cab, trolley, hoist chain).
 */
export function buildCrane(c: Ctx): void {
  const { lib, pal } = c, rust = lib.get('rust'), glow = lib.get('glow'), paint = lib.get('paint');
  const Y = FOUNDRY.midY, U = FOUNDRY.upperY, w = FOUNDRY.half, cz = FOUNDRY.crane.z;
  const x0 = w - 1.6; // runway inner edge

  // runways: E x 28.4..30 (z -24..27), W mirrored through the center
  deck(c, x0, -24, w, 27, U, false);
  deck(c, -w, -27, -x0, 24, U, false);
  rail(c, x0, -24, x0, 27, U, [[38, 41]]);
  rail(c, -x0, -27, -x0, 24, U, [[10, 13]]);
  // flights from the ring catwalk up to the runways, landing beside the runway
  stairs(c, w - 3.6, 6, w - 1.8, 14.4, '+z', Y, U, 0.25);
  deck(c, w - 3.6, 14.4, w - 1.6, 16.4, U, false);
  stairs(c, -w + 1.8, -14.4, -w + 3.6, -6, '-z', Y, U, 0.25);
  deck(c, -w + 1.6, -16.4, -w + 3.6, -14.4, U, false);

  // crane bridge: two box girders with a walkway between them, spanning wall to wall at z = 20
  box(c, rust, [-x0, U - 1.7, cz - 1.2], [x0, U - 0.1, cz - 0.55], pal.rust, 4);
  box(c, rust, [-x0, U - 1.7, cz + 0.55], [x0, U - 0.1, cz + 1.2], pal.rust, 4);
  deck(c, -x0, cz - 0.55, x0, cz + 0.55, U, false);
  for (let x = -x0 + 2; x < x0; x += 4) box(c, rust, [x - 0.08, U - 1.6, cz - 1.2], [x + 0.08, U - 0.2, cz + 1.2], pal.rustDark, 2);
  // end trucks riding the runways, ochre warning stripes on the bridge girders
  for (const s of [-1, 1]) box(c, rust, [s * x0 - 0.9, U - 2.0, cz - 1.6], [s * x0 + 0.9, U - 0.1, cz + 1.6], pal.rustDark, 2);
  box(c, paint, [-x0, U - 1.3, cz - 1.21], [x0, U - 0.9, cz - 1.2], pal.ochre, 8);
  box(c, paint, [-x0, U - 1.3, cz + 1.2], [x0, U - 0.9, cz + 1.21], pal.ochre, 8);

  // cab hanging off the bridge, window glowing cold
  box(c, rust, [-22, U - 3.4, cz + 1.4], [-18, U - 0.5, cz + 4.4], pal.rust, 2);
  box(c, rust, [-22.2, U - 0.5, cz + 1.3], [-17.8, U - 0.3, cz + 4.5], pal.rustDark, 2);
  c.b.add(new THREE.PlaneGeometry(2.6, 1.0), glow, { pos: [-20, U - 1.7, cz + 4.41], color: '#7f93a6' });

  // trolley and hoist: drum block, a long chain, a hook block (the chain is a prop scaled up)
  const tx = FOUNDRY.crane.x;
  box(c, rust, [tx - 1.4, U + 0.05, cz - 1.5], [tx + 1.4, U + 1.3, cz + 1.5], pal.rust, 2);
  box(c, rust, [tx - 1.0, U + 1.3, cz - 0.9], [tx + 1.0, U + 1.9, cz + 0.9], pal.rustDark, 2);
  const ch = chain(c, 22);
  ch.scale.setScalar(5);
  ch.position.set(tx, U - 0.1, cz);
  c.b.addObject(ch);
  box(c, rust, [tx - 0.3, 2.5, cz - 0.3], [tx + 0.3, 3.1, cz + 0.3], pal.rustDark, 1);
}
