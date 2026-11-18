import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { boxUV } from './uv';

type V3 = [number, number, number];
export interface PlaceOpts { pos?: V3; rot?: V3; scale?: number | V3; color?: THREE.ColorRepresentation; keepUV?: boolean; }

const KEEP = new Set(['position', 'normal', 'uv', 'color']);

/**
 * Collects static level geometry and merges it per material: one draw call per material (TECH §8).
 * Every piece is normalized to indexed position/normal/uv/color; UVs are world box projection at the
 * material's `userData.tile` unless keepUV. Bake AO on the result with `bakeAO()`.
 */
export class StaticBatch {
  private groups = new Map<THREE.Material, THREE.BufferGeometry[]>();
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private c = new THREE.Color();

  add(geo: THREE.BufferGeometry, mat: THREE.Material, o: PlaceOpts = {}): void {
    const s: V3 = o.scale == null ? [1, 1, 1] : typeof o.scale === 'number' ? [o.scale, o.scale, o.scale] : o.scale;
    this.m.compose(new THREE.Vector3(...(o.pos ?? [0, 0, 0])), this.q.setFromEuler(this.e.set(...(o.rot ?? [0, 0, 0]))), new THREE.Vector3(...s));
    this.push(geo, mat, this.m, o.color ?? '#ffffff', !!o.keepUV);
  }

  /** Absorb every mesh under obj (world matrices), e.g. a prop built with a model's build(). */
  addObject(obj: THREE.Object3D): void {
    obj.updateMatrixWorld(true);
    obj.traverse((n) => {
      if (!(n instanceof THREE.Mesh)) return;
      this.push(n.geometry, n.material as THREE.Material, n.matrixWorld, '#ffffff', !!n.userData.keepUV);
    });
  }

  private push(src: THREE.BufferGeometry, mat: THREE.Material, m: THREE.Matrix4, color: THREE.ColorRepresentation, keepUV: boolean): void {
    let g = src.clone();
    for (const name of Object.keys(g.attributes)) if (!KEEP.has(name)) g.deleteAttribute(name);
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    g.applyMatrix4(m);
    const n = g.getAttribute('position').count;
    if (!g.index) g.setIndex(Array.from({ length: n }, (_, i) => i));
    this.c.set(color);
    const old = g.getAttribute('color');
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      col[i * 3] = (old ? old.getX(i) : 1) * this.c.r;
      col[i * 3 + 1] = (old ? old.getY(i) : 1) * this.c.g;
      col[i * 3 + 2] = (old ? old.getZ(i) : 1) * this.c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (!keepUV || !g.getAttribute('uv')) boxUV(g, (mat.userData.tile as number | undefined) ?? 1);
    let list = this.groups.get(mat);
    if (!list) this.groups.set(mat, (list = []));
    list.push(g);
  }

  build(): THREE.Mesh[] {
    const out: THREE.Mesh[] = [];
    for (const [mat, list] of this.groups) {
      const merged = mergeGeometries(list, false);
      if (!merged) throw new Error(`StaticBatch: cannot merge ${mat.name}`);
      merged.computeBoundingSphere();
      merged.computeBoundingBox();
      const mesh = new THREE.Mesh(merged, mat);
      mesh.name = `static:${mat.name}`;
      mesh.matrixAutoUpdate = false;
      out.push(mesh);
      list.forEach((g) => g.dispose());
    }
    this.groups.clear();
    return out;
  }
}
