import type * as THREE from 'three';
import { StaticBatch, type PlaceOpts } from '../render/geo/static-batch';

/**
 * A StaticBatch split into square floor regions. The PSX material picks its 4 nearest point lights per
 * mesh, so one arena-wide mesh per material would light the whole arena from the same 4 lights; a region
 * mesh only sees the lights near it. A piece belongs to the region of `at` (default: its position).
 * Keep pieces smaller than a region so bounding spheres stay tight.
 */
export interface RegionOpts extends PlaceOpts { at?: readonly [number, number] }

export class RegionBatch {
  private cells = new Map<number, StaticBatch>();
  constructor(private half: number, private cell: number) {}

  private batch(x: number, z: number): StaticBatch {
    const n = Math.max(1, Math.round((this.half * 2) / this.cell));
    const ci = (v: number) => Math.max(0, Math.min(n - 1, Math.floor((v + this.half) / this.cell)));
    const k = ci(z) * n + ci(x);
    let b = this.cells.get(k);
    if (!b) this.cells.set(k, (b = new StaticBatch()));
    return b;
  }
  add(geo: THREE.BufferGeometry, mat: THREE.Material, o: RegionOpts = {}): void {
    const at = o.at ?? (o.pos ? [o.pos[0], o.pos[2]] : [0, 0]);
    this.batch(at[0], at[1]).add(geo, mat, o);
  }
  addObject(obj: THREE.Object3D): void { this.batch(obj.position.x, obj.position.z).addObject(obj); }
  build(): THREE.Mesh[] {
    const out: THREE.Mesh[] = [];
    for (const [k, b] of this.cells) for (const m of b.build()) { m.name += `@${k}`; out.push(m); }
    this.cells.clear();
    return out;
  }
}
