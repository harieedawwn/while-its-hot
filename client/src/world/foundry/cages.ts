import * as THREE from 'three';
import { FOUNDRY, wallPoint, wallYaw, type CageDef } from '@wih/shared';
import * as P from '../../render/geo/procgeo';
import { flat, mesh } from '../../render/models/kit';
import type { MaterialLib } from '../../render/materials/library';
import type { Blocker } from '../../physics/blockers';

/** Door slam timing: seconds from release to fully open (it flies up into the lintel). */
const OPEN_S = 0.32;

/** One cage door: vertical bars between a top and bottom bar, sliding straight up into the wall. */
function doorGeo(): THREE.BufferGeometry {
  const w = FOUNDRY.cage.w - 0.1, h = FOUNDRY.cage.h - 0.05, parts: P.Part[] = [];
  const bars = Math.round(w / 0.24);
  for (let i = 0; i <= bars; i++) {
    const g = new THREE.CylinderGeometry(0.035, 0.035, h, 5); g.deleteAttribute('uv');
    parts.push(P.part(g, '#b0aca8', { pos: [-w / 2 + (i * w) / bars, h / 2, 0] }));
  }
  for (const y of [0.12, h * 0.35, h * 0.68, h - 0.1]) parts.push(P.part(P.rounded(w + 0.08, 0.09, 0.09, 0.01, 1), '#8a847e', { pos: [0, y, 0] }));
  return flat(P.bake(parts, { shade: 0.1 }));
}

export class CageDoors {
  readonly group = new THREE.Group();
  private doors: THREE.Mesh[] = [];
  private t = 0;     // 0 closed … 1 open
  private target = 0;
  private lift = FOUNDRY.cage.h + 0.4;
  private blockers: Blocker[] = [];

  /** `blockers` is the CollisionWorld's dynamic list: a closed door is a solid slab, an open one is removed. */
  constructor(lib: MaterialLib, blockers: Blocker[]) {
    const geo = doorGeo();
    for (const cage of FOUNDRY.cages) {
      const m = mesh(geo.clone(), lib.get('steel'), `cage-door:${cage.id}`);
      m.userData.noCollide = true;
      this.place(m, cage);
      const ew = cage.side === 'E' || cage.side === 'W';
      const blk: Blocker = { x: m.position.x, z: m.position.z, r: 0, y: 0, h: FOUNDRY.cage.h, on: true, hx: ew ? 0.12 : FOUNDRY.cage.w / 2, hz: ew ? FOUNDRY.cage.w / 2 : 0.12 };
      this.blockers.push(blk); blockers.push(blk);
      this.doors.push(m);
      this.group.add(m);
    }
  }
  private place(m: THREE.Mesh, c: CageDef): void {
    const [x, z] = wallPoint(c.side, c.u, 0.14);
    m.position.set(x, 0, z);
    m.rotation.y = wallYaw(c.side) + Math.PI; // local +Z faces the arena
  }
  /** `p` 0 closed … 1 open, immediately (dev scene, frozen shots). */
  set(p: number): void { this.t = this.target = p; this.apply(); }
  /** Slam them open (round start) or shut. */
  open(): void { this.target = 1; }
  close(): void { this.target = 0; }
  update(dt: number): void {
    if (this.t === this.target) return;
    const k = dt / OPEN_S;
    this.t = this.target > this.t ? Math.min(this.target, this.t + k) : Math.max(this.target, this.t - k);
    this.apply();
  }
  private apply(): void {
    const e = 1 - Math.pow(1 - this.t, 3);
    for (const d of this.doors) d.position.y = e * this.lift;
    for (const b of this.blockers) b.on = this.t < 0.4;
  }
  dispose(): void { for (const d of this.doors) d.geometry.dispose(); for (const b of this.blockers) b.on = false; }
}
