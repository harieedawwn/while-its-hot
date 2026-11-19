import * as THREE from 'three';
import * as P from '../render/geo/procgeo';
import type { StaticBatch } from '../render/geo/static-batch';
import type { MaterialLib } from '../render/materials/library';
import { flat, slab, type ModelCtx } from '../render/models/kit';
import { crate } from '../render/models/props';

type V3 = [number, number, number];

/**
 * Movement test course (phase 02), an industrial yard. Spawn faces −Z:
 * center = stairs (0.3 m risers) to platform A, 7.5 m gap over a slag bed (needs a slide-jump), platform B;
 * right = ramps 20°/35°/45°/55° to a 2.4 m deck; far right = slam pad + 3 m ledge (bounce only);
 * left = wall-jump shaft (2.6 m wide) to a 5 m ledge; front left = 1.2 m slide tunnel.
 */
export const COURSE = {
  spawn: [0, 0, 14] as V3,
  stepH: 0.3, platH: 1.5, gap: [-11.5, -4] as [number, number],
  rampTop: 2.4, rampDeg: [20, 35, 45, 55],
  shaft: { x0: -11.3, x1: -8.7, z0: -10, z1: -4, wallH: 7.5, ledgeH: 5 },
  slam: { ledgeH: 3 },
  tunnel: { x0: -12, x1: -10, z0: 1, z1: 7, h: 1.2 },
  lights: [[0, 5.5, -2], [10, 4.5, -3], [-10, 6, -7], [17, 4.5, -11]] as V3[],
} as const;

/** Axis-aligned box from min to max corner. */
function box(b: StaticBatch, mat: THREE.Material, min: V3, max: V3, color = '#ffffff', step = 1): void {
  const s: V3 = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  b.add(slab(s[0], s[1], s[2], step), mat, { pos: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2], color });
}

