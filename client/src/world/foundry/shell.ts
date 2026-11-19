import * as THREE from 'three';
import { FOUNDRY, wallPoint, type Side } from '@wih/shared';
import { box, tiled, type Ctx } from './ctx';

/** A hole in the outer wall: alcove between u0..u1, `h` tall, `depth` into the wall. */
interface Hole { u0: number; u1: number; h: number; depth: number; kind: 'cage' | 'furnace' }
const SIDES: Side[] = ['N', 'E', 'S', 'W'];

export function holesOf(side: Side): Hole[] {
  const out: Hole[] = FOUNDRY.cages.filter((c) => c.side === side).map((c) => ({
    u0: c.u - FOUNDRY.cage.w / 2, u1: c.u + FOUNDRY.cage.w / 2, h: FOUNDRY.cage.h, depth: FOUNDRY.cage.depth, kind: 'cage' as const,
  }));
  if (side === 'N') { const f = FOUNDRY.furnace; out.push({ u0: f.u - f.w / 2, u1: f.u + f.w / 2, h: f.h, depth: f.depth, kind: 'furnace' }); }
  return out.sort((a, b) => a.u0 - b.u0);
}

/** Box in wall-local coordinates (u along the wall, d outward from the arena face, y up). */
export function wbox(c: Ctx, mat: THREE.Material, side: Side, u0: number, u1: number, d0: number, d1: number, y0: number, y1: number, color: string, step = 2): void {
  const a = wallPoint(side, u0, d0), b = wallPoint(side, u1, d1);
  box(c, mat, [Math.min(a[0], b[0]), y0, Math.min(a[1], b[1])], [Math.max(a[0], b[0]), y1, Math.max(a[1], b[1])], color, step);
}
/** wbox cut into ≤ `cell` m runs along u (so each run lands in its own light region). */
function wrun(c: Ctx, mat: THREE.Material, side: Side, u0: number, u1: number, d0: number, d1: number, y0: number, y1: number, color: string): void {
  const n = Math.max(1, Math.ceil((u1 - u0) / 10));
  for (let i = 0; i < n; i++) wbox(c, mat, side, u0 + ((u1 - u0) * i) / n, u0 + ((u1 - u0) * (i + 1)) / n, d0, d1, y0, y1, color);
}

/** Outer wall (7 m thick, 16 m high) with cage alcoves and the furnace recess, plus the roof. */
export function buildShell(c: Ctx): void {
  const { lib, pal } = c, brick = lib.get('brick'), rust = lib.get('rust');
  const T = FOUNDRY.wallT, W = FOUNDRY.wallH, bed = FOUNDRY.channel.bedY, half = FOUNDRY.half;

  for (const side of SIDES) {
    const span = side === 'N' || side === 'S' ? half + T : half;
    const holes = holesOf(side);
    let u = -span;
    for (const h of [...holes, null]) {
      const end = h ? h.u0 : span;
      if (end > u) wrun(c, brick, side, u, end, 0, T, bed, W, pal.wall);
      if (!h) break;
      // lintel above, back wall behind, floor under the alcove
      wrun(c, brick, side, h.u0, h.u1, 0, T, h.h, W, pal.wall);
      wrun(c, brick, side, h.u0, h.u1, h.depth, T, bed, h.h, pal.wall);
      if (h.kind === 'cage') {
        wbox(c, rust, side, h.u0, h.u1, 0, h.depth, -0.2, 0, pal.floorDark);
        wbox(c, brick, side, h.u0, h.u1, 0, h.depth, bed, -0.2, pal.channelWall);
        cageDressing(c, side, h);
      }
      u = h.u1;
    }
    // base plinth along the arena face (soot-dark concrete, broken at the alcoves) and a steel cap rail high up
    let pu = -half;
    for (const h of [...holes, null]) {
      const end = h ? h.u0 : half;
      if (end > pu) wrun(c, lib.get('concrete'), side, pu, end, -0.15, 0, 0, 0.9, '#6a5c54');
      if (h) pu = h.u1;
    }
    wrun(c, rust, side, -span, span, -0.5, 0, W - 1.2, W - 0.7, pal.rustDark);
  }

  // roof: dark slabs in region tiles, cold skylight slits and rust trusses under them
  tiled(c, rust, [-half, FOUNDRY.roofY, -half], [half, FOUNDRY.roofY + 0.4, half], pal.roof, 10, 4);
  const sky = lib.get('glow');
  for (const x of [-21, -7, 7, 21]) c.b.add(new THREE.PlaneGeometry(1.4, 26), sky, { pos: [x, FOUNDRY.roofY - 0.01, 0], rot: [Math.PI / 2, 0, 0], color: '#7f93a6' });
  for (const z of [-22, -11, 0, 11, 22]) box(c, rust, [-half, FOUNDRY.roofY - 0.9, z - 0.3], [half, FOUNDRY.roofY, z + 0.3], pal.rustDark, 6);
  for (const x of [-28, -14, 14, 28]) box(c, rust, [x - 0.25, FOUNDRY.roofY - 0.5, -half], [x + 0.25, FOUNDRY.roofY, half], pal.iron, 6);
}

/** Cage furnishing: iron frame around the opening, a bench, a dim lamp. The door itself is dynamic (cages.ts). */
function cageDressing(c: Ctx, side: Side, h: Hole): void {
  const { lib, pal } = c, rust = lib.get('rust'), steel = lib.get('steel'), glow = lib.get('glow'), paint = lib.get('paint');
  const mid = (h.u0 + h.u1) / 2;
  wbox(c, rust, side, h.u0 - 0.3, h.u0 + 0.05, -0.2, 0.35, 0, h.h + 0.3, pal.rust);
  wbox(c, rust, side, h.u1 - 0.05, h.u1 + 0.3, -0.2, 0.35, 0, h.h + 0.3, pal.rust);
  wbox(c, rust, side, h.u0 - 0.3, h.u1 + 0.3, -0.2, 0.35, h.h, h.h + 0.45, pal.rustDark);
  wbox(c, paint, side, h.u0 - 0.3, h.u1 + 0.3, -0.21, -0.19, h.h + 0.05, h.h + 0.25, pal.ochre);
  wbox(c, steel, side, h.u0 + 0.2, h.u1 - 0.2, h.depth - 0.7, h.depth - 0.05, 0, 0.5, pal.steelColdDark);
  // lamp: one small ember-colored quad on the back wall, high
  const p = wallPoint(side, mid, h.depth - 0.02);
  const rot = side === 'N' ? 0 : side === 'S' ? Math.PI : side === 'E' ? -Math.PI / 2 : Math.PI / 2;
  c.b.add(new THREE.PlaneGeometry(0.5, 0.3), glow, { pos: [p[0], 3.2, p[1]], rot: [0, rot, 0], color: '#b32d10' });
}
