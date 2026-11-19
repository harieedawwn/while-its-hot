import { FOUNDRY, bridgeRects, type Rect } from '@wih/shared';
import { box, tiled, type Ctx } from './ctx';

/**
 * Ground level: four corner floor blocks, the molten channel walls + beds, the stepped dais with the
 * pedestal, and 8 bridges. Floors are thin top slabs over brick channel walls (so the cut face reads as
 * a lined channel). Everything solid down to the bed so nothing shows a void.
 */
export function buildFloor(c: Ctx): void {
  const { lib, pal } = c;
  const rust = lib.get('rust'), brick = lib.get('brick'), concrete = lib.get('concrete'), paint = lib.get('paint');
  const steel = lib.get('steel');
  const { halfW, from, bedY } = FOUNDRY.channel;
  const w = FOUNDRY.half;

  // corner floor blocks: ember rust top, brick body down to the channel bed
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x0 = sx > 0 ? halfW : -w, x1 = sx > 0 ? w : -halfW, z0 = sz > 0 ? halfW : -w, z1 = sz > 0 ? w : -halfW;
    tiled(c, rust, [x0, -0.2, z0], [x1, 0, z1], pal.floor, 10, 2);
    tiled(c, brick, [x0, bedY, z0], [x1, -0.2, z1], pal.channelWall, 10, 2);
  }
  // channel beds (lit dark slag under the molten sheet) and the lip of cold concrete around the channels
  for (const r of armRects()) {
    box(c, lib.get('slag'), [r.x0, bedY - 0.2, r.z0], [r.x1, bedY, r.z1], '#6a5a52', 4);
  }
  // hazard stripes: ochre paint along both channel edges
  for (const sz of [-1, 1]) {
    for (const sx of [-1, 1]) {
      box(c, paint, [sx * from, 0, sz * (halfW + 0.45)], [sx * (w - 0.5), 0.012, sz * (halfW + 0.15)], pal.ochre, 8);
      box(c, paint, [sz * (halfW + 0.45), 0, sx * from], [sz * (halfW + 0.15), 0.012, sx * (w - 0.5)], pal.ochre, 8);
    }
  }

  // dais: three tiers, solid down to the bed on the arm sides
  const { halves, heights } = FOUNDRY.dais;
  halves.forEach((h, i) => {
    tiled(c, concrete, [-h, i === 0 ? bedY : heights[i - 1], -h], [h, heights[i], h], i === 2 ? '#b8a898' : pal.concrete, 7, 2);
  });
  // ochre rim on the top tier
  const top = heights[heights.length - 1], rim = halves[halves.length - 1] - 0.25;
  box(c, paint, [-rim - 0.15, top, -rim - 0.15], [rim + 0.15, top + 0.012, -rim], pal.ochre, 6);
  box(c, paint, [-rim - 0.15, top, rim], [rim + 0.15, top + 0.012, rim + 0.15], pal.ochre, 6);
  box(c, paint, [-rim - 0.15, top, -rim], [-rim, top + 0.012, rim], pal.ochre, 6);
  box(c, paint, [rim, top, -rim], [rim + 0.15, top + 0.012, rim], pal.ochre, 6);

  // pedestal: stepped steel block under a wide plate
  const { base, top: pt } = FOUNDRY.pedestal;
  const px = FOUNDRY.pedestal.pos[0], pz = FOUNDRY.pedestal.pos[1];
  box(c, concrete, [px - 1.6, top, pz - 1.6], [px + 1.6, top + base * 0.55, pz + 1.6], '#a89888', 2);
  box(c, steel, [px - 1.3, top + base * 0.55, pz - 1.3], [px + 1.3, top + base, pz + 1.3], pal.steelColdDark, 2);
  box(c, steel, [px - 1.55, top + base, pz - 1.55], [px + 1.55, top + pt, pz + 1.55], pal.steelCold, 1);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(c, rust, [px + sx * 1.55 - 0.12, top, pz + sz * 1.55 - 0.12], [px + sx * 1.55 + 0.12, top + 0.55, pz + sz * 1.55 + 0.12], pal.rust, 1);

  // bridges: grate deck flush with the floor, steel stringers underneath, short ochre-capped rails
  for (const r of bridgeRects()) bridge(c, r);
}

/** The four channel footprints as plain rects (arms start at the dais). */
export function armRects(): Rect[] {
  const { halfW, from } = FOUNDRY.channel, e = FOUNDRY.half + FOUNDRY.wallT - 1;
  return [
    { x0: from, x1: e, z0: -halfW, z1: halfW }, { x0: -e, x1: -from, z0: -halfW, z1: halfW },
    { x0: -halfW, x1: halfW, z0: -e, z1: -from }, { x0: -halfW, x1: halfW, z0: from, z1: e },
  ];
}

function bridge(c: Ctx, r: Rect): void {
  const { lib, pal } = c;
  const steel = lib.get('steel'), grate = lib.get('grate'), rust = lib.get('rust');
  const alongX = r.x1 - r.x0 < r.z1 - r.z0; // deck spans z (arm along x) when narrower in x
  box(c, grate, [r.x0, -0.14, r.z0], [r.x1, 0.0, r.z1], '#ffffff', 1);
  // stringers under the deck
  if (alongX) for (const x of [r.x0 + 0.2, r.x1 - 0.2]) box(c, steel, [x - 0.1, -0.7, r.z0], [x + 0.1, -0.14, r.z1], pal.steelColdDark, 2);
  else for (const z of [r.z0 + 0.2, r.z1 - 0.2]) box(c, steel, [r.x0, -0.7, z - 0.1], [r.x1, -0.14, z + 0.1], pal.steelColdDark, 2);
  // rails along the two long edges of the deck's crossing direction (the sides that face the molten sheet)
  const posts: [number, number][] = [];
  if (alongX) for (const x of [r.x0 + 0.06, r.x1 - 0.06]) { for (let z = r.z0 + 0.3; z <= r.z1 - 0.3 + 1e-6; z += (r.z1 - r.z0 - 0.6) / 4) posts.push([x, z]); box(c, steel, [x - 0.04, 0.62, r.z0], [x + 0.04, 0.7, r.z1], pal.steelCold, 2); }
  else for (const z of [r.z0 + 0.06, r.z1 - 0.06]) { for (let x = r.x0 + 0.3; x <= r.x1 - 0.3 + 1e-6; x += (r.x1 - r.x0 - 0.6) / 4) posts.push([x, z]); box(c, steel, [r.x0, 0.62, z - 0.04], [r.x1, 0.7, z + 0.04], pal.steelCold, 2); }
  for (const [x, z] of posts) box(c, rust, [x - 0.04, 0, z - 0.04], [x + 0.04, 0.62, z + 0.04], pal.rust, 2);
}