/** Solid ramp: x0..x1 wide, rises from y=0 at zBase to y=h at zTop (zTop < zBase). Flat normals. */
function wedge(x0: number, x1: number, zBase: number, zTop: number, h: number): THREE.BufferGeometry {
  const v = [
    [x0, 0, zBase], [x1, 0, zBase], [x1, 0, zTop], [x0, 0, zTop], [x0, h, zTop], [x1, h, zTop],
  ];
  const tris = [[0, 1, 5], [0, 5, 4], [3, 4, 5], [3, 5, 2], [0, 4, 3], [1, 2, 5], [0, 3, 2], [0, 2, 1]];
  const c = new THREE.Vector3((x0 + x1) / 2, h / 3, (zBase * 2 + zTop) / 3);
  const a = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), m = new THREE.Vector3();
  const pos: number[] = [];
  for (const t of tris) {
    // wind every face outward (normal points away from the solid's center)
    const [p0, p1, p2] = t.map((i) => new THREE.Vector3(...v[i]));
    e1.subVectors(p1, p0); e2.subVectors(p2, p0); a.crossVectors(e1, e2);
    m.addVectors(p0, p1).add(p2).divideScalar(3).sub(c);
    for (const q of a.dot(m) < 0 ? [p0, p2, p1] : [p0, p1, p2]) pos.push(q.x, q.y, q.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

export function buildCourse(b: StaticBatch, lib: MaterialLib, ctx: ModelCtx): void {
  const concrete = lib.get('concrete'), brick = lib.get('brick'), rust = lib.get('rust'), steel = lib.get('steel');
  const slag = lib.get('slag'), grate = lib.get('grate'), paint = lib.get('paint'), wood = lib.get('wood');
  const C = COURSE;
  const OCHRE = '#8a6a2a';

  // yard floor and walls
  box(b, concrete, [-24, -0.2, -30], [24, 0, 18], '#b09482', 2);
  box(b, brick, [-24.4, 0, -30], [-24, 7, 18], '#8a7a72', 2);
  box(b, brick, [24, 0, -30], [24.4, 7, 18], '#8a7a72', 2);
  box(b, brick, [-24.4, 0, -30.4], [24.4, 7, -30], '#8a7a72', 2);
  box(b, brick, [-24.4, 0, 18], [24.4, 7, 18.4], '#8a7a72', 2);

  // center: stairs, platform A, the gap, platform B
  for (let i = 1; i <= 4; i++) box(b, concrete, [-2, 0, 4 - 0.5 * i], [2, C.stepH * i, 4.5 - 0.5 * i], '#c8b8aa');
  box(b, concrete, [-2, 0, C.gap[1]], [2, C.platH, 2], '#c0ae9e');
  box(b, concrete, [-2, 0, -21], [2, C.platH, C.gap[0]], '#c0ae9e');
  for (const z of [C.gap[1], C.gap[0]]) box(b, paint, [-2, C.platH, z - 0.15], [2, C.platH + 0.01, z + 0.15], OCHRE);
  box(b, slag, [-2.5, 0, C.gap[0]], [2.5, 0.06, C.gap[1]], '#a09088');
  for (const x of [-2.6, 2.6]) box(b, rust, [x - 0.1, 0, C.gap[0]], [x + 0.1, 0.25, C.gap[1]], '#9a8a80');

  // right: ramps to a deck
  const top = C.rampTop, zTop = -6;
  C.rampDeg.forEach((deg, i) => {
    const x0 = 5 + i * 2, len = top / Math.tan((deg * Math.PI) / 180);
    b.add(wedge(x0, x0 + 1.8, zTop + len, zTop, top), i % 2 ? steel : concrete, { color: i % 2 ? '#b8b4b0' : '#c4b2a2' });
    box(b, paint, [x0, 0, zTop + len + 0.02], [x0 + 1.8, 0.01, zTop + len + 0.3], OCHRE);
  });
  box(b, concrete, [5, 0, -10], [12.8, top, zTop], '#b8a696');
  box(b, rust, [5, top, -10], [12.8, top + 0.9, -9.8], '#9a8a80');

  // far right: slam pad and the high ledge only a slam bounce reaches
  box(b, grate, [14, 0, -14], [18, 0.04, -10]);
  for (const [a, c] of [[[13.9, 0, -14.1], [18.1, 0.05, -13.9]], [[13.9, 0, -10.1], [18.1, 0.05, -9.9]]] as [V3, V3][]) box(b, rust, a, c, '#a09088');
  box(b, brick, [18.6, 0, -15], [22, C.slam.ledgeH, -9], '#9a8a80');
  box(b, paint, [18.6, C.slam.ledgeH, -15], [18.9, C.slam.ledgeH + 0.01, -9], OCHRE);

  // left: wall-jump shaft and its ledge
  const S = C.shaft;
  box(b, brick, [S.x0 - 0.4, 0, S.z0], [S.x0, S.wallH, S.z1]);
  box(b, brick, [S.x1, 0, S.z0], [S.x1 + 0.4, S.wallH, S.z1]);
  box(b, concrete, [S.x0 - 0.4, 0, S.z0 - 4], [S.x1 + 0.4, S.ledgeH, S.z0], '#a89888');
  box(b, paint, [S.x0, S.ledgeH, S.z0 - 0.3], [S.x1, S.ledgeH + 0.01, S.z0], OCHRE);
  box(b, steel, [S.x0 - 0.5, S.wallH, S.z0], [S.x1 + 0.5, S.wallH + 0.25, S.z0 + 0.3], '#a8a4a0');

  // front left: slide tunnel (walls, roof slab)
  const T = C.tunnel;
  box(b, concrete, [T.x0 - 0.4, 0, T.z0], [T.x0, T.h, T.z1], '#a89888');
  box(b, concrete, [T.x1, 0, T.z0], [T.x1 + 0.4, T.h, T.z1], '#a89888');
  box(b, concrete, [T.x0 - 0.4, T.h, T.z0], [T.x1 + 0.4, T.h + 0.45, T.z1], '#988878');
  box(b, paint, [T.x0, 0, T.z1 + 0.05], [T.x1, 0.01, T.z1 + 0.35], OCHRE);

  // columns along the side walls, a few crates and a slag drift so it reads as a place
  for (const z of [-24, -12, 0, 12]) for (const x of [-23.6, 23.6]) box(b, rust, [x - 0.2, 0, z - 0.2], [x + 0.2, 7, z + 0.2], '#a89890');
  // open roof: trusses span the yard on the columns, purlins along it (gives the sky some structure)
  for (const z of [-24, -12, 0, 12]) {
    box(b, rust, [-24, 7, z - 0.2], [24, 7.45, z + 0.2], '#8a7a70');
    for (let x = -20; x <= 20; x += 4) box(b, rust, [x - 0.06, 7.45, z - 0.06], [x + 0.06, 8.3 - Math.abs(x) * 0.03, z + 0.06], '#7a6a60');
  }
  for (const x of [-16, -8, 0, 8, 16]) box(b, rust, [x - 0.12, 7.45, -28], [x + 0.12, 7.7, 16], '#7a6a60');
  const place = (o: THREE.Object3D, pos: V3, yaw: number) => { o.position.set(...pos); o.rotation.y = yaw; b.addObject(o); };
  place(crate(ctx, 0.9), [3.4, 0, 6], 0.3);
  place(crate(ctx, 0.7), [3.6, 0.9, 6.1], -0.2);
  place(crate(ctx, 0.8), [-6, 0, -18], 0.6);
  b.add(new THREE.BoxGeometry(1.6, 0.12, 0.9), wood, { pos: [-5, 0.06, 9], rot: [0, 0.4, 0], color: '#9a8068' });
  const rnd = P.rng(7);
  for (const [x, z, r] of [[-20, -26, 1.4], [20, -27, 1.1], [-21, 14, 0.9]] as V3[]) {
    b.add(P.blob(r, { detail: 2, amp: 0.25, freq: 1.6, seed: Math.floor(rnd() * 99), squash: [1, 0.2, 0.8], flatBottom: 0 }), slag, { pos: [x, 0, z] });
  }
  for (let i = 0; i < 6; i++) b.add(flat(P.rounded(0.22, 0.065, 0.1, 0.01, 1)), brick, { pos: [-7 + rnd() * 3, 0.033, -2 + rnd() * 2], rot: [0, rnd() * 3, 0], color: '#b0a098' });
}
