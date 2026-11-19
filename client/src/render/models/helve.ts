import * as THREE from 'three';
import * as P from '../geo/procgeo';
import { cyl, flat, mesh, slab, type ModelCtx } from './kit';

/**
 * Helve hammer (menu smithy): an oak post with iron cheeks holding an axle; a long oak helve with an iron
 * head at the far end and a strapped tail. Origin = axle center. `tilt` is the group to rotate about local Z
 * (+ raises the head); the helve runs along +X, head face at x = HELVE.len, y = −HELVE.drop.
 */
export const HELVE = { len: 1.25, drop: 0.25, tail: 0.38, postH: 1.12 } as const;

export function build(ctx: ModelCtx): { root: THREE.Object3D; tilt: THREE.Object3D } {
  const wood = ctx.lib.get('wood'), steel = ctx.lib.get('steel'), rust = ctx.lib.get('rust');
  const root = new THREE.Group();
  const L = HELVE.len, T = HELVE.tail;

  // post from the floor up to just below the axle, two iron cheeks, a foot plate
  const postTop = -0.06;
  root.add(mesh(flat(P.bake([
    P.part(slab(0.2, HELVE.postH + postTop, 0.22, 1), '#b89878', { pos: [0, postTop - (HELVE.postH + postTop) / 2 - 0.0, 0] }),
    P.part(slab(0.26, 0.08, 0.28, 1), '#a08060', { pos: [0, -HELVE.postH + 0.04, 0] }),
  ], { shade: 0.12 })), wood, 'helve:post'));
  root.add(mesh(flat(P.bake([
    ...[-1, 1].map((s) => P.part(slab(0.16, 0.3, 0.025, 1), '#c0b4a8', { pos: [0, 0.02, s * 0.1] })),
    ...[-1, 1].map((s) => P.part(cyl(0.022, 0.022, 0.02, 6), '#e0d8d0', { pos: [0, 0, s * 0.118], rot: [Math.PI / 2, 0, 0] })),
    P.part(slab(0.3, 0.03, 0.26, 1), '#9a8c80', { pos: [0, postTop, 0] }),
  ], { shade: 0.1 })), rust, 'helve:cheeks'));

  const tilt = new THREE.Group();
  tilt.name = 'helve:tilt';
  root.add(tilt);
  // helve beam: slightly tapered toward the head, iron straps at the axle, mid and head
  const beam = P.bake([
    P.part(P.tube([[-T, 0, 0], [0, 0, 0], [L * 0.6, 0, 0], [L + 0.06, 0, 0]], (t) => 0.06 - 0.012 * t, 6, 6), '#c8a888'),
  ]);
  tilt.add(mesh(beam, wood, 'helve:beam'));
  tilt.add(mesh(flat(P.bake([
    ...[0.12, L * 0.55, L - 0.13].map((x) => P.part(slab(0.04, 0.13, 0.13, 1), '#8a8078', { pos: [x, 0, 0] })),
    // axle through the helve
    P.part(cyl(0.03, 0.03, 0.26, 8), '#d0c8c0', { rot: [Math.PI / 2, 0, 0] }),
    // tail counterweight block
    P.part(P.rounded(0.14, 0.14, 0.15, 0.01, 1), '#706860', { pos: [-T + 0.06, 0, 0] }),
  ], { shade: 0.12 })), rust, 'helve:straps'));
  // the head: a heavy iron block hanging below the beam, a brighter worn face
  const head = new THREE.Group();
  head.position.set(L, 0, 0);
  head.add(mesh(flat(P.bake([
    P.part(P.rounded(0.15, HELVE.drop - 0.03, 0.15, 0.012, 1), '#d8dce0', { pos: [0, -(HELVE.drop - 0.03) / 2, 0] }),
    P.part(slab(0.19, 0.05, 0.19, 1), '#b8bcc0', { pos: [0, 0.03, 0] }),
    P.part(slab(0.13, 0.03, 0.13, 1), '#ffffff', { pos: [0, -HELVE.drop + 0.015, 0] }),
  ], { shade: 0.14 })), steel, 'helve:head'));
  tilt.add(head);
  return { root, tilt };
}
