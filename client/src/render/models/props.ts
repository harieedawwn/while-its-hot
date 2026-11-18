import * as THREE from 'three';
import * as P from '../geo/procgeo';
import { cyl, flat, mesh, type ModelCtx } from './kit';

/** Small foundry props. Each returns an Object3D with origin on the floor (or grip for tools). */

/** Plank crate with darker battens on every edge and iron corner caps. size = edge length. */
export function crate(ctx: ModelCtx, size = 0.8): THREE.Object3D {
  const s = size, h = s / 2, b = s * 0.07, root = new THREE.Group();
  const wood: P.Part[] = [P.part(P.rounded(s - b, s - b, s - b, 0.01, 1), '#e0c8b0', { pos: [0, h, 0], shade: 0.25 })];
  const edge = (w: number, hh: number, d: number, x: number, y: number, z: number) =>
    wood.push(P.part(P.rounded(w, hh, d, 0.008, 1), '#a89078', { pos: [x, y, z], shade: 0.1 }));
  for (const a of [-1, 1]) for (const c of [-1, 1]) {
    edge(s, b, b, 0, h + a * (h - b / 2), c * (h - b / 2));
    edge(b, s, b, a * (h - b / 2), h, c * (h - b / 2));
    edge(b, b, s, a * (h - b / 2), h + c * (h - b / 2), 0);
  }
  // a diagonal brace on two faces
  for (const z of [-1, 1]) wood.push(P.part(P.rounded(s * 1.2, b * 0.8, b * 0.5, 0.006, 1), '#b8a088', { pos: [0, h, z * (h - b * 0.1)], rot: [0, 0, Math.PI / 4] }));
  root.add(mesh(flat(P.bake(wood)), ctx.lib.get('wood'), 'crate:wood'));
  const caps: P.Part[] = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1])
    caps.push(P.part(P.rounded(b * 1.5, b * 1.5, b * 1.5, 0.006, 1), '#a89088', { pos: [x * (h - b * 0.55), h + y * (h - b * 0.55), z * (h - b * 0.55)] }));
  root.add(mesh(flat(P.bake(caps, { shade: 0 })), ctx.lib.get('rust'), 'crate:iron'));
  return root;
}

/** Quench tub: staved barrel, two hoops, dark still water. */
export function quenchTub(ctx: ModelCtx): THREE.Object3D {
  const root = new THREE.Group();
  const prof: [number, number][] = [[0.3, 0], [0.34, 0.2], [0.35, 0.36], [0.33, 0.58], [0.31, 0.62]];
  const staves = P.lathe(prof, 14, 1);
  root.add(mesh(flat(P.bake([P.part(staves, '#d0b8a0', { shade: 0.35 })])), ctx.lib.get('wood'), 'tub:wood'));
  root.add(mesh(flat(P.bake([
    P.part(new THREE.TorusGeometry(0.343, 0.014, 4, 16), '#b8a090', { pos: [0, 0.14, 0], rot: [Math.PI / 2, 0, 0] }),
    P.part(new THREE.TorusGeometry(0.34, 0.014, 4, 16), '#b8a090', { pos: [0, 0.5, 0], rot: [Math.PI / 2, 0, 0] }),
  ], { shade: 0 })), ctx.lib.get('rust'), 'tub:hoops'));
  root.add(mesh(P.bake([P.part(cyl(0.31, 0.31, 0.01, 14), '#0f1c22', { pos: [0, 0.55, 0] })], { shade: 0 }), ctx.lib.get('paint'), 'tub:water'));
  return root;
}

/** Blacksmith hammer lying/hanging; origin at the grip end of the handle, head toward +Y. */
export function hammer(ctx: ModelCtx, len = 0.42, head = 0.13): THREE.Object3D {
  const root = new THREE.Group();
  root.add(mesh(P.bake([P.part(P.tube([[0, 0, 0], [0, len * 0.6, 0], [0, len, 0]], (t) => 0.014 + 0.004 * (1 - t), 4, 6), '#d0b090')]), ctx.lib.get('wood'), 'hammer:handle'));
  root.add(mesh(flat(P.bake([
    P.part(P.rounded(head, 0.042, 0.042, 0.006, 1), '#e0e4e8', { pos: [head * 0.12, len, 0] }),
    P.part(P.rounded(0.03, 0.05, 0.05, 0.006, 1), '#f0f2f4', { pos: [head * 0.62, len, 0] }),
  ], { shade: 0.1 })), ctx.lib.get('steel'), 'hammer:head'));
  return root;
}

/** Long tongs, closed; origin at the handle ends, jaws toward +Y. */
export function tongs(ctx: ModelCtx, len = 0.6): THREE.Object3D {
  const root = new THREE.Group();
  const arm = (s: number) => P.part(P.tube([[s * 0.02, 0, 0], [s * 0.012, len * 0.75, 0], [s * 0.0, len * 0.86, 0], [s * 0.022, len, 0]], 0.007, 8, 4), '#c8ccd0');
  root.add(mesh(P.bake([arm(1), arm(-1), P.part(cyl(0.014, 0.014, 0.024, 6), '#b8bcc0', { pos: [0, len * 0.84, 0], rot: [Math.PI / 2, 0, 0] })]), ctx.lib.get('steel'), 'tongs'));
  return root;
}

/** Hanging chain with a hook; origin at the top link, hangs toward −Y. */
export function chain(ctx: ModelCtx, links = 12): THREE.Object3D {
  const parts: P.Part[] = [];
  const L = 0.07;
  for (let i = 0; i < links; i++) {
    const g = new THREE.TorusGeometry(0.03, 0.008, 4, 8);
    g.scale(0.75, 1.25, 1);
    parts.push(P.part(g, '#c0b8b0', { pos: [0, -i * L, 0], rot: [0, i % 2 ? Math.PI / 2 : 0, 0] }));
  }
  const hy = -links * L;
  parts.push(P.part(P.tube([[0, hy + 0.03, 0], [0, hy - 0.08, 0], [0.02, hy - 0.16, 0], [0.08, hy - 0.15, 0], [0.09, hy - 0.09, 0]], 0.014, 12, 5), '#b0a8a0'));
  const root = new THREE.Group();
  root.add(mesh(flat(P.bake(parts, { shade: 0 })), ctx.lib.get('steel'), 'chain'));
  return root;
}

/** Bar stock on the anvil: the heat-cycling hero. Origin = bottom center. */
export function ingot(ctx: ModelCtx): THREE.Mesh {
  const g = flat(P.bake([
    P.part(P.rounded(0.34, 0.032, 0.05, 0.008, 1), '#d8dce0', { pos: [0, 0.016, 0], shade: 0.2 }),
    P.part(P.rounded(0.06, 0.028, 0.044, 0.006, 1), '#c8ccd0', { pos: [0.19, 0.014, 0], rot: [0, 0, -0.18] }),
  ]));
  return mesh(g, ctx.lib.get('steel'), 'ingot');
}
