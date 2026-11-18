import * as THREE from 'three';
import * as P from '../geo/procgeo';
import { flat, mesh, type ModelCtx } from './kit';

/**
 * Iron fire bowl on three legs with a heap of coals. Origin = floor center.
 * The coal mesh (`brazier:coal`) is separate: its `userData.heat` drives the ember glow and its
 * `heatMask` attribute (top faces hot, undersides cold) splits the heap across several heat steps.
 * Sockets: `fire` (where the point light sits).
 */
export const BRAZIER = { bowlY: 0.62, fireY: 0.86 } as const;

export function build(ctx: ModelCtx): THREE.Object3D {
  const { lib } = ctx;
  const root = new THREE.Group();
  root.name = 'brazier';
  const by = BRAZIER.bowlY;
  const legs = [0, 1, 2].map((i) => {
    const a = (i / 3) * Math.PI * 2 + 0.3, c = Math.cos(a), s = Math.sin(a);
    return P.part(P.tube([[c * 0.2, by + 0.04, s * 0.2], [c * 0.27, by * 0.45, s * 0.27], [c * 0.34, 0.02, s * 0.34]], 0.022, 6, 5), '#b09888');
  });
  const iron = P.bake([
    // shallow bowl, thick rolled rim
    P.part(P.lathe([[0.001, 0], [0.12, 0.012], [0.25, 0.07], [0.33, 0.17], [0.345, 0.2]], 12, 2), '#c8b0a0', { pos: [0, by, 0], shade: 0.4 }),
    P.part(new THREE.TorusGeometry(0.345, 0.022, 4, 16), '#d8c0b0', { pos: [0, by + 0.2, 0], rot: [Math.PI / 2, 0, 0] }),
    // a ring brace tying the legs together
    P.part(new THREE.TorusGeometry(0.27, 0.012, 4, 12), '#b09888', { pos: [0, by * 0.45, 0], rot: [Math.PI / 2, 0, 0] }),
    ...legs,
    ...[0, 1, 2].map((i) => {
      const a = (i / 3) * Math.PI * 2 + 0.3;
      return P.part(P.rounded(0.07, 0.02, 0.07, 0.006, 1), '#a08878', { pos: [Math.cos(a) * 0.34, 0.01, Math.sin(a) * 0.34] });
    }),
  ], { shade: 0.3 });
  root.add(mesh(flat(iron), lib.get('rust'), 'brazier:iron'));

  // coal heap: a mound plus loose lumps, heat mask from facing + noise
  const rnd = P.rng(ctx.seed ?? 7);
  const lumps: P.Part[] = [P.part(P.blob(0.26, { detail: 1, amp: 0.22, freq: 2.4, seed: 3, squash: [1, 0.36, 1], flatBottom: -0.02 }), '#a8a4a0', { pos: [0, by + 0.1, 0], shade: 0.5 })];
  for (let i = 0; i < 9; i++) {
    const a = rnd() * Math.PI * 2, r = 0.05 + rnd() * 0.19;
    lumps.push(P.part(P.blob(0.045 + rnd() * 0.035, { detail: 0, amp: 0.3, seed: i + 11 }), '#b8b4b0',
      { pos: [Math.cos(a) * r, by + 0.14 + (0.24 - r) * 0.35 + rnd() * 0.02, Math.sin(a) * r], rot: [rnd() * 3, rnd() * 3, rnd() * 3] }));
  }
  const coal = flat(P.bake(lumps, { shade: 0.3 }));
  const pos = coal.getAttribute('position'), nor = coal.getAttribute('normal');
  const mask = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i += 3) {
    // per face: up-facing and central faces are hottest; a noise term breaks it into patches
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const up = Math.max(0, nor.getY(i));
    const n = P.noise3(x * 9, y * 9, z * 9, 5);
    const v = Math.max(0, Math.min(1, 0.25 + up * 0.55 + n * 0.45 - Math.hypot(x, z) * 0.9));
    mask[i] = mask[i + 1] = mask[i + 2] = v;
  }
  coal.setAttribute('heatMask', new THREE.BufferAttribute(mask, 1));
  const coalMesh = mesh(coal, lib.get('coal'), 'brazier:coal');
  coalMesh.userData.heat = 0.7;
  root.add(coalMesh);

  root.userData.sockets = { fire: new THREE.Vector3(0, BRAZIER.fireY, 0) };
  return root;
}
