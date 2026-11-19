import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MeshBVH } from 'three-mesh-bvh';
import { type Blocker, resolveBlockers } from './blockers';

/** Called once per push-out with the push direction (unit, from surface toward the capsule). */
export type ContactFn = (n: THREE.Vector3) => void;

/**
 * Static collision world: every collidable triangle merged into one world-space geometry with a BVH.
 * Capsules are a segment (bottom sphere center → top sphere center) plus a radius (three-mesh-bvh's
 * character-controller approach: closest point triangle↔segment, push out by the overlap).
 */
export class CollisionWorld {
  readonly bvh: MeshBVH;
  /** Footstep surface per source triangle (index into `footNames`), when built from tagged meshes. */
  private triFoot: Uint8Array | null = null;
  readonly footNames: string[] = [];
  /** Dynamic solid cylinders (placed anvils). Toggle `on`; resolve and overlaps see them (probe does not: no wall-cling on an anvil). */
  readonly blockers: Blocker[] = [];
  private nOut = new THREE.Vector3();
  private box = new THREE.Box3();
  private triP = new THREE.Vector3();
  private segP = new THREE.Vector3();
  private dir = new THREE.Vector3();

  constructor(geometry: THREE.BufferGeometry) {
    this.bvh = new MeshBVH(geometry, { maxLeafSize: 8 });
  }

  /** Merge meshes (world matrices applied, position only) into one collision world. */
  static fromMeshes(meshes: THREE.Object3D[]): CollisionWorld {
    const geos: THREE.BufferGeometry[] = [];
    const footNames: string[] = [];
    const feet: number[] = []; // per geometry: foot index, triangle count
    for (const root of meshes) {
      root.updateMatrixWorld(true);
      root.traverse((o) => {
        if (!(o instanceof THREE.Mesh) || o.userData.noCollide) return;
        let g = new THREE.BufferGeometry();
        g.setAttribute('position', o.geometry.getAttribute('position').clone());
        if (o.geometry.index) g.setIndex(o.geometry.index.clone());
        if (g.index) g = g.toNonIndexed();
        g.applyMatrix4(o.matrixWorld);
        geos.push(g);
        const foot = (o.userData.foot as string | undefined) ?? 'stone';
        let fi = footNames.indexOf(foot);
        if (fi < 0) fi = footNames.push(foot) - 1;
        feet.push(fi, g.getAttribute('position').count / 3);
      });
    }
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) throw new Error('CollisionWorld: nothing to merge');
    const world = new CollisionWorld(merged);
    const tri = new Uint8Array(merged.getAttribute('position').count / 3);
    let at = 0;
    for (let i = 0; i < feet.length; i += 2) { tri.fill(feet[i], at, at + feet[i + 1]); at += feet[i + 1]; }
    world.triFoot = tri;
    world.footNames.push(...footNames);
    return world;
  }

  /** Footstep surface tag of a raycast hit (`stone` if the world was built untagged). */
  footAt(hit: THREE.Intersection): string {
    const fi = hit.faceIndex;
    const idx = this.bvh.geometry.index;
    if (!this.triFoot || fi == null || !idx) return 'stone';
    return this.footNames[this.triFoot[Math.floor(idx.getX(fi * 3) / 3)]] ?? 'stone';
  }

  /**
   * Push the capsule out of the world. Moves `seg` in place; calls onContact with each push direction.
   * Returns true if anything pushed. Two passes settle corners.
   */
  resolve(seg: THREE.Line3, r: number, onContact?: ContactFn, passes = 2): boolean {
    let any = false;
    for (let pass = 0; pass < passes; pass++) {
      let hit = false;
      this.fitBox(seg, r);
      this.bvh.shapecast({
        intersectsBounds: (b) => b.intersectsBox(this.box),
        intersectsTriangle: (tri) => {
          const d = tri.closestPointToSegment(seg, this.triP, this.segP);
          if (d >= r) return;
          if (d > 1e-6) this.dir.subVectors(this.segP, this.triP).divideScalar(d);
          else tri.getNormal(this.dir);
          const depth = r - d;
          seg.start.addScaledVector(this.dir, depth);
          seg.end.addScaledVector(this.dir, depth);
          hit = true;
          onContact?.(this.dir);
        },
      });
      any ||= hit;
      if (!hit) break;
    }
    if (this.blockers.length && resolveBlockers(this.blockers, seg, r, this.nOut, onContact)) any = true;
    return any;
  }

  /** Report surfaces within r of the capsule without moving it. */
  probe(seg: THREE.Line3, r: number, onContact: ContactFn): void {
    this.fitBox(seg, r);
    this.bvh.shapecast({
      intersectsBounds: (b) => b.intersectsBox(this.box),
      intersectsTriangle: (tri) => {
        const d = tri.closestPointToSegment(seg, this.triP, this.segP);
        if (d >= r) return;
        if (d > 1e-6) this.dir.subVectors(this.segP, this.triP).divideScalar(d);
        else tri.getNormal(this.dir);
        onContact(this.dir);
      },
    });
  }

  /** True if the capsule overlaps anything (deeper than `slop`). */
  overlaps(seg: THREE.Line3, r: number, slop = 0.005): boolean {
    let hit = false;
    this.fitBox(seg, r);
    this.bvh.shapecast({
      intersectsBounds: (b) => b.intersectsBox(this.box),
      intersectsTriangle: (tri) => {
        if (tri.closestPointToSegment(seg, this.triP, this.segP) < r - slop) hit = true;
        return hit;
      },
    });
    if (!hit && this.blockers.length) { const c = new THREE.Line3(seg.start.clone(), seg.end.clone()); hit = resolveBlockers(this.blockers, c, r - slop, this.nOut); }
    return hit;
  }

  /** First hit along a ray, or null. */
  raycast(origin: THREE.Vector3, dir: THREE.Vector3, far: number): THREE.Intersection | null {
    return this.bvh.raycastFirst(new THREE.Ray(origin, dir), THREE.DoubleSide, 0, far);
  }

  private fitBox(seg: THREE.Line3, r: number): void {
    this.box.makeEmpty();
    this.box.expandByPoint(seg.start).expandByPoint(seg.end);
    this.box.min.addScalar(-r);
    this.box.max.addScalar(r);
  }
}
