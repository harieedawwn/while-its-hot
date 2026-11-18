import * as THREE from 'three';
import * as P from '../render/geo/procgeo';
import type { StaticBatch } from '../render/geo/static-batch';
import type { MaterialLib } from '../render/materials/library';
import { flat, slab } from '../render/models/kit';

/**
 * The lookdev foundry corner shell: concrete floor with a grated work bay, brick walls with a steel-framed
 * window (back wall z = −3, left wall x = −4), an H-beam column and overhead girders, slag along the walls.
 * Props are placed by the scene. Everything here is static and goes through one StaticBatch.
 */
export const ROOM = { backZ: -3, leftX: -4, height: 4.6, win: { x0: 0.1, x1: 1.5, y0: 1.6, y1: 3.2 } } as const;

/** H-beam (I-section) along +Y, length h, centered on x/z. flange width w, depth d. */
function hbeam(h: number, w = 0.3, d = 0.3, t = 0.03): THREE.BufferGeometry {
  return flat(P.bake([
    P.part(slab(w, h, t, 1), '#ffffff', { pos: [0, h / 2, d / 2 - t / 2] }),
    P.part(slab(w, h, t, 1), '#ffffff', { pos: [0, h / 2, -d / 2 + t / 2] }),
    P.part(slab(t, h, d - t * 2, 1), '#c8c8c8', { pos: [0, h / 2, 0] }),
  ], { shade: 0.15 }));
}

