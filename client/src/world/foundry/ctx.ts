import * as THREE from 'three';
import type { MaterialLib } from '../../render/materials/library';
import { flat, slab } from '../../render/models/kit';
import type { ModelCtx } from '../../render/models/kit';
import type { RegionBatch } from '../region-batch';

/** What every foundry piece builder gets. */
export interface Ctx extends ModelCtx {
  b: RegionBatch;
  /** Per-area palette (LOOK §1.6): floor = ember rust, catwalks = cold steel, furnace = near white. */
  pal: typeof PAL;
}
export const PAL = {
  floor: '#d8a07c', floorDark: '#8a6a58', wall: '#8a7068', wallHi: '#a08678', channelWall: '#7a5a4e',
  steelCold: '#a4b6c8', steelColdDark: '#7e8e9e', rust: '#a8847a', rustDark: '#7a5c52', ochre: '#8a6a2a',
  concrete: '#b09c90', roof: '#3a3030', iron: '#6a625e',
} as const;

type V3 = [number, number, number];
/** Axis-aligned box between min and max corners; `step` = segment size (point lights band across big faces). */
export function box(c: Ctx, mat: THREE.Material, min: V3, max: V3, color: string = '#ffffff', step = 2): void {
  const s: V3 = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  if (s[0] <= 0 || s[1] <= 0 || s[2] <= 0) return;
  c.b.add(slab(s[0], s[1], s[2], step), mat, { pos: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2], color });
}
/** Box cut into pieces of at most `cell` meters on x and z, so each piece lands in its own region. */
export function tiled(c: Ctx, mat: THREE.Material, min: V3, max: V3, color: string, cell = 10, step = 2): void {
  const nx = Math.max(1, Math.ceil((max[0] - min[0]) / cell)), nz = Math.max(1, Math.ceil((max[2] - min[2]) / cell));
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const x0 = min[0] + ((max[0] - min[0]) * i) / nx, x1 = min[0] + ((max[0] - min[0]) * (i + 1)) / nx;
    const z0 = min[2] + ((max[2] - min[2]) * j) / nz, z1 = min[2] + ((max[2] - min[2]) * (j + 1)) / nz;
    box(c, mat, [x0, min[1], z0], [x1, max[1], z1], color, step);
  }
}
/** Vertical cylinder from y0 to y1. */
export function post(c: Ctx, mat: THREE.Material, x: number, z: number, y0: number, y1: number, r: number, color: string, seg = 8): void {
  const g = new THREE.CylinderGeometry(r, r, y1 - y0, seg);
  g.deleteAttribute('uv');
  c.b.add(flat(g), mat, { pos: [x, (y0 + y1) / 2, z], color });
}
/** I-beam / rectangular girder along an axis (box), `rot` 0 = along x, 1 = along z. */
export function girder(c: Ctx, mat: THREE.Material, x: number, y: number, z: number, len: number, w: number, h: number, along: 'x' | 'z', color: string): void {
  box(c, mat, along === 'x' ? [x - len / 2, y - h / 2, z - w / 2] : [x - w / 2, y - h / 2, z - len / 2],
    along === 'x' ? [x + len / 2, y + h / 2, z + w / 2] : [x + w / 2, y + h / 2, z + len / 2], color, 4);
}
