import * as THREE from 'three';
import * as P from '../geo/procgeo';
import { cyl, flat, mesh, type ModelCtx } from './kit';

/**
 * London-pattern anvil on a banded wooden stump. Origin = floor center, horn points +X.
 * Sockets: `face` (top of the working face, where the blade lies). ≈ 900 tris over 4 meshes.
 */
export const ANVIL = { stumpH: 0.52, faceY: 0.52 + 0.332 } as const;

export function build(ctx: ModelCtx): THREE.Object3D {
  const { lib } = ctx;
  const root = new THREE.Group();
  root.name = 'anvil';
  const y0 = ANVIL.stumpH;

  // side silhouette: waist, throat under the horn, heel step — extruded with a chamfer
  const profile: [number, number][] = [
    [-0.12, 0.07], [0.12, 0.07], [0.095, 0.165], [0.15, 0.2], [0.2, 0.235], [0.2, 0.32],
    [-0.315, 0.32], [-0.315, 0.272], [-0.21, 0.225], [-0.1, 0.17],
  ];
  const steel = P.bake([
    P.part(P.extrude(profile, 0.13, 0.012, 2), '#dfe3e6', { pos: [0, y0, 0], shade: 0.25 }),
    // base with four splayed feet
    P.part(P.rounded(0.3, 0.075, 0.24, 0.015, 1), '#c8ccd0', { pos: [0, y0 + 0.037, 0], shade: 0.3 }),
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) =>
      P.part(P.rounded(0.09, 0.05, 0.08, 0.012, 1), '#bfc3c7', { pos: [sx * 0.16, y0 + 0.025, sz * 0.12] })),
    // polished face plate, slightly proud
    P.part(P.rounded(0.505, 0.014, 0.148, 0.004, 1), '#ffffff', { pos: [-0.06, y0 + 0.326, 0], shade: 0 }),
    // horn: tapered, a little upturned
    P.part(P.tube([[0.16, 0.28, 0], [0.33, 0.274, 0], [0.52, 0.292, 0]], (t) => 0.068 * Math.pow(1 - t, 0.8) + 0.005, 10, 8),
      '#dfe3e6', { pos: [0, y0, 0], shade: 0.15 }),
  ]);
  root.add(mesh(flat(steel), lib.get('steel'), 'anvil:steel'));

  // hardy + pritchel holes: dark insets on the face
  const holes = P.bake([
    P.part(P.rounded(0.03, 0.004, 0.03, 0.002, 1), '#060606', { pos: [-0.255, y0 + 0.334, 0] }),
    P.part(cyl(0.009, 0.009, 0.004, 6), '#060606', { pos: [-0.2, y0 + 0.334, 0.02] }),
  ], { shade: 0 });
  root.add(mesh(holes, lib.get('paint'), 'anvil:holes'));

  // stump: slightly irregular log section, two iron bands, four staples over the feet
  const stump = P.bake([
    P.part(P.lathe([[0.215, 0], [0.205, 0.08], [0.198, 0.3], [0.2, 0.47], [0.19, y0 - 0.005], [0.0, y0]], 12, 1), '#d8c2b0', { shade: 0.35 }),
  ]);
  root.add(mesh(flat(stump), lib.get('wood'), 'anvil:stump'));
  const iron = P.bake([
    P.part(new THREE.TorusGeometry(0.204, 0.012, 4, 14), '#c0aaa0', { pos: [0, 0.1, 0], rot: [Math.PI / 2, 0, 0] }),
    P.part(new THREE.TorusGeometry(0.2, 0.012, 4, 14), '#c0aaa0', { pos: [0, 0.42, 0], rot: [Math.PI / 2, 0, 0] }),
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) =>
      P.part(P.rounded(0.02, 0.06, 0.05, 0.005, 1), '#b09a90', { pos: [sx * 0.2, y0 + 0.01, sz * 0.12] })),
  ]);
  root.add(mesh(flat(iron), lib.get('rust'), 'anvil:iron'));

  root.userData.sockets = { face: new THREE.Vector3(-0.06, ANVIL.faceY, 0) };
  return root;
}