export function buildRoom(b: StaticBatch, lib: MaterialLib): void {
  const brick = lib.get('brick'), concrete = lib.get('concrete'), grate = lib.get('grate');
  const rust = lib.get('rust'), slag = lib.get('slag'), glow = lib.get('glow');
  const H = ROOM.height, bz = ROOM.backZ, lx = ROOM.leftX, w = ROOM.win;

  // floor, subdivided every meter so point lights band across it
  b.add(slab(9, 0.2, 8.4, 1), concrete, { pos: [0.5, -0.1, 1.2], color: '#b8927a' });
  // soot-black plank ceiling and a right-hand brick wall close the box (nothing reads as void)
  b.add(slab(9, 0.2, 8.4, 1), lib.get('wood'), { pos: [0.5, H + 0.1, 1.2], color: '#4a3a32' });
  b.add(slab(0.4, H, 8.4, 1), brick, { pos: [5.2, H / 2, 1.2], color: '#8a7a72' });
  // grated work bay with an iron frame
  b.add(slab(3, 0.04, 2.4, 1), grate, { pos: [0.9, 0.0, 0.4] });
  for (const z of [-0.84, 1.64]) b.add(slab(3.16, 0.05, 0.08, 1), rust, { pos: [0.9, 0.005, z], color: '#a09088' });
  for (const x of [-0.64, 2.44]) b.add(slab(0.08, 0.05, 2.4, 1), rust, { pos: [x, 0.005, 0.4], color: '#a09088' });

  // back wall with a window opening
  const t = 0.4, bzc = bz - t / 2;
  b.add(slab(w.x0 - (lx - t), H, t, 1), brick, { pos: [(w.x0 + lx - t) / 2, H / 2, bzc] });
  b.add(slab(4 - w.x1, H, t, 1), brick, { pos: [(4 + w.x1) / 2, H / 2, bzc] });
  b.add(slab(w.x1 - w.x0, w.y0, t, 1), brick, { pos: [(w.x0 + w.x1) / 2, w.y0 / 2, bzc] });
  b.add(slab(w.x1 - w.x0, H - w.y1, t, 1), brick, { pos: [(w.x0 + w.x1) / 2, (H + w.y1) / 2, bzc] });
  // left wall
  b.add(slab(t, H, 8.4, 1), brick, { pos: [lx - t / 2, H / 2, 1.0 - 0.0] });
  // soot-dark concrete plinth along both walls
  b.add(slab(9, 0.28, 0.08, 1), concrete, { pos: [0.5, 0.14, bz + 0.04], color: '#6a625c' });
  b.add(slab(0.08, 0.28, 8.0, 1), concrete, { pos: [lx + 0.04, 0.14, 1.0], color: '#6a625c' });

  // window: deep iron frame, mullions, sill, six panes (one broken dark)
  const cx = (w.x0 + w.x1) / 2, cy = (w.y0 + w.y1) / 2, ww = w.x1 - w.x0, wh = w.y1 - w.y0, fd = 0.12;
  const fz = bz - 0.3;
  for (const y of [w.y0 + 0.04, w.y1 - 0.04]) b.add(slab(ww, 0.08, fd, 1), rust, { pos: [cx, y, fz] });
  for (const x of [w.x0 + 0.04, w.x1 - 0.04]) b.add(slab(0.08, wh, fd, 1), rust, { pos: [x, cy, fz] });
  b.add(slab(0.04, wh, 0.06, 1), rust, { pos: [cx, cy, fz] });
  for (const k of [1, 2]) b.add(slab(ww, 0.04, 0.06, 1), rust, { pos: [cx, w.y0 + (wh * k) / 3, fz] });
  b.add(slab(ww + 0.3, 0.07, 0.5, 1), concrete, { pos: [cx, w.y0 - 0.035, bz - 0.12], color: '#9a928a' });
  const paneW = ww / 2 - 0.06, paneH = wh / 3 - 0.05;
  const panes = ['#53718a', '#4c6880', '#5a7891', '#1b2630', '#4f6d86', '#5d7c95'];
  panes.forEach((c, i) => {
    const px = cx + (i % 2 ? 1 : -1) * (ww / 4), py = w.y0 + (Math.floor(i / 2) + 0.5) * (wh / 3);
    b.add(new THREE.PlaneGeometry(paneW, paneH), glow, { pos: [px, py, fz - 0.02], color: c });
  });

  // H-beam column on the right, girder along the back wall, beam across the room for the chain
  b.add(hbeam(H), rust, { pos: [2.9, 0, bz + 0.16] });
  b.add(slab(0.5, 0.04, 0.5, 1), rust, { pos: [2.9, 0.02, bz + 0.2], color: '#8a7a70' });
  b.add(hbeam(7.0, 0.26, 0.34), rust, { pos: [lx, 4.05, bz + 0.2], rot: [0, 0, -Math.PI / 2] });
  b.add(hbeam(7.4, 0.24, 0.32), rust, { pos: [1.6, 4.3, bz], rot: [Math.PI / 2, 0, 0], color: '#b0a49c' });
  const rivets: P.Part[] = [];
  for (let y = 0.4; y < H; y += 0.35) for (const s of [-1, 1]) rivets.push(P.part(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 5), '#9a8a80', { pos: [2.9 + s * 0.1, y, bz + 0.16 + 0.16], rot: [Math.PI / 2, 0, 0] }));
  b.add(flat(P.bake(rivets, { shade: 0 })), rust);

  // slag drifts in the corner and along the walls
  const rnd = P.rng(4);
  const drifts: [number, number, number][] = [[-3.5, -2.5, 0.9], [-3.7, -1.2, 0.6], [-1.6, -2.7, 0.7], [2.2, -2.75, 0.5], [-3.75, 3.2, 0.6]];
  for (const [x, z, r] of drifts) b.add(P.blob(r, { detail: 2, amp: 0.25, freq: 1.6, seed: Math.floor(rnd() * 99), squash: [1, 0.16, 0.7], flatBottom: 0 }), slag, { pos: [x, 0, z], rot: [0, rnd() * 3, 0] });
  // loose bricks
  for (let i = 0; i < 5; i++) b.add(flat(P.rounded(0.22, 0.065, 0.1, 0.01, 1)), brick,
    { pos: [-2.2 + rnd() * 1.4, 0.033, -2.6 + rnd() * 0.5], rot: [0, rnd() * 3, 0], color: '#b0a098' });
}
